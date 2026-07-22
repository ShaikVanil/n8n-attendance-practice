# N8N Attendance Management System - Technical Architecture Document v3.0

## Document Information
| Field | Value |
|-------|-------|
| **Document Type** | Technical Architecture Document |
| **Version** | 3.0 |
| **Date** | January 2025 |
| **Author** | System Architect |
| **Status** | Updated |
| **Related Documents** | PRD v3.0 Enhanced |

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| Jan 2025 | 1.0 | Initial architecture design | System Architect |
| Jan 2025 | 2.0 | Location-based check-in, approval workflows | System Architect |
| Jan 2025 | 3.0 | Role-based access, WiFi + location clock-in, enhanced leave management | System Architect |

## Executive Summary

Version 3.0 introduces comprehensive role-based access control with tailored experiences for Employees, Managers, and Admins. The enhanced architecture features smart clock-in functionality using WiFi + location detection with intelligent fallback mechanisms, advanced leave management with approval workflows, and role-specific dashboards optimized for each user type.

### Key Architectural Enhancements v3.0
- **Role-Based Module Access:** Dynamic navigation and permissions for Employee, Manager, and Admin roles
- **Smart Clock-In System:** WiFi + location detection with location-only fallback
- **Enhanced Leave Management:** Comprehensive approval workflows with manager delegation
- **Advanced Dashboard Design:** Role-specific layouts with real-time status indicators
- **Improved Security:** Enhanced encryption and privacy controls for location/WiFi data
- **Mobile Optimization:** PWA support with offline capabilities

## High-Level Architecture Diagram
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Frontend Layer (React.js PWA)                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Employee Dashboard  │  Manager Dashboard  │  Admin Dashboard  │  Mobile App    │
│  - Clock-in/out      │  - Team Overview    │  - System Stats   │  - Offline     │
│  - Personal Records  │  - Approvals        │  - User Mgmt      │  - Location    │
│  - Leave Requests    │  - Team Reports     │  - Compliance     │  - WiFi Detect │
│  - Timesheets        │  - Leave Calendar   │  - Audit Logs     │  - Push Notify │
└─────────────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API Gateway Layer                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Role-Based Router  │  Auth Middleware  │  Rate Limiting  │  Request Validation │
│  - Route Protection │  - JWT Validation │  - API Quotas   │  - Input Sanitize  │
│  - Permission Check │  - Role Extraction│  - DDoS Protect │  - Schema Validate │
└─────────────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Business Logic Layer                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Clock-In Service    │  Leave Service     │  User Service     │  Report Service │
│  - WiFi Detection    │  - Request Mgmt    │  - Role Mgmt      │  - Analytics    │
│  - Location Verify   │  - Approval Flow   │  - Permission     │  - Export       │
│  - Fallback Logic    │  - Calendar Sync   │  - Audit Trail    │  - Compliance   │
│                      │                    │                   │                 │
│  Timesheet Service   │  Notification Svc  │  Security Service │  Integration    │
│  - Entry Validation  │  - Real-time Push  │  - Encryption     │  - N8N Webhooks │
│  - Approval Queue    │  - Email/SMS       │  - Privacy Ctrl   │  - External API │
│  - Payroll Export    │  - In-app Alerts   │  - Data Masking   │  - SSO Provider │
└─────────────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              N8N Workflow Layer                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Clock-In Workflows  │  Leave Workflows   │  Timesheet Flows  │  Notification   │
│  - WiFi Validation   │  - Approval Chain  │  - Auto-populate  │  - Multi-channel │
│  - Location Check    │  - Manager Notify  │  - Validation     │  - Template Mgmt │
│  - Fallback Trigger  │  - Calendar Update │  - Approval Route │  - Delivery Track│
│  - Audit Logging     │  - Balance Update  │  - Payroll Export │  - Retry Logic  │
└─────────────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Data Layer                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL Primary  │  Redis Cache       │  File Storage     │  External APIs  │
│  - User & Roles      │  - Session Data    │  - Documents      │  - WiFi Networks │
│  - Attendance Data   │  - Location Cache  │  - Attachments    │  - Map Services  │
│  - Leave Records     │  - Permissions     │  - Reports        │  - Email/SMS    │
│  - Audit Logs        │  - Notifications   │  - Backups        │  - Payroll Sys  │
└─────────────────────────────────────────────────────────────────────────────────┘


## Core System Components

### 1. Role-Based Access Control System

**Component:** `RoleBasedAccessController`
- **Purpose:** Manage user roles and module access permissions
- **Key Features:**
  - Dynamic navigation menu generation based on user role
  - Granular permission system for API endpoints
  - Role transition workflows and audit trails
  - Module visibility control at component level

**Role Definitions:**
```typescript
interface UserRole {
  id: string;
  name: 'employee' | 'manager' | 'admin';
  permissions: Permission[];
  accessibleModules: ModuleAccess[];
  dashboardLayout: DashboardConfig;
}

interface ModuleAccess {
  module: string;
  permissions: ('read' | 'write' | 'approve' | 'admin')[];
  restrictions?: AccessRestriction[];
}
```

### 2. Smart Clock-In System

**Component:** `SmartClockInController`
- **Purpose:** Manage WiFi + location-based clock-in with intelligent fallback
- **Key Features:**
  - Primary method: WiFi SSID detection + GPS verification
  - Fallback method: Location-only verification
  - Real-time connectivity status monitoring
  - Automatic method switching based on availability

**Clock-In Flow:**
```typescript
interface ClockInMethod {
  primary: {
    wifi: WiFiDetection;
    location: LocationVerification;
    accuracy: 'high';
  };
  fallback: {
    location: LocationVerification;
    accuracy: 'medium';
    manualOverride?: boolean;
  };
}

interface ClockInStatus {
  wifiConnected: boolean;
  locationVerified: boolean;
  currentMethod: 'primary' | 'fallback';
  canClockIn: boolean;
  statusMessage: string;
}
```

### 3. Enhanced Leave Management System

**Component:** `LeaveManagementController`
- **Purpose:** Comprehensive leave request and approval workflow management
- **Key Features:**
  - Multi-type leave request handling
  - Manager approval workflows with delegation
  - Calendar integration and conflict detection
  - Balance tracking and validation

**Leave Workflow:**
```typescript
interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  attachments?: FileAttachment[];
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvalChain: ApprovalStep[];
  managerComments?: string;
}

interface ApprovalStep {
  approverId: string;
  approverRole: 'manager' | 'hr' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  timestamp?: Date;
  comments?: string;
}
```

### 4. Advanced Dashboard System

**Component:** `DashboardController`
- **Purpose:** Role-specific dashboard layouts with real-time updates
- **Key Features:**
  - Dynamic widget loading based on user role
  - Real-time status indicators and notifications
  - Customizable layout preferences
  - Mobile-responsive design with PWA support

## Enhanced Data Models

### User and Role Management

```sql
-- Enhanced Users table with role-based fields
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    manager_id UUID REFERENCES users(id),
    department VARCHAR(100),
    employee_id VARCHAR(50) UNIQUE,
    phone VARCHAR(20),
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Role permissions table
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    module VARCHAR(50) NOT NULL,
    permissions TEXT[] NOT NULL,
    restrictions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- User role history for audit trail
CREATE TABLE user_role_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    old_role user_role,
    new_role user_role NOT NULL,
    changed_by UUID REFERENCES users(id),
    reason TEXT,
    effective_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Enhanced Clock-In System

```sql
-- WiFi networks table for office locations
CREATE TABLE office_wifi_networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID REFERENCES offices(id),
    ssid VARCHAR(100) NOT NULL,
    security_type VARCHAR(20),
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced check-in records with WiFi and method tracking
CREATE TABLE check_in_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    office_id UUID REFERENCES offices(id),
    check_in_time TIMESTAMP NOT NULL,
    check_out_time TIMESTAMP,
    check_in_method check_in_method_type NOT NULL,
    wifi_ssid VARCHAR(100),
    location_coordinates POINT,
    location_accuracy DECIMAL(10,2),
    is_fallback_method BOOLEAN DEFAULT false,
    device_info JSONB,
    ip_address INET,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Clock-in method enum
CREATE TYPE check_in_method_type AS ENUM (
    'wifi_location',
    'location_only',
    'manual_override',
    'admin_override'
);
```

### Advanced Leave Management

```sql
-- Enhanced leave requests with approval workflow
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES users(id) NOT NULL,
    leave_type leave_type_enum NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(3,1) NOT NULL,
    reason TEXT NOT NULL,
    status leave_status_enum DEFAULT 'pending',
    priority leave_priority_enum DEFAULT 'normal',
    emergency_contact JSONB,
    attachments JSONB DEFAULT '[]',
    submitted_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    manager_comments TEXT,
    hr_comments TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Leave approval workflow steps
CREATE TABLE leave_approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id UUID REFERENCES leave_requests(id),
    approver_id UUID REFERENCES users(id),
    approver_role user_role NOT NULL,
    step_order INTEGER NOT NULL,
    status approval_status_enum DEFAULT 'pending',
    approved_at TIMESTAMP,
    comments TEXT,
    is_delegated BOOLEAN DEFAULT false,
    delegated_to UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Leave balance tracking
CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    leave_type leave_type_enum NOT NULL,
    year INTEGER NOT NULL,
    allocated_days DECIMAL(4,1) NOT NULL,
    used_days DECIMAL(4,1) DEFAULT 0,
    pending_days DECIMAL(4,1) DEFAULT 0,
    carried_forward DECIMAL(4,1) DEFAULT 0,
    expires_at DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, leave_type, year)
);

-- Leave types enum
CREATE TYPE leave_type_enum AS ENUM (
    'annual',
    'sick',
    'personal',
    'emergency',
    'maternity',
    'paternity',
    'compensatory',
    'bereavement',
    'study'
);

CREATE TYPE leave_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled',
    'expired'
);

CREATE TYPE leave_priority_enum AS ENUM (
    'low',
    'normal',
    'high',
    'emergency'
);

CREATE TYPE approval_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected',
    'delegated'
);
```

### Enhanced Timesheet Management

```sql
-- Enhanced timesheets with approval workflow
CREATE TABLE timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_hours DECIMAL(5,2) DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    status timesheet_status_enum DEFAULT 'draft',
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    manager_comments TEXT,
    payroll_exported BOOLEAN DEFAULT false,
    payroll_exported_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, week_start_date)
);

-- Timesheet entries with project tracking
CREATE TABLE timesheet_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_id UUID REFERENCES timesheets(id) NOT NULL,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    break_duration INTERVAL DEFAULT '0 minutes',
    total_hours DECIMAL(4,2) NOT NULL,
    project_code VARCHAR(50),
    task_description TEXT,
    is_overtime BOOLEAN DEFAULT false,
    check_in_record_id UUID REFERENCES check_in_records(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE timesheet_status_enum AS ENUM (
    'draft',
    'submitted',
    'approved',
    'rejected',
    'revision_required'
);
```

## API Architecture v3.0

### Role-Based API Endpoints

#### Authentication & Authorization
```typescript
// Enhanced JWT payload with role information
interface JWTPayload {
  userId: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
  permissions: string[];
  managerId?: string;
  department?: string;
  iat: number;
  exp: number;
}

// Role-based middleware
@Middleware()
class RoleBasedAuth {
  @Use()
  async authorize(req: Request, res: Response, next: NextFunction) {
    const token = extractToken(req);
    const payload = verifyJWT(token);
    
    // Attach user context
    req.user = payload;
    req.permissions = await getPermissions(payload.role);
    
    next();
  }
}
```

#### Smart Clock-In API
```typescript
// Clock-in status endpoint
GET /api/v3/clock-in/status
Response: {
  wifiConnected: boolean;
  wifiSSID?: string;
  locationVerified: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  nearestOffice?: {
    id: string;
    name: string;
    distance: number;
  };
  canClockIn: boolean;
  currentMethod: 'primary' | 'fallback';
  statusMessage: string;
}

// Enhanced clock-in endpoint
POST /api/v3/clock-in
Request: {
  method: 'wifi_location' | 'location_only' | 'manual_override';
  wifiSSID?: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  deviceInfo: {
    userAgent: string;
    platform: string;
    timestamp: string;
  };
  notes?: string;
}

Response: {
  success: boolean;
  checkInId: string;
  timestamp: string;
  method: string;
  office: {
    id: string;
    name: string;
  };
  message: string;
}
```

#### Leave Management API
```typescript
// Submit leave request
POST /api/v3/leave/request
Request: {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  priority?: 'low' | 'normal' | 'high' | 'emergency';
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  attachments?: FileUpload[];
}

// Manager approval endpoint
POST /api/v3/leave/approve/:requestId
Request: {
  action: 'approve' | 'reject';
  comments?: string;
  delegateTo?: string;
}

// Leave calendar view
GET /api/v3/leave/calendar
Query: {
  startDate: string;
  endDate: string;
  teamOnly?: boolean; // For managers
  departmentOnly?: boolean; // For admins
}
```

#### Role-Specific Dashboard API
```typescript
// Employee dashboard
GET /api/v3/dashboard/employee
Response: {
  clockInStatus: ClockInStatus;
  todaySchedule: {
    expectedHours: number;
    workedHours: number;
    breakTime: number;
  };
  recentActivity: Activity[];
  pendingActions: {
    timesheets: number;
    leaveRequests: number;
  };
  upcomingLeave: LeaveRequest[];
  notifications: Notification[];
}

// Manager dashboard
GET /api/v3/dashboard/manager
Response: {
  teamOverview: {
    totalMembers: number;
    presentToday: number;
    onLeave: number;
    lateArrivals: number;
  };
  pendingApprovals: {
    timesheets: number;
    leaveRequests: number;
    urgent: number;
  };
  teamCalendar: CalendarEvent[];
  recentActivity: Activity[];
  alerts: Alert[];
}

// Admin dashboard
GET /api/v3/dashboard/admin
Response: {
  systemStats: {
    totalUsers: number;
    activeUsers: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
  };
  complianceStatus: {
    attendanceCompliance: number;
    leaveCompliance: number;
    timesheetCompliance: number;
  };
  recentActivity: Activity[];
  systemAlerts: Alert[];
  userManagement: {
    pendingApprovals: number;
    roleChanges: number;
  };
}
```

## Frontend Architecture v3.0

### Enhanced Component Structure
src/
├── components/
│   ├── auth/
│   │   ├── RoleBasedRoute.tsx
│   │   ├── PermissionGate.tsx
│   │   └── AuthProvider.tsx
│   ├── dashboard/
│   │   ├── EmployeeDashboard.tsx
│   │   ├── ManagerDashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── DashboardWidget.tsx
│   ├── clock-in/
│   │   ├── SmartClockIn.tsx
│   │   ├── WiFiStatusIndicator.tsx
│   │   ├── LocationStatusIndicator.tsx
│   │   ├── ClockInButton.tsx
│   │   └── ClockInHistory.tsx
│   ├── leave/
│   │   ├── LeaveRequestForm.tsx
│   │   ├── LeaveCalendar.tsx
│   │   ├── LeaveBalance.tsx
│   │   ├── ManagerApproval.tsx
│   │   └── LeaveHistory.tsx
│   ├── timesheet/
│   │   ├── TimesheetGrid.tsx
│   │   ├── TimesheetEntry.tsx
│   │   ├── TimesheetApproval.tsx
│   │   └── TimesheetReports.tsx
│   ├── navigation/
│   │   ├── RoleBasedNavigation.tsx
│   │   ├── NavigationMenu.tsx
│   │   └── BreadcrumbTrail.tsx
│   ├── notifications/
│   │   ├── NotificationCenter.tsx
│   │   ├── RealTimeNotifications.tsx
│   │   └── NotificationSettings.tsx
│   └── shared/
│       ├── StatusIndicator.tsx
│       ├── ApprovalButton.tsx
│       ├── DataTable.tsx
│       ├── DateRangePicker.tsx
│       └── FileUpload.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── usePermissions.ts
│   ├── useClockIn.ts
│   ├── useWiFiDetection.ts
│   ├── useLocation.ts
│   ├── useLeaveManagement.ts
│   ├── useTimesheets.ts
│   ├── useNotifications.ts
│   └── useRealTimeUpdates.ts
├── services/
│   ├── authService.ts
│   ├── clockInService.ts
│   ├── wifiService.ts
│   ├── locationService.ts
│   ├── leaveService.ts
│   ├── timesheetService.ts
│   ├── notificationService.ts
│   └── realtimeService.ts
├── stores/
│   ├── authStore.ts
│   ├── clockInStore.ts
│   ├── leaveStore.ts
│   ├── timesheetStore.ts
│   ├── notificationStore.ts
│   └── uiStore.ts
├── utils/
│   ├── permissions.ts
│   ├── roleHelpers.ts
│   ├── locationUtils.ts
│   ├── dateUtils.ts
│   └── validationSchemas.ts
└── types/
├── auth.ts
├── user.ts
├── clockIn.ts
├── leave.ts
├── timesheet.ts
└── notifications.ts


### Key Frontend Features v3.0

#### 1. Role-Based Navigation
```typescript
// RoleBasedNavigation.tsx
interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  roles: UserRole[];
  permissions?: string[];
  children?: NavigationItem[];
}

const navigationConfig: NavigationItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    roles: ['employee', 'manager', 'admin']
  },
  {
    path: '/attendance',
    label: 'Attendance',
    icon: 'clock',
    roles: ['employee', 'manager', 'admin'],
    children: [
      {
        path: '/attendance/clock-in',
        label: 'Clock In/Out',
        icon: 'timer',
        roles: ['employee']
      },
      {
        path: '/attendance/history',
        label: 'History',
        icon: 'history',
        roles: ['employee', 'manager', 'admin']
      }
    ]
  },
  {
    path: '/leave',
    label: 'Leave Management',
    icon: 'calendar',
    roles: ['employee', 'manager', 'admin'],
    children: [
      {
        path: '/leave/request',
        label: 'Apply Leave',
        icon: 'plus',
        roles: ['employee']
      },
      {
        path: '/leave/approve',
        label: 'Approve Requests',
        icon: 'check',
        roles: ['manager', 'admin']
      }
    ]
  },
  {
    path: '/timesheets',
    label: 'Timesheets',
    icon: 'timesheet',
    roles: ['employee', 'manager', 'admin']
  },
  {
    path: '/reports',
    label: 'Reports',
    icon: 'chart',
    roles: ['manager', 'admin']
  },
  {
    path: '/users',
    label: 'User Management',
    icon: 'users',
    roles: ['manager', 'admin'],
    permissions: ['user.manage']
  }
];
```

#### 2. Smart Clock-In Interface
```typescript
// SmartClockIn.tsx
interface ClockInState {
  wifiStatus: 'connected' | 'disconnected' | 'checking';
  locationStatus: 'verified' | 'unverified' | 'checking';
  currentMethod: 'primary' | 'fallback';
  canClockIn: boolean;
  isClockingIn: boolean;
}

const SmartClockIn: React.FC = () => {
  const [state, setState] = useState<ClockInState>({
    wifiStatus: 'checking',
    locationStatus: 'checking',
    currentMethod: 'primary',
    canClockIn: false,
    isClockingIn: false
  });

  const { checkWiFiConnection } = useWiFiDetection();
  const { getCurrentLocation, verifyLocation } = useLocation();
  const { clockIn } = useClockIn();

  useEffect(() => {
    const checkStatus = async () => {
      // Check WiFi connection
      const wifiConnected = await checkWiFiConnection();
      
      // Get and verify location
      const location = await getCurrentLocation();
      const locationVerified = await verifyLocation(location);
      
      // Determine method and availability
      const method = wifiConnected && locationVerified ? 'primary' : 'fallback';
      const canClockIn = locationVerified; // Can clock in if location is verified
      
      setState({
        wifiStatus: wifiConnected ? 'connected' : 'disconnected',
        locationStatus: locationVerified ? 'verified' : 'unverified',
        currentMethod: method,
        canClockIn,
        isClockingIn: false
      });
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const handleClockIn = async () => {
    setState(prev => ({ ...prev, isClockingIn: true }));
    
    try {
      await clockIn({
        method: state.currentMethod === 'primary' ? 'wifi_location' : 'location_only'
      });
      
      // Show success notification
      showNotification('Successfully clocked in!', 'success');
    } catch (error) {
      showNotification('Failed to clock in. Please try again.', 'error');
    } finally {
      setState(prev => ({ ...prev, isClockingIn: false }));
    }
  };

  return (
    <div className="smart-clock-in">
      <div className="status-indicators">
        <WiFiStatusIndicator status={state.wifiStatus} />
        <LocationStatusIndicator status={state.locationStatus} />
      </div>
      
      <div className="method-indicator">
        {state.currentMethod === 'primary' ? (
          <span className="primary-method">WiFi + Location Verification</span>
        ) : (
          <span className="fallback-method">Location Only (Fallback Mode)</span>
        )}
      </div>
      
      <ClockInButton
        canClockIn={state.canClockIn}
        isClockingIn={state.isClockingIn}
        onClick={handleClockIn}
      />
    </div>
  );
};
```

#### 3. Enhanced Leave Management Interface
```typescript
// LeaveRequestForm.tsx
interface LeaveFormData {
  leaveType: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  priority: 'low' | 'normal' | 'high' | 'emergency';
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  attachments: File[];
}

const LeaveRequestForm: React.FC = () => {
  const [formData, setFormData] = useState<LeaveFormData>({
    leaveType: 'annual',
    startDate: new Date(),
    endDate: new Date(),
    reason: '',
    priority: 'normal',
    attachments: []
  });

  const { leaveBalance, submitLeaveRequest } = useLeaveManagement();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await submitLeaveRequest(formData);
      showNotification('Leave request submitted successfully!', 'success');
      // Reset form or redirect
    } catch (error) {
      showNotification('Failed to submit leave request.', 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="leave-request-form">
      <div className="form-section">
        <h3>Leave Details</h3>
        
        <div className="form-group">
          <label>Leave Type</label>
          <select
            value={formData.leaveType}
            onChange={(e) => setFormData(prev => ({ ...prev, leaveType: e.target.value }))}
          >
            <option value="annual">Annual Leave</option>
            <option value="sick">Sick Leave</option>
            <option value="personal">Personal Leave</option>
            <option value="emergency">Emergency Leave</option>
            <option value="maternity">Maternity Leave</option>
            <option value="paternity">Paternity Leave</option>
          </select>
        </div>
        
        <div className="date-range">
          <div className="form-group">
            <label>Start Date</label>
            <DatePicker
              selected={formData.startDate}
              onChange={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
              minDate={new Date()}
            />
          </div>
          
          <div className="form-group">
            <label>End Date</label>
            <DatePicker
              selected={formData.endDate}
              onChange={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
              minDate={formData.startDate}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Reason</label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            rows={4}
            required
          />
        </div>
      </div>
      
      {formData.priority === 'emergency' && (
        <div className="form-section">
          <h3>Emergency Contact</h3>
          <div className="emergency-contact">
            <div className="form-group">
              <label>Contact Name</label>
              <input
                type="text"
                value={formData.emergencyContact?.name || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  emergencyContact: {
                    ...prev.emergencyContact,
                    name: e.target.value,
                    phone: prev.emergencyContact?.phone || '',
                    relationship: prev.emergencyContact?.relationship || ''
                  }
                }))}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={formData.emergencyContact?.phone || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  emergencyContact: {
                    ...prev.emergencyContact,
                    name: prev.emergencyContact?.name || '',
                    phone: e.target.value,
                    relationship: prev.emergencyContact?.relationship || ''
                  }
                }))}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Relationship</label>
              <input
                type="text"
                value={formData.emergencyContact?.relationship || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  emergencyContact: {
                    ...prev.emergencyContact,
                    name: prev.emergencyContact?.name || '',
                    phone: prev.emergencyContact?.phone || '',
                    relationship: e.target.value
                  }
                }))}
                required
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="form-section">
        <h3>Attachments</h3>
        <FileUpload
          files={formData.attachments}
          onFilesChange={(files) => setFormData(prev => ({ ...prev, attachments: files }))}
          acceptedTypes={['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']}
          maxFiles={5}
        />
      </div>
      
      <div className="leave-balance-info">
        <h3>Leave Balance</h3>
        <div className="balance-grid">
          {leaveBalance.map(balance => (
            <div key={balance.leaveType} className="balance-item">
              <span className="leave-type">{balance.leaveType}</span>
              <span className="available">{balance.available} days</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="form-actions">
        <button type="button" className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Submit Request</button>
      </div>
    </form>
  );
};
```

## N8N Workflow Architecture v3.0

### Enhanced Workflow Examples

#### Smart Clock-In Workflow
```json
{
  "name": "Smart Clock-In Handler v3.0",
  "nodes": [
    {
      "name": "Clock-In Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "clock-in/smart",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Validate WiFi Network",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "SELECT o.* FROM offices o JOIN office_wifi_networks w ON o.id = w.office_id WHERE w.ssid = $1 AND w.is_active = true"
      }
    },
    {
      "name": "Verify Location",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Calculate distance from office coordinates\nconst calculateDistance = (lat1, lon1, lat2, lon2) => {\n  const R = 6371e3; // Earth's radius in meters\n  const φ1 = lat1 * Math.PI/180;\n  const φ2 = lat2 * Math.PI/180;\n  const Δφ = (lat2-lat1) * Math.PI/180;\n  const Δλ = (lon2-lon1) * Math.PI/180;\n  \n  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +\n          Math.cos(φ1) * Math.cos(φ2) *\n          Math.sin(Δλ/2) * Math.sin(Δλ/2);\n  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));\n  \n  return R * c; // Distance in meters\n};\n\nconst userLat = $json.location.latitude;\nconst userLon = $json.location.longitude;\nconst officeLat = $json.office.latitude;\nconst officeLon = $json.office.longitude;\nconst allowedRadius = $json.office.geofence_radius || 100;\n\nconst distance = calculateDistance(userLat, userLon, officeLat, officeLon);\nconst isWithinGeofence = distance <= allowedRadius;\n\nreturn {\n  isValid: isWithinGeofence,\n  distance: distance,\n  allowedRadius: allowedRadius,\n  method: $json.wifiSSID ? 'wifi_location' : 'location_only'\n};"
      }
    },
    {
      "name": "Create Clock-In Record",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "INSERT INTO check_in_records (user_id, office_id, check_in_time, check_in_method, wifi_ssid, location_coordinates, location_accuracy, is_fallback_method, device_info, ip_address) VALUES ($1, $2, NOW(), $3, $4, POINT($5, $6), $7, $8, $9, $10) RETURNING *"
      }
    },
    {
      "name": "Send Confirmation",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "return {\n  success: true,\n  checkInId: $json.id,\n  timestamp: $json.check_in_time,\n  method: $json.check_in_method,\n  office: {\n    id: $json.office_id,\n    name: $json.office_name\n  },\n  message: `Successfully checked in using ${$json.check_in_method} method`\n};"
      }
    },
    {
      "name": "Audit Log",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "INSERT INTO audit_logs (user_id, action, details, ip_address, timestamp) VALUES ($1, 'clock_in', $2, $3, NOW())"
      }
    }
  ]
}
```

#### Enhanced Leave Approval Workflow
```json
{
  "name": "Leave Approval Workflow v3.0",
  "nodes": [
    {
      "name": "Leave Request Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "leave/request",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Validate Leave Balance",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "SELECT * FROM leave_balances WHERE user_id = $1 AND leave_type = $2 AND year = EXTRACT(YEAR FROM NOW())"
      }
    },
    {
      "name": "Check Conflicts",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "SELECT * FROM leave_requests WHERE employee_id = $1 AND status IN ('pending', 'approved') AND (start_date <= $3 AND end_date >= $2)"
      }
    },
    {
      "name": "Create Leave Request",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, total_days, reason, priority, emergency_contact, attachments) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *"
      }
    },
    {
      "name": "Setup Approval Chain",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Determine approval chain based on leave type and priority\nconst leaveType = $json.leave_type;\nconst priority = $json.priority;\nconst totalDays = $json.total_days;\n\nlet approvalChain = [];\n\n// Manager approval always required\napprovalChain.push({\n  approver_role: 'manager',\n  step_order: 1\n});\n\n// HR approval for certain conditions\nif (leaveType === 'maternity' || leaveType === 'paternity' || totalDays > 10 || priority === 'emergency') {\n  approvalChain.push({\n    approver_role: 'hr',\n    step_order: 2\n  });\n}\n\n// Admin approval for extended leave\nif (totalDays > 30) {\n  approvalChain.push({\n    approver_role: 'admin',\n    step_order: approvalChain.length + 1\n  });\n}\n\nreturn { approvalChain };"
      }
    },
    {
      "name": "Create Approval Steps",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "INSERT INTO leave_approval_steps (leave_request_id, approver_id, approver_role, step_order) SELECT $1, u.id, $2, $3 FROM users u WHERE u.role = $2 AND u.department = (SELECT department FROM users WHERE id = $4) LIMIT 1"
      }
    },
    {
      "name": "Notify Manager",
      "type": "n8n-nodes-base.sendGrid",
      "parameters": {
        "subject": "New Leave Request - {{ $json.employee_name }}",
        "message": "A new {{ $json.leave_type }} leave request has been submitted by {{ $json.employee_name }} for {{ $json.total_days }} days from {{ $json.start_date }} to {{ $json.end_date }}.\n\nReason: {{ $json.reason }}\n\nPriority: {{ $json.priority }}\n\nPlease review and approve/reject this request."
      }
    },
    {
      "name": "Real-time Notification",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "httpMethod": "POST",
        "url": "{{ $env.FRONTEND_URL }}/api/notifications/push",
        "body": {
          "type": "leave_request_submitted",
          "userId": "{{ $json.manager_id }}",
          "data": {
            "requestId": "{{ $json.id }}",
            "employeeName": "{{ $json.employee_name }}",
            "leaveType": "{{ $json.leave_type }}",
            "startDate": "{{ $json.start_date }}",
            "endDate": "{{ $json.end_date }}"
          }
        }
      }
    }
  ]
}
```

#### Manager Approval Action Workflow
```json
{
  "name": "Manager Approval Action v3.0",
  "nodes": [
    {
      "name": "Approval Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "leave/approve/:requestId",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Validate Manager Authority",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "SELECT lr.*, u.manager_id, u.first_name, u.last_name FROM leave_requests lr JOIN users u ON lr.employee_id = u.id WHERE lr.id = $1 AND u.manager_id = $2"
      }
    },
    {
      "name": "Update Approval Step",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "UPDATE leave_approval_steps SET status = $1, approved_at = NOW(), comments = $2 WHERE leave_request_id = $3 AND approver_id = $4 AND approver_role = 'manager'"
      }
    },
    {
      "name": "Check Next Approval Required",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "SELECT * FROM leave_approval_steps WHERE leave_request_id = $1 AND status = 'pending' ORDER BY step_order LIMIT 1"
      }
    },
    {
      "name": "Update Leave Request Status",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Determine final status based on approval chain\nconst action = $json.action;\nconst hasNextApproval = $json.nextApproval;\n\nlet status;\nif (action === 'reject') {\n  status = 'rejected';\n} else if (action === 'approve' && !hasNextApproval) {\n  status = 'approved';\n} else {\n  status = 'pending'; // Still waiting for next approval\n}\n\nreturn { finalStatus: status };"
      }
    },
    {
      "name": "Update Leave Balance",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "UPDATE leave_balances SET used_days = used_days + $1, pending_days = pending_days - $1 WHERE user_id = $2 AND leave_type = $3 AND year = EXTRACT(YEAR FROM NOW())"
      },
      "conditions": {
        "if": "{{ $json.finalStatus === 'approved' }}"
      }
    },
    {
      "name": "Notify Employee",
      "type": "n8n-nodes-base.sendGrid",
      "parameters": {
        "subject": "Leave Request {{ $json.action === 'approve' ? 'Approved' : 'Rejected' }}",
        "message": "Your {{ $json.leave_type }} leave request from {{ $json.start_date }} to {{ $json.end_date }} has been {{ $json.action === 'approve' ? 'approved' : 'rejected' }} by your manager.\n\n{{ $json.comments ? 'Manager Comments: ' + $json.comments : '' }}\n\n{{ $json.finalStatus === 'pending' ? 'Your request is now pending approval from HR/Admin.' : '' }}"
      }
    },
    {
      "name": "Notify Next Approver",
      "type": "n8n-nodes-base.sendGrid",
      "parameters": {
        "subject": "Leave Request Pending Your Approval",
        "message": "A leave request from {{ $json.employee_name }} is now pending your approval.\n\nLeave Type: {{ $json.leave_type }}\nDates: {{ $json.start_date }} to {{ $json.end_date }}\nReason: {{ $json.reason }}\nManager Comments: {{ $json.manager_comments }}"
      },
      "conditions": {
        "if": "{{ $json.finalStatus === 'pending' && $json.nextApproval }}"
      }
    },
    {
      "name": "Calendar Integration",
      "type": "n8n-nodes-base.googleCalendar",
      "parameters": {
        "operation": "create",
        "summary": "{{ $json.employee_name }} - {{ $json.leave_type }}",
        "start": "{{ $json.start_date }}",
        "end": "{{ $json.end_date }}",
        "description": "Approved leave request\nEmployee: {{ $json.employee_name }}\nType: {{ $json.leave_type }}\nReason: {{ $json.reason }}"
      },
      "conditions": {
        "if": "{{ $json.finalStatus === 'approved' }}"
      }
    }
  ]
}
```

## Security and Compliance v3.0

### Enhanced Security Measures

#### Role-Based Security
- **Granular Permissions:** Fine-grained access control for each module and operation
- **Dynamic Role Assignment:** Secure role transition workflows with approval requirements
- **Session Management:** Role-aware session handling with automatic privilege escalation detection
- **API Security:** Role-based rate limiting and endpoint protection

#### Location and WiFi Privacy
- **Data Encryption:** AES-256 encryption for all location and WiFi data at rest and in transit
- **Privacy Controls:** User consent management for location tracking
- **Data Minimization:** Automatic deletion of location data after configurable retention period
- **Anonymization:** Location data anonymization for analytics and reporting

#### Enhanced Audit Trail
- **Comprehensive Logging:** All user actions, role changes, and approval decisions
- **Immutable Audit Log:** Blockchain-inspired audit trail with cryptographic integrity
- **Real-time Monitoring:** Suspicious activity detection and alerting
- **Compliance Reporting:** Automated compliance reports for various regulations

### Performance Optimization v3.0

#### Smart Caching Strategy
- **Role-Based Caching:** Cache user permissions and role data for faster access control
- **Location Caching:** Cache office coordinates and WiFi network data
- **Real-time Updates:** Efficient cache invalidation for role and permission changes
- **CDN Integration:** Global content delivery for mobile users

#### Database Optimization
- **Read Replicas:** Separate read replicas for reporting and analytics
- **Partitioning:** Time-based partitioning for attendance and audit data
- **Indexing Strategy:** Optimized indexes for role-based queries
- **Connection Pooling:** Efficient database connection management

#### Mobile Performance
- **Progressive Web App:** Offline-first architecture with service workers
- **Lazy Loading:** Role-based component lazy loading
- **Image Optimization:** Responsive images with WebP support
- **Bundle Splitting:** Code splitting based on user roles

## Deployment Architecture v3.0

### Enhanced Infrastructure

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CDN Layer (CloudFlare)                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Global Edge Locations  │  DDoS Protection  │  SSL Termination  │  Caching     │
└─────────────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Load Balancer (AWS ALB)                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│  SSL Termination  │  Health Checks  │  Auto Scaling  │  Geographic Routing    │
└─────────────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Frontend Tier                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Vercel Edge Functions  │  Next.js SSR  │  PWA Service Worker  │  Role Router  │
│  - Role-based routing   │  - Server-side │  - Offline support   │  - Permission │
│  - Edge authentication  │    rendering   │  - Background sync   │    validation │
└─────────────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API Gateway                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  AWS API Gateway  │  Rate Limiting  │  Request Validation  │  Role-based Auth  │
│  - JWT validation │  - Per-role     │  - Schema validation │  - Permission     │
│  - Request routing│    quotas       │  - Input sanitization│    middleware    │
└─────────────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Application Tier                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  N8N Cloud Workflows  │  Lambda Functions  │  ECS Containers  │  Redis Cluster │
│  - Approval workflows │  - Clock-in logic  │  - API services  │  - Session mgmt│
│  - Notification flows │  - Location verify │  - User services │  - Cache layer │
│  - Leave management   │  - WiFi validation │  - Report engine │  - Real-time   │
└─────────────────────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Data Tier                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL Primary  │  Read Replicas  │  Redis Cache  │  S3 Object Storage    │
│  - User data         │  - Analytics    │  - Sessions   │  - File attachments   │
│  - Attendance logs   │  - Reporting    │  - Permissions│  - Backup storage     │
│  - Approval workflows│  - Audit trails │  - Location   │  - Document storage   │
└─────────────────────────────────────────────────────────────────────────────────┘

### Role-Based Infrastructure Components

#### Authentication & Authorization Service
```yaml
service: auth-service
type: AWS Lambda
runtime: Node.js 18
features:
  - JWT token generation and validation
  - Role-based permission matrix
  - Session management with Redis
  - Multi-factor authentication support
  - OAuth integration (Google, Microsoft)
scaling:
  - Auto-scaling based on request volume
  - Cold start optimization
  - Regional deployment
```

#### Location & WiFi Validation Service
```yaml
service: location-service
type: AWS Lambda + Edge Functions
runtime: Node.js 18
features:
  - GPS coordinate validation
  - Geofencing calculations
  - WiFi network detection
  - Fallback mechanism management
  - Location history tracking
integrations:
  - Google Maps API
  - Office WiFi infrastructure
  - Mobile device sensors
```

#### Approval Workflow Engine
```yaml
service: approval-engine
type: N8N Cloud + AWS Step Functions
features:
  - Multi-level approval chains
  - Delegation management
  - Escalation rules
  - Bulk approval processing
  - Audit trail generation
integrations:
  - Email notifications
  - Slack/Teams integration
  - Mobile push notifications
```

## Enhanced Data Models v3.0

### Core Entity Relationships

```sql
-- Enhanced User Model with Role-Based Access
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    manager_id UUID REFERENCES users(id),
    department_id UUID REFERENCES departments(id),
    office_id UUID REFERENCES offices(id),
    wifi_mac_addresses TEXT[], -- For WiFi-based authentication
    location_permissions JSONB, -- Privacy settings
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Role-Based Permissions Matrix
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    module VARCHAR(50) NOT NULL, -- dashboard, attendance, timesheets, etc.
    permissions TEXT[] NOT NULL, -- read, write, approve, delete
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced Office Model with WiFi and Location Data
CREATE TABLE offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    geofence_radius INTEGER DEFAULT 100, -- meters
    wifi_networks JSONB, -- {"ssid": "office-wifi", "bssid": "xx:xx:xx:xx:xx:xx"}
    timezone VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced Check-In Records with WiFi and Location Data
CREATE TABLE check_in_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    office_id UUID NOT NULL REFERENCES offices(id),
    check_in_time TIMESTAMP NOT NULL,
    check_out_time TIMESTAMP,
    check_in_method check_in_method_type NOT NULL, -- wifi_location, location_only, manual
    location_data JSONB, -- GPS coordinates, accuracy
    wifi_data JSONB, -- Connected network info
    verification_status verification_status_type DEFAULT 'verified',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Comprehensive Leave Management
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    leave_type leave_type_enum NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(3,1) NOT NULL,
    reason TEXT,
    status approval_status DEFAULT 'pending',
    manager_id UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    attachments JSONB, -- File URLs and metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Leave Balance Tracking
CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    leave_type leave_type_enum NOT NULL,
    year INTEGER NOT NULL,
    allocated_days DECIMAL(4,1) NOT NULL,
    used_days DECIMAL(4,1) DEFAULT 0,
    pending_days DECIMAL(4,1) DEFAULT 0,
    carried_forward DECIMAL(4,1) DEFAULT 0,
    expires_at DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, leave_type, year)
);

-- Enhanced Timesheet Management
CREATE TABLE timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_hours DECIMAL(5,2) DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    status approval_status DEFAULT 'draft',
    submitted_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, week_start_date)
);

CREATE TABLE timesheet_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_id UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    break_duration INTEGER DEFAULT 0, -- minutes
    total_hours DECIMAL(4,2) DEFAULT 0,
    project_id UUID REFERENCES projects(id),
    task_description TEXT,
    is_overtime BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Approval Workflow Tracking
CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- timesheet, leave_request
    entity_id UUID NOT NULL,
    workflow_type VARCHAR(50) NOT NULL,
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER NOT NULL,
    status approval_status DEFAULT 'pending',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    approver_id UUID NOT NULL REFERENCES users(id),
    status approval_status DEFAULT 'pending',
    approved_at TIMESTAMP,
    comments TEXT,
    delegation_to UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced Notification System
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50), -- timesheet, leave_request, check_in
    entity_id UUID,
    priority notification_priority DEFAULT 'medium',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    channels TEXT[] DEFAULT ARRAY['in_app'], -- in_app, email, sms, push
    scheduled_for TIMESTAMP DEFAULT NOW(),
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Enhanced Enum Types

```sql
-- User Roles with Hierarchical Permissions
CREATE TYPE user_role AS ENUM (
    'employee',
    'team_lead',
    'manager', 
    'hr_manager',
    'admin',
    'super_admin'
);

-- Check-in Methods
CREATE TYPE check_in_method_type AS ENUM (
    'wifi_location',  -- Primary: WiFi + GPS
    'location_only',  -- Fallback: GPS only
    'manual',         -- Manual entry by manager
    'emergency'       -- Emergency override
);

-- Verification Status
CREATE TYPE verification_status_type AS ENUM (
    'verified',
    'pending_verification',
    'failed_verification',
    'manually_approved'
);

-- Leave Types
CREATE TYPE leave_type_enum AS ENUM (
    'annual',
    'sick',
    'personal',
    'emergency',
    'maternity',
    'paternity',
    'compensatory',
    'unpaid'
);

-- Approval Status
CREATE TYPE approval_status AS ENUM (
    'draft',
    'pending',
    'approved',
    'rejected',
    'cancelled',
    'expired'
);

-- Notification Types
CREATE TYPE notification_type AS ENUM (
    'check_in_success',
    'check_in_failed',
    'timesheet_submitted',
    'timesheet_approved',
    'timesheet_rejected',
    'leave_submitted',
    'leave_approved',
    'leave_rejected',
    'approval_required',
    'system_alert'
);

-- Notification Priority
CREATE TYPE notification_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);
```

## Enhanced API Architecture v3.0

### Role-Based API Endpoints

#### Authentication & Authorization
```typescript
// Authentication endpoints
POST /api/v3/auth/login
POST /api/v3/auth/logout
POST /api/v3/auth/refresh
GET  /api/v3/auth/profile
PUT  /api/v3/auth/profile
POST /api/v3/auth/change-password
POST /api/v3/auth/forgot-password
POST /api/v3/auth/reset-password

// Role management (Admin only)
GET  /api/v3/roles
POST /api/v3/roles
PUT  /api/v3/roles/:id
DEL  /api/v3/roles/:id
GET  /api/v3/roles/:id/permissions
PUT  /api/v3/roles/:id/permissions
```

#### Enhanced Clock-In System
```typescript
// Clock-in endpoints with WiFi and location support
POST /api/v3/checkin/validate-location
POST /api/v3/checkin/validate-wifi
POST /api/v3/checkin/clock-in
POST /api/v3/checkin/clock-out
GET  /api/v3/checkin/status
GET  /api/v3/checkin/history
POST /api/v3/checkin/manual (Manager/Admin only)

// Office and location management
GET  /api/v3/offices
POST /api/v3/offices (Admin only)
PUT  /api/v3/offices/:id (Admin only)
GET  /api/v3/offices/:id/wifi-networks
PUT  /api/v3/offices/:id/wifi-networks (Admin only)
```

#### Comprehensive Leave Management
```typescript
// Employee leave endpoints
GET  /api/v3/leave/balance
GET  /api/v3/leave/requests
POST /api/v3/leave/requests
PUT  /api/v3/leave/requests/:id
DEL  /api/v3/leave/requests/:id
GET  /api/v3/leave/calendar
GET  /api/v3/leave/types

// Manager approval endpoints
GET  /api/v3/leave/team-requests (Manager+)
PUT  /api/v3/leave/requests/:id/approve (Manager+)
PUT  /api/v3/leave/requests/:id/reject (Manager+)
GET  /api/v3/leave/team-calendar (Manager+)
POST /api/v3/leave/bulk-approve (Manager+)

// Admin leave management
GET  /api/v3/leave/all-requests (Admin only)
PUT  /api/v3/leave/balance/:userId (Admin only)
GET  /api/v3/leave/reports (Admin only)
```

#### Enhanced Timesheet Management
```typescript
// Employee timesheet endpoints
GET  /api/v3/timesheets
POST /api/v3/timesheets
PUT  /api/v3/timesheets/:id
DEL  /api/v3/timesheets/:id
POST /api/v3/timesheets/:id/submit
GET  /api/v3/timesheets/:id/entries
POST /api/v3/timesheets/:id/entries
PUT  /api/v3/timesheets/:id/entries/:entryId
DEL  /api/v3/timesheets/:id/entries/:entryId

// Manager approval endpoints
GET  /api/v3/timesheets/team (Manager+)
PUT  /api/v3/timesheets/:id/approve (Manager+)
PUT  /api/v3/timesheets/:id/reject (Manager+)
POST /api/v3/timesheets/bulk-approve (Manager+)

// Admin timesheet management
GET  /api/v3/timesheets/all (Admin only)
GET  /api/v3/timesheets/reports (Admin only)
```

#### User Management
```typescript
// User management (role-based access)
GET  /api/v3/users (Manager+ for team, Admin for all)
POST /api/v3/users (Admin only)
PUT  /api/v3/users/:id (Admin only)
DEL  /api/v3/users/:id (Admin only)
PUT  /api/v3/users/:id/role (Admin only)
GET  /api/v3/users/:id/team (Manager+ for own team)
POST /api/v3/users/bulk-import (Admin only)
```

#### Reporting and Analytics
```typescript
// Role-based reporting
GET  /api/v3/reports/attendance (Manager+ for team, Admin for all)
GET  /api/v3/reports/timesheets (Manager+ for team, Admin for all)
GET  /api/v3/reports/leave (Manager+ for team, Admin for all)
GET  /api/v3/reports/productivity (Manager+ for team, Admin for all)
GET  /api/v3/reports/compliance (Admin only)
POST /api/v3/reports/custom (Admin only)
GET  /api/v3/reports/export/:reportId
```

#### Notification System
```typescript
// Notification endpoints
GET  /api/v3/notifications
PUT  /api/v3/notifications/:id/read
PUT  /api/v3/notifications/mark-all-read
DEL  /api/v3/notifications/:id
GET  /api/v3/notifications/settings
PUT  /api/v3/notifications/settings
POST /api/v3/notifications/test (Admin only)
```

## Enhanced Frontend Architecture v3.0

### Role-Based Component Structure

src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RoleGuard.tsx
│   │   ├── PermissionCheck.tsx
│   │   └── ProfileSettings.tsx
│   ├── dashboard/
│   │   ├── EmployeeDashboard.tsx
│   │   ├── ManagerDashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── DashboardWidget.tsx
│   │   └── RoleBasedLayout.tsx
│   ├── checkin/
│   │   ├── SmartCheckIn.tsx
│   │   ├── LocationValidator.tsx
│   │   ├── WiFiDetector.tsx
│   │   ├── FallbackCheckIn.tsx
│   │   ├── CheckInStatus.tsx
│   │   └── CheckInHistory.tsx
│   ├── leave/
│   │   ├── LeaveRequestForm.tsx
│   │   ├── LeaveRequestList.tsx
│   │   ├── LeaveCalendar.tsx
│   │   ├── LeaveBalance.tsx
│   │   ├── ManagerApproval.tsx
│   │   ├── BulkApproval.tsx
│   │   └── LeaveReports.tsx
│   ├── timesheets/
│   │   ├── TimesheetForm.tsx
│   │   ├── TimesheetGrid.tsx
│   │   ├── TimesheetEntry.tsx
│   │   ├── TimesheetSubmission.tsx
│   │   ├── TimesheetApproval.tsx
│   │   ├── BulkTimesheetApproval.tsx
│   │   └── TimesheetReports.tsx
│   ├── users/
│   │   ├── UserManagement.tsx
│   │   ├── UserForm.tsx
│   │   ├── RoleAssignment.tsx
│   │   ├── TeamView.tsx
│   │   └── BulkUserImport.tsx
│   ├── reports/
│   │   ├── ReportDashboard.tsx
│   │   ├── AttendanceReport.tsx
│   │   ├── LeaveReport.tsx
│   │   ├── TimesheetReport.tsx
│   │   ├── CustomReportBuilder.tsx
│   │   └── ReportExport.tsx
│   ├── notifications/
│   │   ├── NotificationCenter.tsx
│   │   ├── NotificationItem.tsx
│   │   ├── NotificationSettings.tsx
│   │   ├── RealTimeNotifications.tsx
│   │   └── NotificationHistory.tsx
│   └── shared/
│       ├── RoleBasedMenu.tsx
│       ├── PermissionWrapper.tsx
│       ├── ApprovalButton.tsx
│       ├── StatusBadge.tsx
│       ├── DateRangePicker.tsx
│       ├── LocationPicker.tsx
│       ├── FileUpload.tsx
│       └── DataTable.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── CheckIn.tsx
│   ├── Attendance.tsx
│   ├── Timesheets.tsx
│   ├── LeaveManagement.tsx
│   ├── UserManagement.tsx
│   ├── Reports.tsx
│   ├── Settings.tsx
│   └── Profile.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── usePermissions.ts
│   ├── useLocation.ts
│   ├── useWiFi.ts
│   ├── useTimesheets.ts
│   ├── useLeaveRequests.ts
│   ├── useApprovals.ts
│   ├── useNotifications.ts
│   ├── useReports.ts
│   └── useRealTime.ts
├── services/
│   ├── authService.ts
│   ├── locationService.ts
│   ├── wifiService.ts
│   ├── timesheetService.ts
│   ├── leaveService.ts
│   ├── approvalService.ts
│   ├── userService.ts
│   ├── reportService.ts
│   ├── notificationService.ts
│   └── realTimeService.ts
├── stores/
│   ├── authStore.ts
│   ├── userStore.ts
│   ├── checkInStore.ts
│   ├── timesheetStore.ts
│   ├── leaveStore.ts
│   ├── approvalStore.ts
│   ├── notificationStore.ts
│   └── settingsStore.ts
├── utils/
│   ├── permissions.ts
│   ├── roleHelpers.ts
│   ├── locationUtils.ts
│   ├── dateUtils.ts
│   ├── validationSchemas.ts
│   └── constants.ts
└── types/
├── auth.ts
├── user.ts
├── attendance.ts
├── timesheet.ts
├── leave.ts
├── approval.ts
├── notification.ts
└── common.ts


### Role-Based Navigation System

```typescript
// Role-based menu configuration
const ROLE_MENUS = {
  employee: [
    { path: '/dashboard', label: 'Dashboard', icon: 'home' },
    { path: '/checkin', label: 'Clock In/Out', icon: 'clock' },
    { path: '/attendance', label: 'My Attendance', icon: 'calendar' },
    { path: '/timesheets', label: 'Timesheets', icon: 'timesheet' },
    { path: '/leave', label: 'Apply Leave', icon: 'leave' },
    { path: '/profile', label: 'Profile', icon: 'user' }
  ],
  manager: [
    { path: '/dashboard', label: 'Manager Dashboard', icon: 'dashboard' },
    { path: '/team-attendance', label: 'Team Attendance', icon: 'team' },
    { path: '/approvals', label: 'Pending Approvals', icon: 'approval' },
    { path: '/timesheets', label: 'Team Timesheets', icon: 'timesheet' },
    { path: '/leave-management', label: 'Leave Management', icon: 'leave' },
    { path: '/team-reports', label: 'Team Reports', icon: 'reports' },
    { path: '/team-users', label: 'Team Members', icon: 'users' }
  ],
  admin: [
    { path: '/dashboard', label: 'Admin Dashboard', icon: 'admin' },
    { path: '/attendance', label: 'All Attendance', icon: 'calendar' },
    { path: '/timesheets', label: 'All Timesheets', icon: 'timesheet' },
    { path: '/leave-management', label: 'Leave Management', icon: 'leave' },
    { path: '/user-management', label: 'User Management', icon: 'users' },
    { path: '/reports', label: 'System Reports', icon: 'reports' },
    { path: '/settings', label: 'System Settings', icon: 'settings' }
  ]
};
```

## Enhanced N8N Workflow Architecture v3.0

### Smart Clock-In Workflow

```json
{
  "name": "Smart Clock-In Validation",
  "nodes": [
    {
      "name": "Clock-In Request",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "checkin/validate",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Validate WiFi Connection",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Check if user is connected to office WiFi\nconst wifiData = $json.wifiData;\nconst officeNetworks = $json.office.wifi_networks;\n\nconst isValidWiFi = officeNetworks.some(network => \n  network.ssid === wifiData.ssid && \n  network.bssid === wifiData.bssid\n);\n\nreturn { ...items[0].json, wifiValid: isValidWiFi };"
      }
    },
    {
      "name": "Validate Location",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Calculate distance from office\nconst userLat = $json.location.latitude;\nconst userLng = $json.location.longitude;\nconst officeLat = $json.office.latitude;\nconst officeLng = $json.office.longitude;\nconst radius = $json.office.geofence_radius;\n\n// Haversine formula for distance calculation\nconst distance = calculateDistance(userLat, userLng, officeLat, officeLng);\nconst locationValid = distance <= radius;\n\nreturn { ...items[0].json, locationValid, distance };"
      }
    },
    {
      "name": "Determine Check-In Method",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "condition1": "={{ $json.wifiValid && $json.locationValid }}",
              "condition2": "={{ !$json.wifiValid && $json.locationValid }}"
            }
          ]
        }
      }
    },
    {
      "name": "Primary Method Success",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "INSERT INTO check_in_records (user_id, office_id, check_in_time, check_in_method, location_data, wifi_data, verification_status) VALUES ($1, $2, NOW(), 'wifi_location', $3, $4, 'verified')"
      }
    },
    {
      "name": "Fallback Method Success",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "INSERT INTO check_in_records (user_id, office_id, check_in_time, check_in_method, location_data, verification_status) VALUES ($1, $2, NOW(), 'location_only', $3, 'verified')"
      }
    },
    {
      "name": "Send Success Notification",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Send real-time notification\nconst method = $json.check_in_method === 'wifi_location' ? 'WiFi + Location' : 'Location Only';\nreturn {\n  userId: $json.user_id,\n  type: 'check_in_success',\n  title: 'Clock-In Successful',\n  message: `Successfully clocked in using ${method} at ${$json.office.name}`,\n  timestamp: new Date().toISOString()\n};"
      }
    }
  ]
}
```

### Leave Approval Workflow

```json
{
  "name": "Multi-Level Leave Approval",
  "nodes": [
    {
      "name": "Leave Request Submitted",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "leave/submit",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Create Approval Workflow",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "INSERT INTO approval_workflows (entity_type, entity_id, workflow_type, total_steps, created_by) VALUES ('leave_request', $1, 'leave_approval', $2, $3) RETURNING id"
      }
    },
    {
      "name": "Determine Approval Chain",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Determine approval chain based on leave type and duration\nconst leaveType = $json.leave_type;\nconst totalDays = $json.total_days;\nconst userRole = $json.user.role;\n\nlet approvers = [];\n\n// Standard approval chain\napprovers.push($json.user.manager_id);\n\n// Additional approvals for extended leave\nif (totalDays > 5) {\n  approvers.push($json.user.hr_manager_id);\n}\n\n// Special approvals for certain leave types\nif (['maternity', 'paternity'].includes(leaveType)) {\n  approvers.push($json.hr_director_id);\n}\n\nreturn { ...items[0].json, approvers };"
      }
    },
    {
      "name": "Create Approval Steps",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "INSERT INTO approval_steps (workflow_id, step_number, approver_id) SELECT $1, generate_series(1, array_length($2, 1)), unnest($2)"
      }
    },
    {
      "name": "Notify First Approver",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Send notification to first approver\nreturn {\n  userId: $json.approvers[0],\n  type: 'approval_required',\n  title: 'Leave Approval Required',\n  message: `${$json.user.first_name} ${$json.user.last_name} has requested ${$json.leave_type} leave from ${$json.start_date} to ${$json.end_date}`,\n  entityType: 'leave_request',\n  entityId: $json.leave_request_id,\n  priority: 'high'\n};"
      }
    },
    {
      "name": "Send Email Notification",
      "type": "n8n-nodes-base.sendGrid",
      "parameters": {
        "subject": "Leave Approval Required - {{ $json.user.first_name }} {{ $json.user.last_name }}",
        "message": "A leave request requires your approval. Please log in to the system to review and approve."
      }
    }
  ]
}
```

### Timesheet Approval Workflow

```json
{
  "name": "Automated Timesheet Validation and Approval",
  "nodes": [
    {
      "name": "Timesheet Submitted",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "timesheets/submit",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Validate Against Check-In Records",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "SELECT te.*, cir.check_in_time, cir.check_out_time FROM timesheet_entries te LEFT JOIN check_in_records cir ON te.date = DATE(cir.check_in_time) AND cir.user_id = $1 WHERE te.timesheet_id = $2"
      }
    },
    {
      "name": "Calculate Discrepancies",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Calculate time discrepancies\nconst entries = $json;\nlet discrepancies = [];\n\nentries.forEach(entry => {\n  if (entry.check_in_time && entry.check_out_time) {\n    const actualHours = calculateHours(entry.check_in_time, entry.check_out_time);\n    const reportedHours = entry.total_hours;\n    const difference = Math.abs(actualHours - reportedHours);\n    \n    if (difference > 0.5) { // 30 minutes tolerance\n      discrepancies.push({\n        date: entry.date,\n        reported: reportedHours,\n        actual: actualHours,\n        difference: difference\n      });\n    }\n  }\n});\n\nreturn { ...items[0].json, discrepancies };"
      }
    },
    {
      "name": "Auto-Approve or Flag for Review",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "condition1": "={{ $json.discrepancies.length === 0 }}",
              "condition2": "={{ $json.discrepancies.length > 0 }}"
            }
          ]
        }
      }
    },
    {
      "name": "Auto-Approve Timesheet",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "UPDATE timesheets SET status = 'approved', approved_at = NOW(), approved_by = $1 WHERE id = $2"
      }
    },
    {
      "name": "Flag for Manager Review",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "query": "UPDATE timesheets SET status = 'pending' WHERE id = $1"
      }
    },
    {
      "name": "Notify Manager of Discrepancies",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "// Create detailed notification for manager\nreturn {\n  userId: $json.user.manager_id,\n  type: 'approval_required',\n  title: 'Timesheet Review Required',\n  message: `Timesheet for ${$json.user.first_name} ${$json.user.last_name} has ${$json.discrepancies.length} discrepancies that require review`,\n  entityType: 'timesheet',\n  entityId: $json.timesheet_id,\n  priority: 'medium',\n  metadata: { discrepancies: $json.discrepancies }\n};"
      }
    }
  ]
}
```

## Security and Compliance v3.0

### Enhanced Security Framework

#### Multi-Layer Authentication
- **Primary Authentication:** JWT tokens with role-based claims
- **Secondary Verification:** Device fingerprinting for location-based check-ins
- **Biometric Support:** Face ID/Touch ID integration for mobile devices
- **Emergency Access:** Secure override mechanisms for critical situations

#### Data Protection and Privacy
- **Location Data Encryption:** AES-256 encryption for all GPS coordinates
- **WiFi Data Security:** Hashed WiFi network identifiers
- **Personal Data Anonymization:** GDPR-compliant data anonymization
- **Right to be Forgotten:** Automated data deletion workflows

#### Audit and Compliance
- **Comprehensive Audit Trail:** Immutable logs for all user actions
- **Compliance Monitoring:** Real-time compliance status tracking
- **Automated Reporting:** Scheduled compliance reports
- **Data Retention Policies:** Configurable retention periods by data type

### Performance Optimization v3.0

#### Caching Strategy
- **Role-Based Caching:** Cache user permissions and role data
- **Location Caching:** Cache office coordinates and geofence data
- **Real-time Cache Invalidation:** Instant cache updates for role changes
- **CDN Integration:** Global content delivery for mobile users

#### Database Optimization
- **Read Replicas:** Dedicated replicas for reporting and analytics
- **Partitioning:** Time-based partitioning for attendance data
- **Indexing Strategy:** Optimized indexes for role-based queries
- **Connection Pooling:** Efficient database connection management

#### Mobile Performance
- **Progressive Web App:** Offline-first architecture
- **Service Workers:** Background sync for check-ins
- **Lazy Loading:** Role-based component loading
- **Image Optimization:** WebP support with fallbacks

## Migration Strategy v3.0

### Phase 1: Infrastructure and Security (Weeks 1-3)
- Deploy enhanced authentication system
- Implement role-based access control
- Set up WiFi and location validation services
- Configure audit and compliance monitoring

### Phase 2: Core Features (Weeks 4-6)
- Deploy smart clock-in system with fallback
- Implement comprehensive leave management
- Deploy enhanced timesheet system
- Set up approval workflow engine

### Phase 3: Advanced Features (Weeks 7-9)
- Deploy role-based dashboards
- Implement real-time notification system
- Deploy comprehensive reporting system
- Set up user management and bulk operations

### Phase 4: Optimization and Training (Weeks 10-12)
- Performance optimization and load testing
- User training and documentation
- System monitoring and alerting
- Go-live support and maintenance

---

*This comprehensive architecture document v3.0 provides the technical foundation for implementing a role-based attendance management system with smart clock-in functionality, comprehensive leave management, and advanced approval workflows. The architecture prioritizes security, scalability, user experience, and compliance while maintaining flexibility for future enhancements.*
