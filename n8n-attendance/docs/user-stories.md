# N8N Attendance Management System - User Stories v3.0

## Document Information
| Field | Value |
|-------|-------|
| **Document Type** | User Stories Document |
| **Version** | 3.0 |
| **Date** | January 2025 |
| **Based on** | Architecture Document v3.0, PRD v3.0 Enhanced |
| **Author** | Scrum Master |
| **Status** | Updated for Role-Based Access Control and Smart Clock-In System |

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| Jan 2025 | 1.0 | Initial user stories for Wi-Fi auto-detection system | Scrum Master |
| Jan 2025 | 1.1 | Added Epic 6: Office Locations Dropdown Management | Scrum Master |
| Jan 2025 | 2.0 | Complete redesign for location-based manual check-in, timesheet management, and approval workflows | Scrum Master |
| Jan 2025 | 3.0 | Role-based access control, smart clock-in (WiFi + location), enhanced leave management, role-specific dashboards | Scrum Master |

## User Personas

### Primary Users
- **Employee**: Regular staff member with access to personal attendance, leave requests, and timesheet management
- **Manager**: Team lead who manages team attendance, approves leave requests and timesheets, and accesses team reports
- **Admin**: System administrator with full access to all modules, user management, and system-wide reports

## Epic 1: Role-Based Access Control System

### Epic Description
Implement comprehensive role-based access control that provides tailored navigation and functionality based on user roles (Employee, Manager, Admin).

**Priority**: High
**Business Value**: Foundation for secure, role-appropriate system access

### User Stories

#### US-001: Employee Role Access Control
**As an** employee  
**I want to** access only the modules relevant to my role  
**So that** I have a clean, focused interface for my daily tasks

**Acceptance Criteria:**
- [ ] I can only see and access: Dashboard, Attendance (personal), Apply Leave, TimeSheets
- [ ] Navigation menu shows only my accessible modules
- [ ] Attempting to access restricted modules shows appropriate error message
- [ ] My role permissions are validated on every page load
- [ ] Role-based UI elements are hidden/shown appropriately

**Priority**: High
**Story Points**: 8

#### US-002: Manager Role Access Control
**As a** manager  
**I want to** access team management and approval modules  
**So that** I can effectively manage my team's attendance and requests

**Acceptance Criteria:**
- [ ] I can access: Manager Dashboard, Attendance (team), TimeSheets (approval), History, Users (team), Reports, Leave Management
- [ ] I can see team member data but not other teams' data
- [ ] Approval workflows are available for timesheets and leave requests
- [ ] Team-specific filters are applied automatically
- [ ] I can delegate approval permissions when needed

**Priority**: High
**Story Points**: 10

#### US-003: Admin Role Access Control
**As an** admin  
**I want to** have full system access and user management capabilities  
**So that** I can configure and maintain the entire system

**Acceptance Criteria:**
- [ ] I can access all modules: Dashboard, Attendance, TimeSheets, History, Leave Management, Users, Reports
- [ ] I can view and manage all users across all teams
- [ ] I can configure system settings and office locations
- [ ] I can access audit logs and compliance reports
- [ ] I can manage user roles and permissions
- [ ] I can access system-wide analytics and reports

**Priority**: High
**Story Points**: 12

## Epic 2: Smart Clock-In System (WiFi + Location)

### Epic Description
Implement intelligent clock-in system using WiFi network detection combined with location verification, with automatic fallback to location-only when WiFi is unavailable.

**Priority**: High
**Business Value**: Enhanced accuracy and reliability of attendance tracking

### User Stories

#### US-004: WiFi + Location Smart Clock-In
**As an** employee  
**I want to** clock in using both WiFi and location detection  
**So that** my attendance is accurately verified with multiple validation methods

**Acceptance Criteria:**
- [ ] System detects when I'm connected to office WiFi network
- [ ] System simultaneously verifies my GPS location within office boundaries
- [ ] Clock-in button becomes active only when both conditions are met
- [ ] Real-time status indicators show WiFi and location connectivity
- [ ] Clock-in records both WiFi network name and GPS coordinates
- [ ] I receive immediate confirmation with validation details

**Priority**: High
**Story Points**: 13

#### US-005: Location-Only Fallback Clock-In
**As an** employee  
**I want to** clock in using location-only when WiFi is unavailable  
**So that** I can still record attendance even with WiFi connectivity issues

**Acceptance Criteria:**
- [ ] System automatically switches to location-only mode when WiFi is unavailable
- [ ] Clear visual indication shows fallback mode is active
- [ ] GPS/geofencing verification works within office boundaries
- [ ] Fallback mode is clearly marked in attendance records
- [ ] System automatically switches back to primary mode when WiFi returns
- [ ] Admin can view reports on fallback usage patterns

**Priority**: High
**Story Points**: 10

#### US-006: Real-Time Connectivity Status
**As an** employee  
**I want to** see real-time WiFi and location status  
**So that** I know when I can successfully clock in

**Acceptance Criteria:**
- [ ] Dashboard shows current WiFi connection status
- [ ] Dashboard shows current location verification status
- [ ] Status indicators update in real-time
- [ ] Distance to office boundary is displayed when outside
- [ ] WiFi network name is shown when connected to office network
- [ ] Clear messaging explains why clock-in is/isn't available

**Priority**: Medium
**Story Points**: 8

## Epic 3: Enhanced Leave Management System

### Epic Description
Comprehensive leave management system with multiple leave types, approval workflows, calendar integration, and manager delegation capabilities.

**Priority**: High
**Business Value**: Streamlined leave processes and improved team planning

### User Stories

#### US-007: Employee Leave Request Submission
**As an** employee  
**I want to** submit leave requests with comprehensive details  
**So that** my manager has all necessary information for approval

**Acceptance Criteria:**
- [ ] I can select from multiple leave types (Annual, Sick, Personal, Maternity, etc.)
- [ ] Calendar integration allows easy date selection
- [ ] System shows my current leave balance for each type
- [ ] I can attach supporting documents (medical certificates, etc.)
- [ ] I can add detailed notes explaining the leave request
- [ ] System validates leave balance before submission
- [ ] I receive confirmation with request tracking number

**Priority**: High
**Story Points**: 10

#### US-008: Manager Leave Approval Workflow
**As a** manager  
**I want to** review and approve team leave requests efficiently  
**So that** I can maintain proper team coverage and planning

**Acceptance Criteria:**
- [ ] I can see all pending leave requests from my team
- [ ] Team calendar view shows existing leave and conflicts
- [ ] I can approve, reject, or request more information
- [ ] I can add comments explaining approval decisions
- [ ] Bulk approval capabilities for multiple requests
- [ ] System sends automatic notifications to employees
- [ ] I can delegate approval authority when I'm unavailable

**Priority**: High
**Story Points**: 12

#### US-009: Leave Calendar and Team Planning
**As a** manager  
**I want to** view team leave in a calendar format  
**So that** I can plan for adequate team coverage

**Acceptance Criteria:**
- [ ] Calendar view shows approved leave for all team members
- [ ] Pending requests are clearly distinguished from approved leave
- [ ] I can see team coverage levels for each day
- [ ] Calendar highlights potential understaffing periods
- [ ] I can export calendar data for planning purposes
- [ ] Integration with company holiday calendar

**Priority**: Medium
**Story Points**: 8

## Epic 4: Role-Specific Dashboard Experiences

### Epic Description
Tailored dashboard experiences for each user role with relevant information, quick actions, and real-time status updates.

**Priority**: High
**Business Value**: Improved user experience and productivity

### User Stories

#### US-010: Employee Dashboard
**As an** employee  
**I want to** have a personalized dashboard with my attendance information  
**So that** I can quickly access my daily tasks and status

**Acceptance Criteria:**
- [ ] Real-time clock-in/clock-out status with smart button
- [ ] Today's work hours and break time tracking
- [ ] Current WiFi and location connectivity status
- [ ] Quick access to recent timesheets and leave requests
- [ ] Upcoming leave and important notifications
- [ ] Personal attendance statistics and trends
- [ ] Quick links to frequently used functions

**Priority**: High
**Story Points**: 10

#### US-011: Manager Dashboard
**As a** manager  
**I want to** have a team-focused dashboard with approval queues  
**So that** I can efficiently manage my team's attendance and requests

**Acceptance Criteria:**
- [ ] Team attendance overview with real-time status
- [ ] Pending approval queues (timesheets, leave requests)
- [ ] Team performance metrics and trends
- [ ] Quick approval actions directly from dashboard
- [ ] Team calendar with upcoming leave and events
- [ ] Alerts for overdue approvals or attendance issues
- [ ] Direct access to team reports and analytics

**Priority**: High
**Story Points**: 12

#### US-012: Admin Dashboard
**As an** admin  
**I want to** have a system-wide overview dashboard  
**So that** I can monitor system health and user activity

**Acceptance Criteria:**
- [ ] System-wide attendance statistics and trends
- [ ] User activity monitoring and login analytics
- [ ] System performance metrics and alerts
- [ ] Recent user registrations and role changes
- [ ] Compliance reports and audit trail summaries
- [ ] Quick access to user management and system configuration
- [ ] Integration status with external systems (N8N, payroll)

**Priority**: High
**Story Points**: 10

## Epic 5: Enhanced Timesheet Management

### Epic Description
Advanced timesheet management with automatic population, approval workflows, and integration with payroll systems.

**Priority**: Medium
**Business Value**: Accurate time tracking and streamlined payroll processing

### User Stories

#### US-013: Employee Timesheet Creation
**As an** employee  
**I want to** create and submit timesheets with automatic data population  
**So that** my work hours are accurately recorded for payroll

**Acceptance Criteria:**
- [ ] Timesheets auto-populate from clock-in/clock-out data
- [ ] I can manually adjust entries with explanatory notes
- [ ] I can add project codes and task descriptions
- [ ] System validates total hours against attendance records
- [ ] I can save drafts and submit when complete
- [ ] I receive confirmation of successful submission

**Priority**: Medium
**Story Points**: 8

#### US-014: Manager Timesheet Approval
**As a** manager  
**I want to** review and approve team timesheets  
**So that** accurate payroll processing can occur

**Acceptance Criteria:**
- [ ] I can see all submitted timesheets from my team
- [ ] Side-by-side comparison with attendance records
- [ ] I can approve, reject, or request corrections
- [ ] Bulk approval capabilities for efficiency
- [ ] I can add comments for rejected timesheets
- [ ] Approved timesheets are automatically sent to payroll

**Priority**: Medium
**Story Points**: 10

## Epic 6: Comprehensive Reporting System

### Epic Description
Advanced reporting and analytics capabilities for managers and admins with customizable reports and data export options.

**Priority**: Medium
**Business Value**: Data-driven insights for better workforce management

### User Stories

#### US-015: Manager Team Reports
**As a** manager  
**I want to** generate comprehensive team reports  
**So that** I can analyze team performance and attendance patterns

**Acceptance Criteria:**
- [ ] Attendance summary reports for my team
- [ ] Leave utilization and balance reports
- [ ] Overtime and work pattern analysis
- [ ] Customizable date ranges and filters
- [ ] Export capabilities (PDF, Excel, CSV)
- [ ] Scheduled report delivery via email

**Priority**: Medium
**Story Points**: 8

#### US-016: Admin System-Wide Reports
**As an** admin  
**I want to** generate system-wide analytics and compliance reports  
**So that** I can ensure system compliance and optimize operations

**Acceptance Criteria:**
- [ ] Company-wide attendance and leave analytics
- [ ] Compliance reports for labor law requirements
- [ ] System usage and performance reports
- [ ] User activity and security audit reports
- [ ] Custom report builder with drag-and-drop interface
- [ ] Automated report scheduling and distribution

**Priority**: Medium
**Story Points**: 12

## Epic 7: Technical Infrastructure

### Epic Description
Technical user stories for WiFi detection, security enhancements, mobile optimization, and system integration.

**Priority**: Medium
**Business Value**: Robust technical foundation and enhanced user experience

### User Stories

#### US-017: WiFi Network Detection and Management
**As a** system  
**I need to** detect and manage office WiFi networks  
**So that** accurate WiFi-based clock-in validation can occur

**Acceptance Criteria:**
- [ ] System can detect connected WiFi network SSID
- [ ] Admin can configure authorized office WiFi networks
- [ ] System handles multiple office locations with different networks
- [ ] WiFi detection works across different device types
- [ ] Fallback mechanisms when WiFi detection fails
- [ ] Security measures to prevent WiFi spoofing

**Priority**: Medium
**Story Points**: 10

#### US-018: Enhanced Security and Privacy
**As a** system  
**I need to** implement enhanced security measures  
**So that** user data and location information are protected

**Acceptance Criteria:**
- [ ] End-to-end encryption for location and WiFi data
- [ ] Role-based API security with JWT tokens
- [ ] Data anonymization for analytics and reporting
- [ ] Audit trail for all user actions and data access
- [ ] GDPR compliance for location data handling
- [ ] Secure data transmission and storage

**Priority**: Medium
**Story Points**: 12

#### US-019: Mobile PWA Optimization
**As a** mobile user  
**I want to** use the system as a Progressive Web App  
**So that** I have a native app-like experience with offline capabilities

**Acceptance Criteria:**
- [ ] PWA installation prompts on mobile devices
- [ ] Offline capability for viewing attendance history
- [ ] Background sync when connection is restored
- [ ] Push notifications for important updates
- [ ] Optimized mobile UI with touch-friendly controls
- [ ] Fast loading and smooth performance on mobile

**Priority**: Medium
**Story Points**: 10

## Sprint Planning and Estimation

### Story Point Summary
- **Epic 1 (Role-Based Access)**: 30 points
- **Epic 2 (Smart Clock-In)**: 31 points
- **Epic 3 (Leave Management)**: 30 points
- **Epic 4 (Role-Specific Dashboards)**: 32 points
- **Epic 5 (Timesheet Management)**: 18 points
- **Epic 6 (Reporting System)**: 20 points
- **Epic 7 (Technical Infrastructure)**: 32 points

**Total Story Points**: 193 points

### Recommended Sprint Plan (2-week sprints, 20 points per sprint)

**Sprint 1-2 (Foundation)**: Role-Based Access Control (US-001, US-002, US-003)
**Sprint 3-4 (Core Functionality)**: Smart Clock-In System (US-004, US-005, US-006)
**Sprint 5-6 (Leave Management)**: Leave Request and Approval (US-007, US-008, US-009)
**Sprint 7-8 (User Experience)**: Role-Specific Dashboards (US-010, US-011, US-012)
**Sprint 9 (Timesheet)**: Timesheet Management (US-013, US-014)
**Sprint 10 (Analytics)**: Reporting System (US-015, US-016)
**Sprint 11-12 (Technical)**: Infrastructure and Security (US-017, US-018, US-019)

### Definition of Done
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing (minimum 80% coverage)
- [ ] Integration tests passing
- [ ] Security review completed
- [ ] Performance testing completed
- [ ] Documentation updated
- [ ] User acceptance testing completed
- [ ] Deployed to staging environment
- [ ] Product owner approval received

### Risk Mitigation
- **Technical Risk**: WiFi detection complexity - Prototype early and have fallback plans
- **User Adoption Risk**: Role transition - Provide comprehensive training and gradual rollout
- **Performance Risk**: Real-time features - Implement caching and optimization strategies
- **Security Risk**: Location data - Implement privacy-by-design principles