import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { canAccessRoute } from '../../utils/roleHelpers';
import { hasModuleAccess } from '../../utils/permissions';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredModule?: string;
  fallbackPath?: string;
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ 
  children,
  allowedRoles, 
  requiredModule,
  fallbackPath = '/dashboard'
}) => {
  const { user } = useAuthStore();

  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Check module-based access
  if (requiredModule && !hasModuleAccess(user.role, requiredModule)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default RoleBasedRoute;