import pool from "../config/database";

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  clientName?: string;
  projectManagerId: string;
  projectManagerIds: string[]; // Add this field
  startDate?: string;
  endDate?: string;
  estimatedHours?: number;
  budget?: number;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  locationId?: string;
  isCrossLocation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  hourlyRate?: number;
  allocatedHours?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  assignedBy: string;
  createdAt: string;
}

export interface ProjectManager {
  id: string;
  projectId: string;
  managerId: string;
  locationId?: string;
  isPrimary: boolean;
  permissions: {
    approveTimesheets: boolean;
    manageAssignments: boolean;
    viewReports: boolean;
  };
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
  code: string;
  description?: string;
  clientName?: string;
  projectManagerId?: string;
  projectManagerIds?: string[];
  startDate?: string;
  endDate?: string;
  estimatedHours?: number;
  budget?: number;
  priority?: "low" | "medium" | "high" | "critical";
  locationId?: string;
  isCrossLocation?: boolean;
}

export interface ProjectFilters {
  status?: string;
  managerId?: string;
  locationId?: string;
  isCrossLocation?: boolean;
  limit?: number;
  offset?: number;
}

class ProjectService {
  async createProject(data: CreateProjectRequest): Promise<Project> {
    const client = await pool.connect();
  
    try {
      await client.query("BEGIN");
  
      // Check if project code already exists
      const existingProject = await client.query(
        "SELECT id FROM projects WHERE code = $1",
        [data.code]
      );
  
      if (existingProject.rows.length > 0) {
        throw new Error("Project code already exists");
      }
  
      // Verify all project managers exist and have manager/admin roles
      const managerIds = data.projectManagerIds || [data.projectManagerId];
      const managerResult = await client.query(
        "SELECT id, role FROM users WHERE id = ANY($1) AND role IN ('manager', 'admin')",
        [managerIds]
      );
  
      if (managerResult.rows.length !== managerIds.length) {
        throw new Error("One or more project managers not found or insufficient permissions");
      }
  
      // Create project with primary manager
      const projectResult = await client.query(
        `INSERT INTO projects (
          name, code, description, client_name, project_manager_id,
          start_date, end_date, estimated_hours, budget, priority,
          location_id, is_cross_location
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          data.name,
          data.code,
          data.description,
          data.clientName,
          data.projectManagerId,
          data.startDate,
          data.endDate,
          data.estimatedHours,
          data.budget,
          data.priority || "medium",
          data.locationId || null, // Ensure null instead of empty string
          data.isCrossLocation || false
        ]
      );
  
      const project = projectResult.rows[0];
  
      // Add all managers to project_managers table
      for (let i = 0; i < managerIds.length; i++) {
        const managerId = managerIds[i];
        const isPrimary = managerId === data.projectManagerId;
        
        await client.query(
          `INSERT INTO project_managers (project_id, manager_id, is_primary, permissions)
           VALUES ($1, $2, $3, $4)`,
          [
            project.id,
            managerId,
            isPrimary,
            JSON.stringify({
              approve_timesheets: true,
              manage_assignments: true,
              view_reports: true
            })
          ]
        );
      }
  
      await client.query("COMMIT");
      return this.mapRowToProject(project);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getProjects(filters: ProjectFilters): Promise<Project[]> {
    let query = "SELECT * FROM projects WHERE 1=1";
    const params: any[] = [];
    let paramCount = 0;

    if (filters.status) {
      query += ` AND status = $${++paramCount}`;
      params.push(filters.status);
    }

    if (filters.managerId) {
      query += ` AND project_manager_id = $${++paramCount}`;
      params.push(filters.managerId);
    }

    if (filters.locationId) {
      query += ` AND (location_id = $${++paramCount} OR is_cross_location = true)`;
      params.push(filters.locationId);
    }

    if (filters.isCrossLocation !== undefined) {
      query += ` AND is_cross_location = $${++paramCount}`;
      params.push(filters.isCrossLocation);
    }

    query += " ORDER BY created_at DESC";

    if (filters.limit) {
      query += ` LIMIT $${++paramCount}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ` OFFSET $${++paramCount}`;
      params.push(filters.offset);
    }

    const result = await pool.query(query, params);
    const projects = [];
    for (const row of result.rows) {
      projects.push(await this.mapRowToProject(row));
    }
    return projects;
  }

  async getProject(id: string): Promise<Project | null> {
    const result = await pool.query(
      "SELECT * FROM projects WHERE id = $1",
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return await this.mapRowToProject(result.rows[0]);
  }

  async getProjectsByManager(managerId: string): Promise<Project[]> {
    const result = await pool.query(
      `SELECT DISTINCT p.* FROM projects p
       LEFT JOIN project_managers pm ON p.id = pm.project_id
       WHERE p.project_manager_id = $1 OR pm.manager_id = $1
       ORDER BY p.created_at DESC`,
      [managerId]
    );

    const projects = [];
    for (const row of result.rows) {
      projects.push(await this.mapRowToProject(row));
    }
    return projects;
  }

  async assignUserToProject(
    projectId: string,
    userId: string,
    role: string,
    assignedBy: string,
    options: {
      hourlyRate?: number;
      allocatedHours?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<ProjectAssignment> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Verify project exists
      const projectResult = await client.query(
        "SELECT id FROM projects WHERE id = $1",
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        throw new Error("Project not found");
      }

      // Verify user exists
      const userResult = await client.query(
        "SELECT id FROM users WHERE id = $1",
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error("User not found");
      }

      // Check if assignment already exists
      const existingAssignment = await client.query(
        "SELECT id FROM project_assignments WHERE project_id = $1 AND user_id = $2 AND role = $3",
        [projectId, userId, role]
      );

      if (existingAssignment.rows.length > 0) {
        throw new Error("User already assigned to this project with this role");
      }

      // Create assignment
      const assignmentResult = await client.query(
        `INSERT INTO project_assignments (
          project_id, user_id, role, hourly_rate, allocated_hours,
          start_date, end_date, assigned_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          projectId,
          userId,
          role,
          options.hourlyRate,
          options.allocatedHours,
          options.startDate,
          options.endDate,
          assignedBy,
        ]
      );

      await client.query("COMMIT");
      return this.mapRowToAssignment(assignmentResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async addProjectManager(
    projectId: string,
    managerId: string,
    locationId?: string,
    permissions: Partial<ProjectManager['permissions']> = {}
  ): Promise<ProjectManager> {
    const defaultPermissions = {
      approveTimesheets: true,
      manageAssignments: true,
      viewReports: true,
      ...permissions,
    };

    const result = await pool.query(
      `INSERT INTO project_managers (project_id, manager_id, location_id, permissions)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [projectId, managerId, locationId, JSON.stringify(defaultPermissions)]
    );

    return this.mapRowToProjectManager(result.rows[0]);
  }

  async getProjectAssignments(projectId: string): Promise<ProjectAssignment[]> {
    const result = await pool.query(
      "SELECT * FROM project_assignments WHERE project_id = $1 AND is_active = true",
      [projectId]
    );

    return result.rows.map(this.mapRowToAssignment);
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    const result = await pool.query(
      `SELECT DISTINCT p.* FROM projects p
       INNER JOIN project_assignments pa ON p.id = pa.project_id
       WHERE pa.user_id = $1 AND pa.is_active = true AND p.status = 'active'
       ORDER BY p.created_at DESC`,
      [userId]
    );

    const projects = [];
    for (const row of result.rows) {
      projects.push(await this.mapRowToProject(row));
    }
    return projects;
  }

  private async mapRowToProject(row: any): Promise<Project> {
    // Fetch all manager IDs for this project
    const managersResult = await pool.query(
      "SELECT manager_id FROM project_managers WHERE project_id = $1",
      [row.id]
    );
    
    const projectManagerIds = managersResult.rows.map(r => r.manager_id);
    
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      description: row.description,
      clientName: row.client_name,
      projectManagerId: row.project_manager_id,
      projectManagerIds: projectManagerIds, // Add the array of manager IDs
      startDate: row.start_date,
      endDate: row.end_date,
      estimatedHours: parseFloat(row.estimated_hours) || 0,
      budget: parseFloat(row.budget) || 0,
      status: row.status,
      priority: row.priority,
      locationId: row.location_id,
      isCrossLocation: row.is_cross_location,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToAssignment(row: any): ProjectAssignment {
    return {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      role: row.role,
      hourlyRate: parseFloat(row.hourly_rate) || 0,
      allocatedHours: parseFloat(row.allocated_hours) || 0,
      startDate: row.start_date,
      endDate: row.end_date,
      isActive: row.is_active,
      assignedBy: row.assigned_by,
      createdAt: row.created_at,
    };
  }

  private mapRowToProjectManager(row: any): ProjectManager {
    return {
      id: row.id,
      projectId: row.project_id,
      managerId: row.manager_id,
      locationId: row.location_id,
      isPrimary: row.is_primary,
      permissions: row.permissions,
      createdAt: row.created_at,
    };
  }

  async updateProject(id: string, data: Partial<CreateProjectRequest>): Promise<Project | null> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Check if project exists
      const existingProject = await client.query(
        "SELECT * FROM projects WHERE id = $1",
        [id]
      );

      if (existingProject.rows.length === 0) {
        return null;
      }

      // Check if code is being updated and if it conflicts with another project
      if (data.code) {
        const codeCheck = await client.query(
          "SELECT id FROM projects WHERE code = $1 AND id != $2",
          [data.code, id]
        );

        if (codeCheck.rows.length > 0) {
          throw new Error("Project code already exists");
        }
      }

      // If project managers are being updated, verify they exist and have proper roles
      if (data.projectManagerIds || data.projectManagerId) {
        const managerIds = data.projectManagerIds || [data.projectManagerId];
        const managerResult = await client.query(
          "SELECT id, role FROM users WHERE id = ANY($1) AND role IN ('manager', 'admin')",
          [managerIds]
        );

        if (managerResult.rows.length !== managerIds.length) {
          throw new Error("One or more project managers not found or insufficient permissions");
        }
      }

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramCount = 0;

      if (data.name !== undefined) {
        updateFields.push(`name = $${++paramCount}`);
        updateValues.push(data.name);
      }
      if (data.code !== undefined) {
        updateFields.push(`code = $${++paramCount}`);
        updateValues.push(data.code);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${++paramCount}`);
        updateValues.push(data.description);
      }
      if (data.clientName !== undefined) {
        updateFields.push(`client_name = $${++paramCount}`);
        updateValues.push(data.clientName);
      }
      if (data.projectManagerId !== undefined) {
        updateFields.push(`project_manager_id = $${++paramCount}`);
        updateValues.push(data.projectManagerId);
      }
      if (data.startDate !== undefined) {
        updateFields.push(`start_date = $${++paramCount}`);
        updateValues.push(data.startDate);
      }
      if (data.endDate !== undefined) {
        updateFields.push(`end_date = $${++paramCount}`);
        updateValues.push(data.endDate);
      }
      if (data.estimatedHours !== undefined) {
        updateFields.push(`estimated_hours = $${++paramCount}`);
        updateValues.push(data.estimatedHours);
      }
      if (data.budget !== undefined) {
        updateFields.push(`budget = $${++paramCount}`);
        updateValues.push(data.budget);
      }
      if (data.priority !== undefined) {
        updateFields.push(`priority = $${++paramCount}`);
        updateValues.push(data.priority);
      }
      if (data.locationId !== undefined) {
        updateFields.push(`location_id = $${++paramCount}`);
        updateValues.push(data.locationId);
      }
      if (data.isCrossLocation !== undefined) {
        updateFields.push(`is_cross_location = $${++paramCount}`);
        updateValues.push(data.isCrossLocation);
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id); // Add project ID as the last parameter

      const updateQuery = `
        UPDATE projects 
        SET ${updateFields.join(', ')}
        WHERE id = $${++paramCount}
        RETURNING *
      `;

      const projectResult = await client.query(updateQuery, updateValues);
      const updatedProject = projectResult.rows[0];

      // Update project managers if provided
      if (data.projectManagerIds) {
        // Remove existing managers
        await client.query(
          "DELETE FROM project_managers WHERE project_id = $1",
          [id]
        );

        // Add new managers
        for (let i = 0; i < data.projectManagerIds.length; i++) {
          const managerId = data.projectManagerIds[i];
          const isPrimary = managerId === data.projectManagerId;
          
          await client.query(
            `INSERT INTO project_managers (project_id, manager_id, is_primary, permissions)
             VALUES ($1, $2, $3, $4)`,
            [
              id,
              managerId,
              isPrimary,
              JSON.stringify({
                approve_timesheets: true,
                manage_assignments: true,
                view_reports: true
              })
            ]
          );
        }
      }

      await client.query("COMMIT");
      return this.mapRowToProject(updatedProject);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async removeUserAssignment(projectId: string, assignmentId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query("BEGIN");
      
      // Verify assignment exists and belongs to the project
      const assignmentResult = await client.query(
        "SELECT id FROM project_assignments WHERE id = $1 AND project_id = $2",
        [assignmentId, projectId]
      );
      
      if (assignmentResult.rows.length === 0) {
        throw new Error("Assignment not found");
      }
      
      // Remove the assignment (or mark as inactive)
      await client.query(
        "UPDATE project_assignments SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [assignmentId]
      );
      
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export const projectService = new ProjectService();