import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { getNavigationForRole, NavigationItem } from '../../utils/roleHelpers';

const RoleBasedNavigation: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) return null;

  const navigationItems = getNavigationForRole(user.role);

  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = location.pathname === item.path;
    
    return (
      <div key={item.path}>
        <Link
          to={item.path}
          className={`text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${
            isActive ? 'bg-gray-100 text-gray-900' : ''
          }`}
        >
          {item.label}
        </Link>
        {item.children && (
          <div className="ml-4">
            {item.children.map(child => renderNavigationItem(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center space-x-4">
      {navigationItems.map(item => renderNavigationItem(item))}
    </div>
  );
};

export default RoleBasedNavigation;