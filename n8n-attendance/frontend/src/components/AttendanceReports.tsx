import React, { useState, useEffect } from 'react';
import { reportService, ReportFilters, AttendanceReportData, TeamSummary } from '../services/reportService';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

type ReportView = 'individual' | 'team' | 'statistics';
type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'custom';

const AttendanceReports: React.FC = () => {
  const [reportView, setReportView] = useState<ReportView>('individual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [statusFilter, setStatusFilter] = useState<'present' | 'absent' | 'partial' | ''>('');
  const [includeBreaks, setIncludeBreaks] = useState(true);
  
  // Data
  const [reportData, setReportData] = useState<AttendanceReportData | null>(null);
  const [teamData, setTeamData] = useState<TeamSummary[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Set default date range
  useEffect(() => {
    const today = new Date();
    let start: Date, end: Date;
    
    switch (dateRange) {
      case 'today':
        start = end = today;
        break;
      case 'week':
        start = subDays(today, 7);
        end = today;
        break;
      case 'month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'quarter':
        start = subDays(today, 90);
        end = today;
        break;
      default:
        return; // custom - don't auto-set
    }
    
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  }, [dateRange]);

  // Load initial data
  useEffect(() => {
    loadEmployees();
    loadDepartments();
  }, []);

  // Load data when filters change
  useEffect(() => {
    if (startDate && endDate) {
      loadReportData();
    }
  }, [reportView, startDate, endDate, selectedEmployee, selectedDepartment, statusFilter, includeBreaks]);

  const loadEmployees = async () => {
    try {
      const data = await reportService.getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const loadDepartments = async () => {
    try {
      const data = await reportService.getDepartments();
      setDepartments(data);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filters: ReportFilters = {
        startDate,
        endDate,
        employeeId: selectedEmployee || undefined,
        department: selectedDepartment || undefined,
        status: statusFilter || undefined,
        includeBreaks
      };

      switch (reportView) {
        case 'individual':
          const reportData = await reportService.generateAttendanceReport(filters);
          setReportData(reportData);
          break;
        case 'team':
          const teamData = await reportService.getTeamSummary(filters);
          setTeamData(teamData);
          break;
        case 'statistics':
          const stats = await reportService.getReportStatistics(filters);
          setStatistics(stats);
          break;
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (exportFormat: 'csv' | 'excel' | 'pdf') => {
    try {
      const filters: ReportFilters = {
        startDate,
        endDate,
        employeeId: selectedEmployee || undefined,
        department: selectedDepartment || undefined,
        status: statusFilter || undefined,
        includeBreaks
      };

      const filename = `attendance-report-${format(new Date(), 'yyyy-MM-dd')}`;
      
      switch (exportFormat) {
        case 'csv':
          await reportService.exportToCSV(filters, filename);
          break;
        case 'excel':
          await reportService.exportToExcel(filters, filename);
          break;
        case 'pdf':
          await reportService.exportToPDF(filters, filename);
          break;
      }
    } catch (err) {
      setError('Failed to export report');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Attendance Reports</h1>
        
        {/* Report View Toggle */}
        <div className="flex space-x-2">
          <button
            onClick={() => setReportView('individual')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              reportView === 'individual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Individual Reports
          </button>
          <button
            onClick={() => setReportView('team')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              reportView === 'team'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Team Summary
          </button>
          <button
            onClick={() => setReportView('statistics')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              reportView === 'statistics'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Statistics
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Filters & Export</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
          {/* Date Range Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="quarter">Last 3 Months</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Employee Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>
          
          {/* Department Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="partial">Partial Day</option>
            </select>
          </div>
        </div>
        
        {/* Additional Options */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeBreaks}
                onChange={(e) => setIncludeBreaks(e.target.checked)}
                className="mr-2"
              />
              Include Break Details
            </label>
          </div>
          
          {/* Export Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Export Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="text-red-800">{error}</div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading report data...</span>
        </div>
      )}

      {/* Report Content */}
      {!loading && (
        <div className="space-y-6">
          {reportView === 'individual' && reportData && (
            <IndividualReportView data={reportData} />
          )}
          
          {reportView === 'team' && teamData.length > 0 && (
            <TeamReportView data={teamData} />
          )}
          
          {reportView === 'statistics' && statistics && (
            <StatisticsView data={statistics} />
          )}
        </div>
      )}
    </div>
  );
};

// Individual Report Component
const IndividualReportView: React.FC<{ data: AttendanceReportData }> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Employee Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {data.employee.name} - Attendance Summary
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{data.summary.presentDays}</div>
            <div className="text-sm text-gray-600">Present Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{data.summary.absentDays}</div>
            <div className="text-sm text-gray-600">Absent Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{data.summary.totalHours.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Total Hours</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{data.summary.overtimeHours.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Overtime Hours</div>
          </div>
        </div>
      </div>

      {/* Overtime Pattern Analysis */}
      {data.overtimePattern && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overtime Pattern Analysis</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Overtime Trends */}
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-3">Weekly Overtime Trends</h4>
              <div className="space-y-2">
                {data.overtimePattern.weeklyAverages.map((week, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">{week.week}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full" 
                          style={{ width: `${Math.min((week.hours / 20) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{week.hours.toFixed(1)}h</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Monthly Overtime Totals */}
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-3">Monthly Overtime Totals</h4>
              <div className="space-y-2">
                {data.overtimePattern.monthlyTotals.map((month, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">{month.month}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${Math.min((month.hours / 80) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{month.hours.toFixed(1)}h</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Absence Pattern Analysis */}
      {data.absencePattern && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Absence Pattern Analysis</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Frequent Absence Days */}
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{data.absencePattern.totalAbsences}</div>
              <div className="text-sm text-gray-600 mb-3">Total Absences</div>
              <div className="text-xs text-gray-500">
                Most frequent: {data.absencePattern.frequentDays.join(', ') || 'None'}
              </div>
            </div>
            
            {/* Longest Absence Streak */}
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{data.absencePattern.longestStreak}</div>
              <div className="text-sm text-gray-600">Longest Streak (days)</div>
            </div>
            
            {/* Absence Rate */}
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {((data.absencePattern.totalAbsences / data.summary.totalDays) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Absence Rate</div>
            </div>
          </div>
          
          {/* Frequent Days Visualization */}
          {data.absencePattern.frequentDays.length > 0 && (
            <div className="mt-4">
              <h4 className="text-md font-medium text-gray-800 mb-2">Most Frequent Absence Days</h4>
              <div className="flex flex-wrap gap-2">
                {data.absencePattern.frequentDays.map((day, index) => (
                  <span key={index} className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                    {day}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Daily Records</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overtime
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.records.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(record.date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.totalHours.toFixed(2)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      record.status === 'present' ? 'bg-green-100 text-green-800' :
                      record.status === 'absent' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.overtime ? `${record.overtime.hours.toFixed(1)}h` : '0h'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Team Report Component
const TeamReportView: React.FC<{ data: TeamSummary[] }> = ({ data }) => {
  return (
    <div className="space-y-6">
      {data.map((team, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {team.department} Department
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{team.totalEmployees}</div>
              <div className="text-sm text-gray-600">Total Employees</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{team.averageAttendance.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Avg Attendance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{team.totalHours.toFixed(0)}</div>
              <div className="text-sm text-gray-600">Total Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{team.overtimeHours.toFixed(0)}</div>
              <div className="text-sm text-gray-600">Overtime Hours</div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attendance Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overtime Hours
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {team.employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {employee.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.attendanceRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.totalHours.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {employee.overtimeHours.toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

// Statistics View Component
const StatisticsView: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Employees:</span>
              <span className="font-semibold">{data.totalEmployees}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Attendance:</span>
              <span className="font-semibold">{data.averageAttendance?.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Work Hours:</span>
              <span className="font-semibold">{data.totalWorkHours?.toFixed(0)}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Overtime:</span>
              <span className="font-semibold">{data.totalOvertime?.toFixed(0)}h</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Trends</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Best Day:</span>
              <span className="font-semibold text-green-600">{data.bestAttendanceDay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Worst Day:</span>
              <span className="font-semibold text-red-600">{data.worstAttendanceDay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Peak Hours:</span>
              <span className="font-semibold">{data.peakHours}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Performance</h3>
          <div className="space-y-3">
            {data.departmentStats?.map((dept: any, index: number) => (
              <div key={index} className="flex justify-between">
                <span className="text-gray-600">{dept.name}:</span>
                <span className="font-semibold">{dept.attendanceRate?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceReports;