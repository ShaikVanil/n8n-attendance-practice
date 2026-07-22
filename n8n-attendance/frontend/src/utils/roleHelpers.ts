import { UserRole } from './permissions';

export interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  roles: UserRole[];
  permissions?: string[];
  children?: NavigationItem[];
}

// Role-based navigation configuration
export const NAVIGATION_CONFIG: NavigationItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: 'home',
    roles: ['employee']
  },
  // Remove the attendance section with /clockin since it's now in dashboards
  {
    path: '/attendance/history',
    label: 'My Attendance',
    icon: 'history',
    roles: ['employee']
  },
  {
    path: '/attendance/team',
    label: 'Team Attendance',
    icon: 'users',
    roles: ['manager', 'admin']
  },
  {
    path: '/leave',
    label: 'Apply Leave',
    icon: 'calendar-plus',
    roles: ['employee'],
    children: [
      {
        path: '/leave',
        label: 'Apply Leave',
        icon: 'plus',
        roles: ['employee']
      },
      {
        path: '/leave/history',
        label: 'Leave History',
        icon: 'history',
        roles: ['employee']
      }
    ]
  },
  {
    path: '/daily-timesheets',
    label: 'Daily Timesheets',
    icon: 'file-text',
    roles: ['employee']
  },
  {
    path: '/timesheets/review',
    label: 'Review Timesheets',
    icon: 'check-circle',
    roles: ['manager', 'admin']
  },
  {
    path: '/timesheets',
    label: 'Timesheets',
    icon: 'file-text',
    roles: ['employee', 'manager', 'admin'],
    children: [
      {
        path: '/timesheets/my',
        label: 'My Timesheets',
        icon: 'file-text',
        roles: ['employee']
      },
      {
        path: '/timesheets/approval',
        label: 'Timesheet Approval',
        icon: 'check-circle',
        roles: ['manager', 'admin']
      }
    ]
  },
  {
    path: '/managerdashboard',
    label: 'Manager Dashboard',
    icon: 'dashboard',
    roles: ['manager']
  },
  {
    path: '/leave-management',
    label: 'Leave Management',
    icon: 'check-circle',
    roles: ['manager', 'admin']
  },
  {
    path: '/users',
    label: 'Team Management',
    icon: 'users',
    roles: ['manager', 'admin']
  },
  {
    path: '/reports',
    label: 'Reports',
    icon: 'bar-chart',
    roles: ['manager', 'admin']
  },
  // Add project management navigation
  {
    path: '/projects',
    label: 'Projects',
    icon: 'briefcase',
    roles: ['employee', 'manager', 'admin'],
    children: [
      {
        path: '/projects/my-assignments',
        label: 'My Projects',
        icon: 'user-check',
        roles: ['employee']
      },
      {
        path: '/admin/project-management',
        label: 'Create Project',
        icon: 'plus-circle',
        roles: ['manager', 'admin']  // Add 'manager' here
      },
      {
        path: '/projects/manage',
        label: 'Manage Projects',
        icon: 'settings',
        roles: ['manager', 'admin']
      },
      {
        path: '/projects/team-view',
        label: 'Team View',
        icon: 'users',
        roles: ['manager', 'admin']
      }
    ]
  },
  // Admin-specific navigation items
  {
    path: '/admindashboard',
    label: 'Admin Dashboard',
    icon: 'shield',
    roles: ['admin']
  },
  {
    path: '/admin/users',
    label: 'User Management',
    icon: 'users-cog',
    roles: ['admin']
  },
  {
    path: '/admin/system',
    label: 'System Configuration',
    icon: 'settings',
    roles: ['admin']
  },
  {
    path: '/admin/compliance',
    label: 'Compliance & Audit',
    icon: 'shield-check',
    roles: ['admin']
  },
  {
    path: '/admin/reports',
    label: 'System Reports',
    icon: 'chart-bar',
    roles: ['admin']
  }
];

// Get navigation items for a specific role
export const getNavigationForRole = (userRole: UserRole): NavigationItem[] => {
  return NAVIGATION_CONFIG.filter(item => 
    item.roles.includes(userRole)
  ).map(item => ({
    ...item,
    children: item.children?.filter(child => child.roles.includes(userRole))
  }));
};

export const canAccessRoute = (userRole: UserRole, path: string): boolean => {
  const findRoute = (items: NavigationItem[], targetPath: string): boolean => {
    return items.some(item => {
      if (item.path === targetPath && item.roles.includes(userRole)) {
        return true;
      }
      if (item.children) {
        return findRoute(item.children, targetPath);
      }
      return false;
    });
  };
  
  return findRoute(NAVIGATION_CONFIG, path);
};