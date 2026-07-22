# N8N Attendance Management System - Product Requirements Document (PRD)

## Document Information
| Field | Value |
|-------|-------|
| **Document Type** | Product Requirements Document |
| **Version** | 2.0 |
| **Date** | January 2025 |
| **Author** | Mary (Business Analyst) |
| **Status** | Draft |

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| Jan 2025 | 1.0 | Initial PRD creation | Mary |
| Jan 2025 | 1.1 | Added office locations dropdown functionality (FR13) | Mary |
| Jan 2025 | 2.0 | Updated to location-based manual check-in, added timesheet and leave approval workflows | Mary |

## Goals and Background Context

### Goals
- Automate attendance tracking for 30 employees across multiple offices
- Eliminate manual attendance processes and reduce administrative overhead
- Provide real-time attendance visibility for managers and employees
- Ensure accurate tracking of work hours, breaks, and overtime
- Support BYOD policy with secure device registration
- Maintain compliance with labor regulations and data privacy standards

### Background Context

The organization currently relies on manual attendance tracking methods that are prone to errors, time-consuming, and lack real-time visibility. With 30 employees distributed across multiple office locations, there's a critical need for an automated, reliable attendance management system.

The solution leverages n8n workflow automation platform to create a comprehensive attendance system that uses Wi-Fi network detection for location-based attendance marking, provides a user-friendly portal for attendance management, and integrates with existing infrastructure.

## Requirements

### Functional Requirements

**FR1:** Location-Based Manual Check-in System
- Users must manually check-in/check-out when physically present at office premises
- System uses GPS/geofencing to verify user location within office boundaries
- Check-in only allowed when user is within designated office geofence radius
- Support for multiple office locations with different GPS coordinates
- Manual check-in button becomes active only when location requirements are met
- Real-time location verification with fallback options for GPS issues
- Location accuracy validation to prevent remote check-ins
- Check-in/check-out timestamps recorded with location coordinates

<!-- **FR2:** Wi-Fi Based Attendance Detection (COMMENTED OUT - FUTURE IMPLEMENTATION)
- System must automatically detect when registered devices connect to office Wi-Fi networks
- Support for multiple office locations with different Wi-Fi SSIDs
- Automatic attendance marking when device connects during work hours (9 AM - 6 PM)
- Grace period handling for late arrivals and early departures
-->

**FR2:** Device Registration System
- Users must be able to register up to 3 personal devices (BYOD policy)
- Each device registration requires device ID, MAC address, and user verification
- System must validate device uniqueness and prevent duplicate registrations
- Admin approval workflow for new device registrations

**FR3:** Timesheet Management System
- Employees can create and submit weekly/monthly timesheets
- Timesheet includes daily work hours, break times, and project allocations
- Integration with check-in/check-out data for automatic time calculation
- Manual time entry option for corrections and adjustments
- Timesheet submission workflow with deadline management
- Manager approval required before timesheet finalization
- Approval workflow with comments and revision requests
- Automated reminders for timesheet submission and approval
- Historical timesheet access and reporting

**FR4:** Leave Request and Approval System
- Comprehensive leave request submission interface
- Multiple leave types (vacation, sick, personal, emergency)
- Leave balance tracking and validation
- Calendar integration for leave planning
- Manager approval workflow with notification system
- Approval/rejection with comments and feedback
- Leave calendar view for team planning
- Integration with timesheet system for leave day handling
- Automated leave balance calculations and updates

**FR5:** Manager Approval Dashboard
- Centralized dashboard for all pending approvals
- Timesheet approval interface with detailed review capabilities
- Leave request approval with team calendar view
- Bulk approval options for efficiency
- Approval history and audit trail
- Team overview with attendance and leave status
- Notification management for pending approvals
- Delegation capabilities for approval authority

**FR6:** Enhanced Notification System
- Real-time notifications for check-in/check-out events
- Timesheet submission and approval notifications
- Leave request status updates
- Manager notifications for pending approvals
- Email and in-app notification preferences
- Escalation notifications for overdue approvals
- Daily/weekly summary notifications

**FR3:** Daily Attendance Reset
- Automated daily reset of attendance status at 6:00 AM
- Clear distinction between previous day and current day attendance
- Handling of overnight workers and shift transitions

**FR4:** Break Time Management
- Track break periods during work hours
- Configurable break duration limits
- Automatic break detection when device disconnects from Wi-Fi
- Break time deduction from total work hours

**FR5:** Overtime Tracking
- Automatic detection of work beyond standard hours (after 6 PM)
- Overtime calculation and reporting
- Manager approval workflow for overtime hours
- Integration with payroll systems for overtime compensation

**FR6:** User Portal
- Web-based portal for employees to view their attendance records
- Real-time attendance status display
- Historical attendance data with filtering and search capabilities
- Monthly and weekly attendance summaries
- Leave request integration

**FR7:** Administrative Dashboard
- Manager dashboard with team attendance overview
- Real-time attendance monitoring across all locations
- Attendance reports and analytics
- Device management and approval interface
- User management and role assignment

**FR8:** Notification System
- Real-time notifications for attendance events (check-in, check-out, breaks)
- Email/SMS alerts for attendance anomalies
- Manager notifications for overtime and extended breaks
- Daily attendance summary notifications

**FR9:** Data Export and Reporting
- Export attendance data in multiple formats (CSV, PDF, Excel)
- Customizable report generation
- Integration with existing HR systems
- Compliance reporting for labor regulations

**FR10:** Multi-Location Support
- Support for multiple office locations
- Location-specific attendance policies
- Cross-location employee movement tracking
- Centralized management with location-based access controls

**FR11:** Administrative Configuration Panel
- Centralized admin interface for configuring system-wide attendance policies
- Configurable standard working hours (start time, end time, total hours)
- Flexible break time policies (duration, frequency, mandatory vs optional)
- Overtime calculation rules and thresholds
- Grace period settings for late arrivals and early departures
- Holiday and leave day configuration
- Location-specific policy overrides
- Notification settings and escalation rules
- User role and permission management
- Wi-Fi network configuration for multiple office locations

**FR12:** Policy Template Management
- Pre-defined policy templates for different employee types (full-time, part-time, contractors)
- Custom policy creation and assignment
- Bulk policy updates and rollouts
- Policy versioning and change tracking
- Approval workflow for policy changes

**FR13:** Office Locations Dropdown Management
- Centralized office locations management with dropdown interface
- Employees and managers can directly select their current office location without transfer requests
- Real-time office location selection for immediate attendance tracking
- Location dropdown populated from active office locations database
- Automatic location assignment for attendance records based on user selection
- Location change history tracking for audit purposes
- Integration with existing location-based policies and Wi-Fi detection
- Support for temporary location changes without formal transfer process
- Location-specific working hours and policies automatically applied
- Manager visibility into team location distribution across offices
- Admin interface for managing office locations (add, edit, deactivate)
- Location-based reporting and analytics
- Mobile-responsive dropdown interface for on-the-go location updates

### Non-Functional Requirements

**NFR1:** Performance
- System must handle 30 concurrent users with sub-2 second response times
- Real-time attendance updates within 30 seconds of Wi-Fi connection
- 99.5% uptime availability during business hours
- Database queries must execute within 1 second for standard operations

**NFR2:** Security and Privacy
- End-to-end encryption for all data transmission
- Secure storage of personal and attendance data
- Role-based access control (RBAC) implementation
- GDPR compliance for data handling and user rights
- Regular security audits and vulnerability assessments

**NFR3:** Scalability
- Architecture must support scaling to 100+ users without performance degradation
- Horizontal scaling capability for increased load
- Efficient database design for large attendance datasets
- Cloud-native deployment for elastic scaling

**NFR4:** Reliability
- Automated backup and disaster recovery procedures
- Fault tolerance for network connectivity issues
- Data integrity validation and error handling
- Graceful degradation during system maintenance

**NFR5:** Usability
- Intuitive user interface requiring minimal training
- Mobile-responsive design for various device types
- Accessibility compliance (WCAG 2.1 AA standards)
- Multi-language support for diverse workforce

**NFR6:** Integration
- RESTful API for third-party system integration
- Webhook support for real-time data synchronization
- Standard data formats for import/export operations
- Compatibility with existing HR and payroll systems

**NFR7:** Compliance
- Adherence to local labor law requirements
- Data retention policies aligned with legal requirements
- Audit trail for all attendance modifications
- Privacy controls for employee data access

## User Interface Design Goals

### Overall UX Vision
Create a clean, intuitive interface that minimizes friction in daily attendance interactions while providing comprehensive visibility into attendance data. The design should feel modern and professional, reflecting the organization's commitment to digital transformation.

### Key Interaction Paradigms
- **Dashboard-First Approach:** Primary interface shows current status and key metrics at a glance
- **Progressive Disclosure:** Advanced features accessible through clear navigation without cluttering main views
- **Real-Time Updates:** Live data updates without requiring page refreshes
- **Mobile-First Design:** Optimized for mobile devices while maintaining desktop functionality

### Core Screens and Views
1. **Employee Dashboard:** Current attendance status, location-based check-in button, timesheet summary, leave balance
2. **Location Check-in:** GPS-enabled check-in interface with location verification
3. **Timesheet Management:** Create, edit, and submit timesheets with approval status
4. **Leave Management:** Submit leave requests, view leave calendar, track approvals
5. **Manager Dashboard:** Team overview, pending approvals, attendance analytics
6. **Approval Interface:** Review and approve timesheets and leave requests
7. **Admin Panel:** System configuration, user management, location settings

### Accessibility
**WCAG AA Compliance:** Full compliance with Web Content Accessibility Guidelines 2.1 AA standards, including keyboard navigation, screen reader support, and appropriate color contrast ratios.

### Target Platforms
**Web Responsive:** Primary platform with full functionality across desktop and mobile browsers, optimized for both touch and mouse interactions.

## Technical Assumptions

### Repository Structure
**Monorepo:** Single repository containing all components (n8n workflows, database schemas, web portal, documentation) for simplified development and deployment coordination.

### Architecture
**Serverless:** Leverage n8n Cloud's serverless architecture with supporting cloud services for database, authentication, and file storage to minimize infrastructure management overhead.

### Technology Stack
- **Workflow Engine:** n8n Cloud for core attendance logic and automation
- **Database:** PostgreSQL for reliable data storage with ACID compliance
- **Frontend:** React.js with responsive design framework
- **Authentication:** OAuth 2.0 with multi-factor authentication support
- **Location Services:** Google Maps API for GPS and geofencing
- **Notifications:** Firebase Cloud Messaging for real-time notifications
- **Hosting:** Cloud-based deployment (AWS/Azure) for scalability and reliability
- **API:** RESTful services with OpenAPI documentation

### Integration Requirements
- **Wi-Fi Infrastructure:** Integration with Airtel Wi-Fi network management
- **Device Detection:** Network-based device identification and tracking
- **Email/SMS:** Third-party services for notification delivery
- **HR Systems:** API integration capabilities for data synchronization

### Development Approach
- **Agile Methodology:** Iterative development with 2-week sprints
- **Testing Strategy:** Comprehensive unit, integration, and user acceptance testing
- **Documentation:** Inline code documentation and user guides
- **Version Control:** Git-based workflow with feature branching

## Success Metrics and KPIs

### Primary Success Metrics
- **Attendance Accuracy:** 99%+ accurate attendance recording
- **User Adoption:** 95%+ employee usage within 30 days
- **Time Savings:** 80% reduction in manual attendance processing time
- **System Reliability:** 99.5% uptime during business hours
- **Location Accuracy:** 95%+ accurate location tracking and reporting

### User Experience Metrics
- **Portal Usage:** Daily active users > 90% of workforce
- **User Satisfaction:** 4.5+ rating in user feedback surveys
- **Support Tickets:** < 5 tickets per month after initial deployment
- **Training Time:** < 30 minutes required for new user onboarding
- **Location Update Frequency:** Average 2+ location updates per user per week

### Business Impact Metrics
- **Administrative Efficiency:** 70% reduction in HR attendance-related tasks
- **Compliance:** 100% adherence to labor law reporting requirements
- **Cost Savings:** ROI positive within 6 months of deployment
- **Data Accuracy:** 95%+ accuracy in payroll attendance data

## Constraints and Assumptions

### Technical Constraints
- Must work within existing Airtel Wi-Fi infrastructure
- Limited to n8n Cloud platform capabilities and limitations
- BYOD policy requires support for diverse device types and operating systems
- Integration with existing HR systems may have API limitations

### Business Constraints
- 30-person organization with potential for growth to 50+ employees
- Multi-location deployment across different office sites
- Budget constraints favor cloud-based solutions over on-premise infrastructure
- Implementation timeline of 8-12 weeks for full deployment

### Regulatory Constraints
- Compliance with local labor laws and regulations
- Data privacy requirements (GDPR, local privacy laws)
- Employee consent requirements for location and device tracking
- Audit trail requirements for attendance modifications

## Risk Assessment

### Technical Risks
- **Wi-Fi Reliability:** Network outages could impact attendance tracking
- **Device Compatibility:** BYOD policy may introduce device-specific issues
- **n8n Platform Limitations:** Potential constraints in workflow complexity
- **Data Migration:** Risk during transition from manual to automated system

### Business Risks
- **User Resistance:** Employees may resist automated tracking
- **Privacy Concerns:** Device tracking may raise privacy issues
- **Compliance Gaps:** Potential misalignment with evolving labor regulations
- **Vendor Dependency:** Reliance on n8n Cloud platform availability

### Mitigation Strategies
- Comprehensive user training and change management program
- Clear privacy policies and employee consent processes
- Regular compliance reviews and legal consultation
- Backup attendance recording procedures for system outages
- Phased rollout to identify and address issues early

## Next Steps

1. **Architecture Review:** Technical architect to review and validate technical assumptions
2. **Detailed Design:** Create detailed system architecture and database design
3. **Prototype Development:** Build proof-of-concept for core attendance tracking
4. **User Testing:** Conduct usability testing with representative users
5. **Security Review:** Comprehensive security assessment and penetration testing
6. **Deployment Planning:** Create detailed deployment and rollout strategy
7. **Training Development:** Create user training materials and documentation

---

*This PRD serves as the foundation for the N8N Attendance Management System development. It should be reviewed and approved by stakeholders before proceeding to the architecture and development phases.*