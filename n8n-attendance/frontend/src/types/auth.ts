export type UserRole = 'employee' | 'manager' | 'admin';
export type Permission = 'read' | 'write' | 'approve' | 'admin';

export interface ModuleAccess {
  module: string;
  permissions: Permission[];
  restrictions?: AccessRestriction[];
}

export interface AccessRestriction {
  type: 'team' | 'department' | 'location';
  value: string;
}

export interface UserPermissions {
  role: UserRole;
  modules: ModuleAccess[];
  customPermissions?: string[];
}

export interface RoleDefinition {
  id: string;
  name: UserRole;
  permissions: Permission[];
  accessibleModules: ModuleAccess[];
  dashboardLayout: string;
}