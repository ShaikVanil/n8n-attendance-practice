export type UserRole = 'employee' | 'manager' | 'admin';
export type Permission = 'read' | 'write' | 'approve' | 'admin';

export interface ModuleAccess {
  module: string;
  permissions: Permission[];
  roles: UserRole[];
}

// Define module access configuration
export const MODULE_ACCESS: Record<string, ModuleAccess> = {
  dashboard: {
    module: 'dashboard',
    permissions: ['read'],
    roles: ['employee', 'manager', 'admin']
  },
  attendance: {
    module: 'attendance',
    permissions: ['read'],
    roles: ['employee', 'manager', 'admin']
  },
  clockin: {
    module: 'clockin',
    permissions: ['read', 'write'],
    roles: ['employee']
  },
  leave: {
    module: 'leave',
    permissions: ['read', 'write'],
    roles: ['employee', 'manager', 'admin']
  },
  timesheets: {
    module: 'timesheets',
    permissions: ['read', 'write'],
    roles: ['employee', 'manager', 'admin']
  },
  users: {
    module: 'users',
    permissions: ['read', 'write', 'admin'],
    roles: ['manager', 'admin']
  },
  reports: {
    module: 'reports',
    permissions: ['read'],
    roles: ['manager', 'admin']
  },
  leaveManagement: {
    module: 'leaveManagement',
    permissions: ['read', 'approve'],
    roles: ['manager', 'admin']
  }
};

// Check if user has access to a module
export const hasModuleAccess = (userRole: UserRole, module: string): boolean => {
  const moduleConfig = MODULE_ACCESS[module];
  if (!moduleConfig) return false;
  return moduleConfig.roles.includes(userRole);
};

// Check if user has specific permission for a module
export const hasPermission = (
  userRole: UserRole,
  module: string,
  permission: Permission
): boolean => {
  const moduleConfig = MODULE_ACCESS[module];
  if (!moduleConfig) return false;
  return (
    moduleConfig.roles.includes(userRole) &&
    moduleConfig.permissions.includes(permission)
  );
};

// Get accessible modules for a user role
export const getAccessibleModules = (userRole: UserRole): string[] => {
  return Object.keys(MODULE_ACCESS).filter(module => 
    hasModuleAccess(userRole, module)
  );
};