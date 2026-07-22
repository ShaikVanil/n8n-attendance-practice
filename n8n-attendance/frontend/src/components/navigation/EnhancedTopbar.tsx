import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface DropdownItem {
  path: string;
  label: string;
  icon?: string;
}

interface DropdownSection {
  title: string;
  items: DropdownItem[];
}

const EnhancedTopbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  // Get role-specific home dashboard
  const getHomeDashboard = () => {
    switch (user.role) {
      case 'admin': return '/admindashboard';
      case 'manager': return '/managerdashboard';
      case 'employee': return '/employeedashboard';
      default: return '/employeedashboard';
    }
  };

  // Define dropdown sections based on user role
  const getDropdownSections = (): DropdownSection[] => {
    const sections: DropdownSection[] = [];

    // Attendance section
    sections.push({
      title: 'Attendance',
      items: [
        { path: '/attendance/history', label: 'My Attendance' },
        ...(user.role !== 'employee' ? [{ path: '/attendance/team', label: 'Team Attendance' }] : [])
      ]
    });

    // Timesheets section
    sections.push({
      title: 'Timesheets',
      items: [
        { path: '/daily-timesheets', label: 'Daily Timesheets' },
        ...(user.role !== 'employee' ? [
          { path: '/timesheets/review', label: 'Review Timesheets' },
          { path: '/timesheets/approval', label: 'Timesheet Approval' }
        ] : [])
      ]
    });

    // Leave section
    sections.push({
      title: 'Leave Management',
      items: [
        { path: '/leave', label: 'Apply Leave' },
        { path: '/leave/history', label: 'Leave History' },
        ...(user.role !== 'employee' ? [
          { path: '/leave-management', label: 'Manage Leave' },
          { path: '/manager/leave-approval', label: 'Leave Approval' }
        ] : [])
      ]
    });

    // Projects section
    sections.push({
      title: 'Projects',
      items: [
        { path: '/projects/my-assignments', label: 'My Projects' },
        ...(user.role !== 'employee' ? [
          { path: '/projects/manage', label: 'Manage Projects' },
          { path: '/projects/team-view', label: 'Team View' }
        ] : [])
      ]
    });

    // Admin section
    if (user.role === 'admin') {
      sections.push({
        title: 'Administration',
        items: [
          { path: '/admin/users', label: 'User Management' },
          { path: '/admin/system', label: 'System Config' },
          { path: '/admin/compliance', label: 'Compliance' },
          { path: '/admin/reports', label: 'System Reports' },
          { path: '/admin/audit-logs', label: 'Audit Logs' }
        ]
      });
    }

    // Manager section
    if (user.role === 'manager' || user.role === 'admin') {
      sections.push({
        title: 'Management',
        items: [
          { path: '/users', label: 'Team Management' },
          { path: '/reports', label: 'Reports' },
          { path: '/manager/grace-period-approval', label: 'Grace Period Approval' }
        ]
      });
    }

    return sections;
  };

  const toggleDropdown = (dropdown: string) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setActiveDropdown(null);
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            {/* Logo/Home */}
            <Link 
              to={getHomeDashboard()}
              className="text-xl font-semibold text-gray-900 hover:text-blue-600"
            >
              Attendance System
            </Link>

            {/* Navigation Dropdowns */}
            <div className="hidden md:flex items-center space-x-6" ref={dropdownRef}>
              {getDropdownSections().map((section) => (
                <div key={section.title} className="relative">
                  <button
                    onClick={() => toggleDropdown(section.title)}
                    className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    <span>{section.title}</span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>

                  {activeDropdown === section.title && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        {section.items.map((item) => (
                          <button
                            key={item.path}
                            onClick={() => handleNavigation(item.path)}
                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                              location.pathname === item.path ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* User Info and Logout */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                Welcome, {user?.firstName || user?.lastName || user?.email}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
              </span>
              <button
                onClick={logout}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default EnhancedTopbar;