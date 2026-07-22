import React, { useState, useEffect } from 'react';
import { useLeaveStore } from '../stores/leaveStore';
import { useAuthStore } from '../stores/authStore';
import { LeaveRequest, LeaveRequestWithDetails } from '../types/leave';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isWithinInterval,
  parseISO
} from 'date-fns';
import { Alert, AlertDescription } from './ui/Alert';
import { Badge } from './ui/Badge';
import { AlertTriangle, Users, TrendingDown, TrendingUp } from 'lucide-react';
import { holidayService } from '../services/holidayService';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  leaveRequests: LeaveRequestWithDetails[];
  coverageLevel: 'critical' | 'low' | 'adequate' | 'good';
  availableStaff: number;
  totalStaff: number;
  coveragePercentage: number;
  holidays: CompanyHoliday[];
  alerts: CoverageAlert[]; // Add this missing property
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department?: string;
  role?: string;
}

// Enhanced interfaces for better coverage tracking
interface CompanyHoliday {
  id: string;
  name: string;
  date: string;
  type: 'public' | 'company' | 'floating' | 'optional';
  description?: string;
  is_recurring: boolean;
  office_location?: string;
}

interface CoverageAlert {
  date: Date;
  level: 'critical' | 'warning' | 'info';
  message: string;
  affectedDepartments: string[];
  availableStaff: number;
  totalStaff: number;
  severity: number; // 1-10 scale
  recommendations: string[];
  criticalRolesAffected: string[];
}

interface DepartmentCoverage {
  department: string;
  totalStaff: number;
  availableStaff: number;
  coveragePercentage: number;
  criticalRoles: string[];
  criticalRolesAvailable: number;
  trend: 'improving' | 'declining' | 'stable';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  upcomingLeave: number; // next 7 days
}

interface CoverageTrend {
  date: Date;
  coveragePercentage: number;
  criticalDays: number;
  warningDays: number;
}

const TeamLeaveCalendar: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    leaveRequests, 
    loading, 
    error, 
    fetchLeaveRequests 
  } = useLeaveStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'team' | 'coverage'>('month');
  const [selectedTeamMember, setSelectedTeamMember] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [coverageAlerts, setCoverageAlerts] = useState<CoverageAlert[]>([]);
  const [departmentCoverage, setDepartmentCoverage] = useState<DepartmentCoverage[]>([]);
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);

  // Mock team data - in real implementation, this would come from an API
  const mockTeamData = {
    totalStaff: 25,
    departments: {
      'Engineering': { total: 10, critical: ['Senior Developer', 'Tech Lead'] },
      'Marketing': { total: 6, critical: ['Marketing Manager'] },
      'Sales': { total: 5, critical: ['Sales Manager'] },
      'HR': { total: 4, critical: ['HR Manager'] }
    }
  };

  // Calculate coverage level based on available staff percentage
  const calculateCoverageLevel = (availableStaff: number, totalStaff: number): CalendarDay['coverageLevel'] => {
    const percentage = (availableStaff / totalStaff) * 100;
    if (percentage < 60) return 'critical';
    if (percentage < 75) return 'low';
    if (percentage < 90) return 'adequate';
    return 'good';
  };

  // Get coverage color based on level
  const getCoverageColor = (level: CalendarDay['coverageLevel']) => {
    switch (level) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'low': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'adequate': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'good': return 'bg-green-100 border-green-300 text-green-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  // Calculate department coverage for a specific date
  const calculateDepartmentCoverage = (date: Date): DepartmentCoverage[] => {
    const dayRequests = leaveRequests.filter(request => {
      const requestStart = parseISO(request.startDate);
      const requestEnd = parseISO(request.endDate);
      return isWithinInterval(date, { start: requestStart, end: requestEnd }) && 
             request.status === 'approved';
    });
    
    // Calculate upcoming leave for next 7 days
    const upcomingRequests = leaveRequests.filter(request => {
      const requestStart = parseISO(request.startDate);
      const requestEnd = parseISO(request.endDate);
      const nextWeek = addDays(date, 7);
      return isWithinInterval(nextWeek, { start: requestStart, end: requestEnd }) && 
             request.status === 'approved';
    });
  
    return Object.entries(mockTeamData.departments).map(([dept, data]) => {
      const deptRequests = dayRequests.filter(req => {
        // Check if user has department property or find it in teamMembers
        const userDepartment = req.user?.department || 
          teamMembers.find(m => m.id === req.userId)?.department;
        return userDepartment === dept;
      });
      
      const upcomingDeptRequests = upcomingRequests.filter(req => {
        const userDepartment = req.user?.department || 
          teamMembers.find(m => m.id === req.userId)?.department;
        return userDepartment === dept;
      });
      
      const availableStaff = data.total - deptRequests.length;
      const coveragePercentage = (availableStaff / data.total) * 100;
      
      // Calculate critical roles availability
      const criticalRolesAffected = deptRequests.filter(req => 
        data.critical.includes(req.user?.role || '')
      ).length;
      const criticalRolesAvailable = data.critical.length - criticalRolesAffected;
      
      // Calculate trend (simplified - in real app, use historical data)
      const trend: 'improving' | 'declining' | 'stable' = 
        coveragePercentage > 80 ? 'improving' : 
        coveragePercentage < 60 ? 'declining' : 'stable';
      
      // Calculate risk level
      const riskLevel: 'low' | 'medium' | 'high' | 'critical' = 
        coveragePercentage < 50 || criticalRolesAvailable === 0 ? 'critical' :
        coveragePercentage < 60 || criticalRolesAvailable < data.critical.length * 0.5 ? 'high' :
        coveragePercentage < 75 ? 'medium' : 'low';
      
      return {
        department: dept,
        totalStaff: data.total,
        availableStaff,
        coveragePercentage,
        criticalRoles: data.critical,
        criticalRolesAvailable,
        trend,
        riskLevel,
        upcomingLeave: upcomingDeptRequests.length
      };
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
  setCurrentDate(prevDate => 
    direction === 'prev' ? subMonths(prevDate, 1) : addMonths(prevDate, 1)
  );
};

// Add the missing filteredRequests variable
const filteredRequests = leaveRequests.filter(request => {
  if (selectedTeamMember && request.userId !== selectedTeamMember) {
    return false;
  }
  return true;
});

// Move helper functions inside the component
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'approved':
      return 'bg-green-100 border-green-300 text-green-800';
    case 'pending':
      return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    case 'rejected':
      return 'bg-red-100 border-red-300 text-red-800';
    case 'cancelled':
      return 'bg-gray-100 border-gray-300 text-gray-800';
    default:
      return 'bg-gray-100 border-gray-300 text-gray-800';
  }
};

const getLeaveTypeColor = (leaveType: string) => {
  switch (leaveType.toLowerCase()) {
    case 'annual':
    case 'vacation':
      return 'bg-blue-500';
    case 'sick':
      return 'bg-red-500';
    case 'personal':
      return 'bg-purple-500';
    case 'maternity':
    case 'paternity':
      return 'bg-pink-500';
    case 'emergency':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
};

  // Generate coverage alerts for the month
  const generateCoverageAlerts = (days: CalendarDay[]): CoverageAlert[] => {
    const alerts: CoverageAlert[] = [];
    
    days.forEach(day => {
      if (!day.isCurrentMonth) return;
      
      const deptCoverage = calculateDepartmentCoverage(day.date);
      const criticalDepts = deptCoverage.filter(dept => dept.coveragePercentage < 60);
      const lowCoverageDepts = deptCoverage.filter(dept => 
        dept.coveragePercentage >= 60 && dept.coveragePercentage < 75
      );
      
      if (criticalDepts.length > 0) {
        // Find critical roles affected
        const criticalRolesAffected = criticalDepts.flatMap(dept => 
          dept.criticalRoles || []
        );
        
        alerts.push({
          date: day.date,
          level: 'critical',
          message: `Critical understaffing in ${criticalDepts.map(d => d.department).join(', ')}`,
          affectedDepartments: criticalDepts.map(d => d.department),
          availableStaff: day.availableStaff,
          totalStaff: day.totalStaff,
          severity: 9,
          recommendations: [
            'Consider emergency staffing arrangements',
            'Contact backup personnel immediately',
            'Review critical operations for potential delays',
            'Implement contingency plans'
          ],
          criticalRolesAffected
        });
      } else if (lowCoverageDepts.length > 0) {
        alerts.push({
          date: day.date,
          level: 'warning',
          message: `Low coverage in ${lowCoverageDepts.map(d => d.department).join(', ')}`,
          affectedDepartments: lowCoverageDepts.map(d => d.department),
          availableStaff: day.availableStaff,
          totalStaff: day.totalStaff,
          severity: 6,
          recommendations: [
            'Monitor situation closely',
            'Prepare backup staffing options',
            'Consider rescheduling non-critical tasks'
          ],
          criticalRolesAffected: []
        });
      }
    });
    
    return alerts;
  };

// Add holiday interface
interface CompanyHoliday {
  id: string;
  name: string;
  date: string;
  type: 'public' | 'company' | 'floating' | 'optional';
  description?: string;
  is_recurring: boolean;
  office_location?: string;
}

// In the TeamLeaveCalendar component, add holiday state
const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);


// Add useEffect to fetch holidays
useEffect(() => {
  const fetchHolidays = async () => {
    try {
      const currentYear = currentDate.getFullYear();
      const response = await holidayService.getHolidays({ year: currentYear });
      setHolidays(response.holidays);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  fetchHolidays();
}, [currentDate]);

// Remove the duplicate useEffect and keep only this consolidated one
useEffect(() => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days: CalendarDay[] = [];
  let day = startDate;

  while (day <= endDate) {
    const currentDateStr = day.toISOString().split('T')[0];
    
    // Filter approved leave requests for this day
    const dayLeaveRequests = leaveRequests.filter(request => {
      const requestStart = parseISO(request.startDate);
      const requestEnd = parseISO(request.endDate);
      
      return isWithinInterval(day, {
        start: requestStart,
        end: requestEnd
      }) && request.status === 'approved';
    }).map(request => {
      // Transform LeaveRequest to LeaveRequestWithDetails by adding missing properties
      return {
        ...request,
        user: teamMembers.find(member => member.id === request.userId) || {
          id: request.userId,
          firstName: 'Unknown',
          lastName: 'User',
          email: ''
        },
        leaveType: {
          id: request.leaveTypeId,
          name: 'Leave', // Default name, should be fetched from leave types
          description: '',
          maxDaysPerYear: 0,
          requiresApproval: true,
          requiresDocumentation: false, // Add missing property
          advanceNoticeDays: 0, // Add missing property
          allowHalfDays: false,
          isActive: true, // Add missing property
          color: '#3B82F6',
          createdAt: new Date().toISOString(), // Add missing property
          updatedAt: new Date().toISOString() // Add missing property
        }
      } as LeaveRequestWithDetails;
    });

    // Find holidays for this date
    const dayHolidays = holidays.filter(holiday => 
      holiday.date === currentDateStr
    );

    // Calculate coverage metrics
    const availableStaff = mockTeamData.totalStaff - dayLeaveRequests.length;
    const coveragePercentage = (availableStaff / mockTeamData.totalStaff) * 100;
    const coverageLevel = calculateCoverageLevel(availableStaff, mockTeamData.totalStaff);
    
    // Generate alerts for this day if coverage is low
    const dayAlerts: CoverageAlert[] = [];
    if (coverageLevel === 'critical' || coverageLevel === 'low') {
      dayAlerts.push({
        date: new Date(day),
        level: coverageLevel === 'critical' ? 'critical' : 'warning',
        message: `Low coverage: ${availableStaff}/${mockTeamData.totalStaff} staff available`,
        affectedDepartments: ['All'],
        availableStaff,
        totalStaff: mockTeamData.totalStaff,
        severity: coverageLevel === 'critical' ? 9 : 6,
        recommendations: ['Consider rescheduling non-critical leave', 'Arrange temporary coverage'],
        criticalRolesAffected: []
      });
    }

    days.push({
      date: new Date(day),
      isCurrentMonth: isSameMonth(day, currentDate),
      leaveRequests: dayLeaveRequests, // Now properly typed as LeaveRequestWithDetails[]
      coverageLevel,
      availableStaff,
      totalStaff: mockTeamData.totalStaff,
      coveragePercentage,
      holidays: dayHolidays,
      alerts: dayAlerts // Add the missing alerts property
    });
    
    day = addDays(day, 1);
  }

  setCalendarDays(days);
}, [currentDate, leaveRequests, holidays]);


  // Fetch team leave requests for the current month
  useEffect(() => {
    if (user && (user.role === 'manager' || user.role === 'admin')) {
      const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      
      fetchLeaveRequests({
        startDate,
        endDate,
        // For managers, we might want to filter by team members
        // This would require additional API support for team management
      });
    }
  }, [currentDate, user, fetchLeaveRequests]);



  // Enhanced calendar day rendering with coverage indicators
  const renderCalendarDay = (day: CalendarDay) => {
  const dayRequests = selectedTeamMember 
    ? day.leaveRequests.filter(request => request.userId === selectedTeamMember)
    : day.leaveRequests;

  const hasAlert = coverageAlerts.some(alert => 
    isSameDay(alert.date, day.date)
  );
  
  const hasHolidays = day.holidays && day.holidays.length > 0;

  return (
    <div
      key={day.date.toISOString()}
      className={`min-h-[140px] border border-gray-200 p-2 relative ${
        day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
      } ${
        isSameDay(day.date, new Date()) ? 'ring-2 ring-blue-500' : ''
      } ${
        hasHolidays ? 'bg-yellow-50 border-yellow-200' : ''
      }`}
    >
      {/* Date and Coverage Indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className={`text-sm font-medium ${
          day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
        } ${
          hasHolidays ? 'text-yellow-700' : ''
        }`}>
          {format(day.date, 'd')}
        </div>
        
        {day.isCurrentMonth && (
          <div className="flex items-center space-x-1">
            {hasHolidays && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">
                🎉 {day.holidays.length}
              </span>
            )}
            {hasAlert && (
              <AlertTriangle className="w-3 h-3 text-red-500" />
            )}
            <Badge 
              variant="outline" 
              className={`text-xs px-1 py-0 ${getCoverageColor(day.coverageLevel)}`}
            >
              {day.coveragePercentage.toFixed(0)}%
            </Badge>
          </div>
        )}
      </div>
      
      {/* Holiday names */}
      {hasHolidays && (
        <div className="mb-2">
          {day.holidays.map(holiday => (
            <div key={holiday.id} className="text-xs text-yellow-700 font-medium truncate">
              {holiday.name}
            </div>
          ))}
        </div>
      )}
      
      {/* Coverage Summary */}
      {day.isCurrentMonth && (
        <div className="text-xs text-gray-600 mb-2">
          <div className="flex items-center space-x-1">
            <Users className="w-3 h-3" />
            <span>{day.availableStaff}/{day.totalStaff}</span>
          </div>
        </div>
      )}
      
      {/* Leave Requests */}
      <div className="space-y-1">
        {dayRequests.slice(0, 2).map((request, index) => (
          <div
            key={`${request.id}-${index}`}
            className={`text-xs p-1 rounded border ${
              getStatusColor(request.status)
            }`}
            title={`${request.user?.firstName || 'Unknown'} ${request.user?.lastName || 'User'} - ${request.leaveType?.name || 'Leave'} (${request.status})`}
          >
            <div className="flex items-center space-x-1">
              <div 
                className={`w-2 h-2 rounded-full ${
                  getLeaveTypeColor(request.leaveType?.name || 'default')
                }`}
              />
              <span className="truncate">
                {request.user?.firstName || 'Unknown'} {request.user?.lastName?.charAt(0) || 'U'}.
              </span>
            </div>
            <div className="truncate text-xs opacity-75">
              {request.leaveType?.name || 'Leave Request'}
            </div>
          </div>
        ))}
        
        {dayRequests.length > 2 && (
          <div className="text-xs text-gray-500 text-center">
            +{dayRequests.length - 2} more
          </div>
        )}
      </div>
    </div>
  );
};

  // Coverage analysis view
  const renderCoverageView = () => {
    const monthAlerts = coverageAlerts.filter(alert => 
      isSameMonth(alert.date, currentDate)
    );
    
    const criticalDays = monthAlerts.filter(alert => alert.level === 'critical').length;
    const warningDays = monthAlerts.filter(alert => alert.level === 'warning').length;
    
    return (
      <div className="space-y-6">
        {/* Coverage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">{criticalDays}</div>
                <div className="text-sm text-gray-600">Critical Days</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold text-orange-600">{warningDays}</div>
                <div className="text-sm text-gray-600">Warning Days</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(calendarDays.reduce((sum, day) => 
                    day.isCurrentMonth ? sum + day.coveragePercentage : sum, 0
                  ) / calendarDays.filter(day => day.isCurrentMonth).length)}%
                </div>
                <div className="text-sm text-gray-600">Avg Coverage</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {calendarDays.filter(day => 
                    day.isCurrentMonth && day.coverageLevel === 'good'
                  ).length}
                </div>
                <div className="text-sm text-gray-600">Good Days</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Department Coverage */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Coverage Today</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {departmentCoverage.map(dept => (
              <div key={dept.department} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{dept.department}</h4>
                  <Badge 
                    variant="outline" 
                    className={getCoverageColor(calculateCoverageLevel(dept.availableStaff, dept.totalStaff))}
                  >
                    {dept.coveragePercentage.toFixed(0)}%
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <div>{dept.availableStaff}/{dept.totalStaff} available</div>
                  {dept.criticalRoles.length > 0 && (
                    <div className="text-xs text-orange-600 mt-1">
                      Critical: {dept.criticalRoles.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Alerts List */}
        {monthAlerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Coverage Alerts</h3>
            <div className="space-y-3">
              {monthAlerts.map((alert, index) => (
                <Alert key={index} className={alert.level === 'critical' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}>
                  <AlertTriangle className={`h-4 w-4 ${alert.level === 'critical' ? 'text-red-500' : 'text-orange-500'}`} />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>{format(alert.date, 'MMM d, yyyy')}</strong> - {alert.message}
                        <div className="text-sm text-gray-600 mt-1">
                          Available: {alert.availableStaff}/{alert.totalStaff} staff
                        </div>
                      </div>
                      <Badge variant={alert.level === 'critical' ? 'destructive' : 'secondary'}>
                        {alert.level}
                      </Badge>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTeamView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    return (
      <div className="space-y-4">
        {teamMembers.map(member => {
          const memberRequests = leaveRequests.filter(request => 
            request.userId === member.id &&
            isWithinInterval(parseISO(request.startDate), {
              start: monthStart,
              end: monthEnd
            })
          );
          
          return (
            <div key={member.id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  {member.firstName} {member.lastName}
                </h3>
                <span className="text-sm text-gray-500">
                  {memberRequests.length} request(s) this month
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {memberRequests.map(request => (
                  <div
                    key={request.id}
                    className={`p-3 rounded-lg border ${
                      getStatusColor(request.status)
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {request.leaveType?.name}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <div>
                        {format(parseISO(request.startDate), 'MMM d')} - 
                        {format(parseISO(request.endDate), 'MMM d')}
                      </div>
                      <div className="text-xs mt-1">
                        {request.totalDays} day(s)
                        {request.halfDay && ` (${request.halfDayPeriod})`}
                      </div>
                    </div>
                    
                    {request.reason && (
                      <div className="text-xs text-gray-500 mt-2 truncate">
                        {request.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {memberRequests.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No leave requests this month
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Team Leave Calendar</h1>
        
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('coverage')}
              className={`px-4 py-2 text-sm font-medium border-t border-b ${
                viewMode === 'coverage'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Coverage
            </button>
            <button
              onClick={() => setViewMode('team')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md border ${
                viewMode === 'team'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Team
            </button>
          </div>
        </div>
      </div>

      {/* Coverage Alerts Banner */}
      {coverageAlerts.filter(alert => 
        isSameMonth(alert.date, currentDate) && alert.level === 'critical'
      ).length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription>
            <strong>Critical Coverage Alert:</strong> {coverageAlerts.filter(alert => 
              isSameMonth(alert.date, currentDate) && alert.level === 'critical'
            ).length} days this month have critical understaffing.
          </AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          {/* Month Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <h2 className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Team Member Filter */}
          {viewMode === 'month' && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Filter by:</label>
              <select
                value={selectedTeamMember || ''}
                onChange={(e) => setSelectedTeamMember(e.target.value || null)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Team Members</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
            <span>Approved</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
            <span>Rejected</span>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      {viewMode === 'month' ? (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 bg-gray-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-700">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map(renderCalendarDay)}
          </div>
          
          {/* Coverage Legend */}
          <div className="bg-gray-50 p-4 border-t">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-4">
                <span className="font-medium">Coverage Levels:</span>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                  <span>Good (90%+)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                  <span>Adequate (75-89%)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
                  <span>Low (60-74%)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                  <span>Critical (&lt;60%)</span>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span>Coverage Alert</span>
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === 'coverage' ? (
        renderCoverageView()
      ) : (
        renderTeamView()
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-2xl font-bold text-blue-600">
            {filteredRequests.length}
          </div>
          <div className="text-sm text-gray-600">Total Requests</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {filteredRequests.filter(r => r.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">Pending Approval</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-2xl font-bold text-green-600">
            {filteredRequests.filter(r => r.status === 'approved').length}
          </div>
          <div className="text-sm text-gray-600">Approved</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="text-2xl font-bold text-gray-600">
            {filteredRequests.reduce((sum, r) => sum + (r.status === 'approved' ? r.totalDays : 0), 0)}
          </div>
          <div className="text-sm text-gray-600">Total Days Off</div>
        </div>
      </div>
    </div>
  );
};

export default TeamLeaveCalendar;