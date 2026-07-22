import express from "express";
import { projectService } from "../services/projectService";
import { authenticateToken } from "../middleware/auth";
import { requireRole } from "../middleware/auth";
import { AuthRequest } from "../middleware/enhancedAuth";

const router = express.Router();

// Get all projects (with filters)
router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const filters = {
      status: req.query.status as string,
      managerId: req.query.managerId as string,
      locationId: req.query.locationId as string,
      isCrossLocation: req.query.isCrossLocation === "true",
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const projects = await projectService.getProjects(filters);
    res.json(projects);
  } catch (error: any) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// Get single project
router.get("/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const project = await projectService.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error: any) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// Create new project (managers and admins only)
router.post("/", authenticateToken, requireRole(["manager", "admin"]), async (req: AuthRequest, res) => {
  try {
    // Sanitize UUID fields - convert empty strings to null
    const sanitizedBody = {
      ...req.body,
      locationId: req.body.locationId || null,
      projectManagerId: req.body.projectManagerId || null
    };
    
    const project = await projectService.createProject(sanitizedBody);
    res.status(201).json(project);
  } catch (error: any) {
    console.error("Error creating project:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get projects managed by current user
router.get("/managed/by-me", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const projects = await projectService.getProjectsByManager(req.user.id);
    res.json(projects);
  } catch (error: any) {
    console.error("Error fetching managed projects:", error);
    res.status(500).json({ error: "Failed to fetch managed projects" });
  }
});

// Get projects assigned to current user
router.get("/assigned/to-me", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const projects = await projectService.getUserProjects(req.user.id);
    res.json(projects);
  } catch (error: any) {
    console.error("Error fetching assigned projects:", error);
    res.status(500).json({ error: "Failed to fetch assigned projects" });
  }
});

// Assign user to project
router.post("/:id/assignments", authenticateToken, requireRole(["manager", "admin"]), async (req: AuthRequest, res) => {
  try {
    const { userId, role, hourlyRate, allocatedHours, startDate, endDate } = req.body;
    
    const assignment = await projectService.assignUserToProject(
      req.params.id,
      userId,
      role,
      req.user?.id ?? '',
      {
        hourlyRate,
        allocatedHours,
        startDate,
        endDate,
      }
    );
    
    res.status(201).json(assignment);
  } catch (error: any) {
    console.error("Error assigning user to project:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get project assignments
router.get("/:id/assignments", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const assignments = await projectService.getProjectAssignments(req.params.id);
    res.json(assignments);
  } catch (error: any) {
    console.error("Error fetching project assignments:", error);
    res.status(500).json({ error: "Failed to fetch project assignments" });
  }
});

// Remove user assignment
router.delete("/:id/assignments/:assignmentId", authenticateToken, requireRole(["manager", "admin"]), async (req: AuthRequest, res) => {
  try {
    await projectService.removeUserAssignment(req.params.id, req.params.assignmentId);
    res.status(204).send();
  } catch (error: any) {
    console.error("Error removing user assignment:", error);
    res.status(400).json({ error: error.message });
  }
});

// Add project manager
router.post("/:id/managers", authenticateToken, requireRole(["admin"]), async (req: AuthRequest, res) => {
  try {
    const { managerId, locationId, permissions } = req.body;
    
    const projectManager = await projectService.addProjectManager(
      req.params.id,
      managerId,
      locationId,
      permissions
    );
    
    res.status(201).json(projectManager);
  } catch (error: any) {
    console.error("Error adding project manager:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update project (managers and admins only)
router.put("/:id", authenticateToken, requireRole(["manager", "admin"]), async (req: AuthRequest, res) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error: any) {
    console.error("Error updating project:", error);
    res.status(400).json({ error: error.message });
  }
});

export default router;