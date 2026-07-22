import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { hasModuleAccess, hasPermission, Permission } from '../../utils/permissions';

interface PermissionGateProps {
  children: React.ReactNode;
  module: string;
  permission?: Permission;
  fallback?: React.ReactNode;
  roles?: string[];
}

const PermissionGate: React.FC<PermissionGateProps> = ({ 
  children, 
  module, 
  permission,
  fallback = null,
  roles
}) => {
  const { user } = useAuthStore();

  if (!user) {
    return <>{fallback}</>;
  }

  // Check role-based access first
  if (roles && !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  // Check module access
  if (!hasModuleAccess(user.role, module)) {
    return <>{fallback}</>;
  }

  // Check specific permission if provided
  if (permission && !hasPermission(user.role, module, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;