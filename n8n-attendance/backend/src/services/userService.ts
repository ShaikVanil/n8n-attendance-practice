import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  CreateUserRequest,
  UpdateUserRequest,
  BulkUpdateRequest,
} from "../types/user";
import { activityService } from "./activityService";
import pool from "../config/database";

class UserService {
  // Remove the in-memory array
  // private users: User[] = [];

  async getAllUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: string,
    isActive?: boolean
  ) {
    try {
      let query = `
        SELECT 
          u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, 
          COALESCE(ol.name, 'No Office') as office_location,
          u.current_location_id, u.manager_id,
          CASE 
            WHEN m.id IS NOT NULL THEN CONCAT(m.first_name, ' ', m.last_name)
            ELSE NULL
          END as manager_name,
          u.created_at, u.updated_at
        FROM users u
        LEFT JOIN office_locations ol ON u.current_location_id = ol.id
        LEFT JOIN users m ON u.manager_id = m.id
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (search) {
        query += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (role) {
        query += ` AND u.role = $${paramIndex}`;
        params.push(role);
        paramIndex++;
      }

      if (isActive !== undefined) {
        query += ` AND u.is_active = $${paramIndex}`;
        params.push(isActive);
        paramIndex++;
      }

      // Get total count - FIXED: Removed reference to u.office_location
      const countQuery = query.replace(
        "SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, COALESCE(ol.name, 'No Office') as office_location, u.current_location_id, u.created_at, u.updated_at FROM users u LEFT JOIN office_locations ol ON u.current_location_id = ol.id",
        "SELECT COUNT(*) FROM users u LEFT JOIN office_locations ol ON u.current_location_id = ol.id"
      );
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Add pagination
      query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${
        paramIndex + 1
      }`;
      params.push(limit, (page - 1) * limit);

      const result = await pool.query(query, params);
      const users = result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        role: row.role,
        isActive: row.is_active,
        officeLocation: row.office_location,
        currentLocationId: row.current_location_id,
        managerId: row.manager_id,
        managerName: row.manager_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error("Error fetching users:", error);
      throw new Error("Failed to fetch users");
    }
  }

  async getUserById(userId: string): Promise<Omit<User, "password"> | null> {
    try {
      const result = await pool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, 
                COALESCE(ol.name, 'No Office') as office_location,
                u.current_location_id, u.manager_id,
                CASE 
                  WHEN m.id IS NOT NULL THEN CONCAT(m.first_name, ' ', m.last_name)
                  ELSE NULL
                END as manager_name,
                u.created_at, u.updated_at 
         FROM users u
         LEFT JOIN office_locations ol ON u.current_location_id = ol.id
         LEFT JOIN users m ON u.manager_id = m.id
         WHERE u.id = $1`,
        [userId]
      );
  
      if (result.rows.length === 0) {
        return null;
      }
  
      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        role: row.role,
        isActive: row.is_active,
        currentLocationId: row.current_location_id,
        managerId: row.manager_id,
        managerName: row.manager_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      throw new Error("Failed to fetch user");
    }
  }

  async createUser(
    userData: CreateUserRequest,
    performedBy: string
  ): Promise<Omit<User, "password">> {
    try {
      // Check if user already exists
      const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [userData.email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error("User with this email already exists");
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Find or create office location
      let officeLocationId: string;
      const existingLocation = await pool.query(
        "SELECT id FROM office_locations WHERE name = $1",
        [userData.officeLocation]
      );

      if (existingLocation.rows.length > 0) {
        officeLocationId = existingLocation.rows[0].id;
      } else {
        const newLocation = await pool.query(
          `INSERT INTO office_locations (name, address, timezone, created_at, updated_at)
           VALUES ($1, $2, 'UTC', NOW(), NOW()) RETURNING id`,
          [userData.officeLocation, userData.officeLocation + " Address"]
        );
        officeLocationId = newLocation.rows[0].id;
      }

      const result = await pool.query(
        `INSERT INTO users (email, first_name, last_name, password_hash, role, is_active, current_location_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, first_name, last_name, role, is_active, current_location_id, created_at, updated_at`,
        [
          userData.email,
          userData.firstName,
          userData.lastName,
          hashedPassword,
          userData.role,
          true,
          officeLocationId,
        ]
      );

      const newUser = result.rows[0];

      // Get office location name for response
      const officeResult = await pool.query(
        "SELECT name FROM office_locations WHERE id = $1",
        [newUser.current_location_id]
      );

      // Log activity
      await activityService.logActivity(
        newUser.id,
        "USER_CREATED",
        `User account created with role: ${newUser.role}`,
        performedBy
      );

      return {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role,
        isActive: newUser.is_active,
        currentLocationId: newUser.current_location_id,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at,
      };
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);

      if (result.rows.length === 0) {
        throw new Error("Invalid credentials");
      }

      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!isValidPassword) {
        throw new Error("Invalid credentials");
      }

      // Log the login activity
      await activityService.logActivity(
        user.id,
        "USER_LOGIN",
        `User logged in from IP: ${process.env.CLIENT_IP || "unknown"}`,
        user.id
      );

      const token = this.generateToken({
        id: user.id,
        email: user.email,
        firstName: user.first_name, // Map database field to interface property
        lastName: user.last_name, // Map database field to interface property
        role: user.role,
        isActive: user.is_active, // Map database field to interface property
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLoginAt: user.last_login_at,
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name, // Map database field to interface property
          lastName: user.last_name, // Map database field to interface property
          role: user.role,
          isActive: user.is_active, // Map database field to interface property
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLoginAt: user.last_login_at,
        },
      };
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  generateToken(user: Omit<User, "password">): string {
    const payload = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName, // Add this line
      lastName: user.lastName, // Add this line
      role: user.role,
    };

    return jwt.sign(payload, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "24h",
    });
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUserResult = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [userData.email]
      );

      if (existingUserResult.rows.length > 0) {
        throw new Error("User already exists with this email");
      }

      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Insert new user
      const result = await pool.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, NOW(), NOW())
         RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at, office_location`,
        [
          userData.email,
          hashedPassword,
          userData.firstName,
          userData.lastName,
          userData.role || "employee",
        ]
      );

      const newUser = result.rows[0];

      // Log the registration activity
      await activityService.logActivity(
        newUser.id,
        "USER_REGISTRATION",
        `User registered with email: ${userData.email}`,
        newUser.id
      );

      // Generate token
      const token = this.generateToken({
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role,
        isActive: newUser.is_active,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at,
        lastLoginAt: newUser.last_login_at,
      });

      return {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
          isActive: newUser.is_active,
          createdAt: newUser.created_at,
          updatedAt: newUser.updated_at,
          lastLoginAt: newUser.last_login_at,
        },
      };
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  async updateUser(
    userId: string,
    updateData: UpdateUserRequest,
    performedBy: string
  ): Promise<Omit<User, "password">> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updateData.email !== undefined) {
        updateFields.push(`email = $${paramIndex}`);
        values.push(updateData.email);
        paramIndex++;
      }

      if (updateData.firstName !== undefined) {
        updateFields.push(`first_name = $${paramIndex}`);
        values.push(updateData.firstName);
        paramIndex++;
      }

      if (updateData.lastName !== undefined) {
        updateFields.push(`last_name = $${paramIndex}`);
        values.push(updateData.lastName);
        paramIndex++;
      }

      if (updateData.role !== undefined) {
        updateFields.push(`role = $${paramIndex}`);
        values.push(updateData.role);
        paramIndex++;
      }

      if (updateData.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        values.push(updateData.isActive);
        paramIndex++;
      }

      // FIXED: Handle office location updates properly
      // Handle current location updates
      if (updateData.currentLocationId !== undefined) {
        // Validate that the office location exists
        const existingLocation = await pool.query(
          "SELECT id FROM office_locations WHERE id = $1 AND is_active = true",
          [updateData.currentLocationId]
        );

        if (existingLocation.rows.length === 0) {
          throw new Error("Invalid office location selected");
        }

        updateFields.push(`current_location_id = $${paramIndex}`);
        values.push(updateData.currentLocationId);
        paramIndex++;
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(userId);

      const query = `
        UPDATE users 
        SET ${updateFields.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING id, email, first_name, last_name, role, is_active, current_location_id, created_at, updated_at, last_login_at
      `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      const updatedUser = result.rows[0];

      // Get office location name for response
      const officeResult = await pool.query(
        "SELECT name FROM office_locations WHERE id = $1",
        [updatedUser.current_location_id]
      );

      // Log the update activity
      await activityService.logActivity(
        userId,
        "USER_UPDATE",
        `User updated: ${Object.keys(updateData).join(", ")}`,
        performedBy
      );

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        isActive: updatedUser.is_active,
        currentLocationId: updatedUser.current_location_id,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
        lastLoginAt: updatedUser.last_login_at,
      };
    } catch (error) {
      console.error("Update user error:", error);
      throw error;
    }
  }

  async deleteUser(userId: string, performedBy: string): Promise<void> {
    try {
      const result = await pool.query(
        "DELETE FROM users WHERE id = $1 RETURNING email",
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      // Log the deletion activity
      await activityService.logActivity(
        userId,
        "USER_DELETE",
        `User deleted: ${result.rows[0].email}`,
        performedBy
      );
    } catch (error) {
      console.error("Delete user error:", error);
      throw error;
    }
  }

  async resetPassword(
    userId: string,
    newPassword: string,
    performedBy: string
  ): Promise<void> {
    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      const result = await pool.query(
        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING email",
        [hashedPassword, userId]
      );

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      // Log the password reset activity
      await activityService.logActivity(
        userId,
        "PASSWORD_RESET",
        "Password reset by admin",
        performedBy
      );
    } catch (error) {
      console.error("Reset password error:", error);
      throw error;
    }
  }

  async bulkUpdateUsers(
    updateData: BulkUpdateRequest,
    performedBy: string
  ): Promise<void> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updateData.role !== undefined) {
        updateFields.push(`role = $${paramIndex}`);
        values.push(updateData.role);
        paramIndex++;
      }

      if (updateData.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        values.push(updateData.isActive);
        paramIndex++;
      }

      updateFields.push(`updated_at = NOW()`);

      if (updateFields.length === 1) {
        // Only updated_at
        throw new Error("No fields to update");
      }

      // Create placeholders for user IDs
      const userIdPlaceholders = updateData.userIds
        .map((_, index) => `$${paramIndex + index}`)
        .join(", ");
      values.push(...updateData.userIds);

      const query = `
        UPDATE users 
        SET ${updateFields.join(", ")}
        WHERE id IN (${userIdPlaceholders})
      `;

      await pool.query(query, values);

      // Log the bulk update activity for each user
      for (const userId of updateData.userIds) {
        await activityService.logActivity(
          userId,
          "BULK_UPDATE",
          `Bulk update: ${Object.keys(updateData)
            .filter((key) => key !== "userIds")
            .join(", ")}`,
          performedBy
        );
      }
    } catch (error) {
      console.error("Bulk update users error:", error);
      throw error;
    }
  }

  // Add to UserService class

  async assignManager(userId: string, managerId: string | null): Promise<void> {
    const query = `
    UPDATE users 
    SET manager_id = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND is_active = true
  `;

    await pool.query(query, [managerId, userId]);
  }

  async getDirectReports(managerId: string): Promise<User[]> {
    const query = `
    SELECT u.*, ol.name as office_location_name
    FROM users u
    LEFT JOIN office_locations ol ON u.office_location = ol.id
    WHERE u.manager_id = $1 AND u.is_active = true
    ORDER BY u.last_name, u.first_name
  `;

    const result = await pool.query(query, [managerId]);
    return result.rows;
  }

  async getManagerHierarchy(userId: string): Promise<User[]> {
    const query = `
    WITH RECURSIVE manager_hierarchy AS (
      -- Base case: start with the user
      SELECT id, first_name, last_name, email, role, manager_id, 0 as level
      FROM users WHERE id = $1
      
      UNION ALL
      
      -- Recursive case: get managers up the hierarchy
      SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.manager_id, mh.level + 1
      FROM users u
      INNER JOIN manager_hierarchy mh ON u.id = mh.manager_id
      WHERE mh.level < 10 -- Prevent infinite recursion
    )
    SELECT * FROM manager_hierarchy WHERE level > 0 ORDER BY level;
  `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }
}
export const userService = new UserService();