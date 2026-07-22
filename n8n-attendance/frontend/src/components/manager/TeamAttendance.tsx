import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import PermissionGate from '../auth/PermissionGate';
import api from '../../services/api';

interface AttendanceSession {
  check_in_time: string | null;
  check_out_time: string | null;
  duration_hours: number;
  location: string;
  is_duplicate: boolean;
  overlaps_with: string[];
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'present' | 'absent' | 'late' | 'partial' | 'on_leave';
  // Add monthly-specific fields
  daysWorked?: number;
  attendanceRate?: number;
  averageHours?: number;
  leaveDays?: number;
  lateDays?: number;
  checkInTime?: string;
  checkOutTime?: string;
  totalHours?: number;
  location?: string;
  sessions?: AttendanceSession[];
  hasMultipleSessions?: boolean;
  hasUnclosedSession?: boolean;
  sessionCount?: number;
}

interface AttendanceRecord {
  date: string;
  period?: string; // For monthly: "2024-01" 
  members: TeamMember[];
  summary: {
    totalMembers: number;
    present: number;
    absent: number;
    late: number;
    partial: number;
    onLeave: number;
    // Add monthly summary fields
    averageAttendanceRate?: number;
    totalWorkingDays?: number;
    totalHours?: number;
  };
}

const TeamAttendance: React.FC = () => {
  const { user } = useAuthStore();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);

  useEffect(() => {
    fetchTeamAttendance();
  }, [selectedDate, viewMode]);

  const fetchTeamAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/attendance/team?date=${selectedDate}&view=${viewMode}`);
      setAttendanceData(response.data);
    } catch (error) {
      console.error('Error fetching team attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100';
      case 'absent': return 'text-red-600 bg-red-100';
      case 'late': return 'text-yellow-600 bg-yellow-100';
      case 'partial': return 'text-orange-600 bg-orange-100';
      case 'on_leave': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleStatusClick = (member: TeamMember) => {
    if (member.hasMultipleSessions && member.sessions && member.sessions.length > 1) {
      setSelectedMember(member);
      setShowSessionModal(true);
    }
  };

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return '-';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const SessionModal = () => {
    if (!selectedMember || !showSessionModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {selectedMember.firstName} {selectedMember.lastName} - Multiple Sessions
            </h3>
            <button
              onClick={() => setShowSessionModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            {selectedMember.sessions?.map((session, index) => (
              <div key={index} className="border rounded-lg p-3 bg-gray-50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Check In:</span> {formatTime(session.check_in_time)}
                  </div>
                  <div>
                    <span className="font-medium">Check Out:</span> {formatTime(session.check_out_time)}
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span> {session.duration_hours.toFixed(1)}h
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {session.location}
                  </div>
                  {session.is_duplicate && (
                    <div className="col-span-2">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Duplicate Detected
                      </span>
                    </div>
                  )}
                  {session.overlaps_with.length > 0 && (
                    <div className="col-span-2">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                        Overlapping Session
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <PermissionGate module="attendance" roles={['manager', 'admin']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Team Attendance</h1>
            <div className="flex space-x-4">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="daily">Daily View</option>
                <option value="weekly">Weekly View</option>
                <option value="monthly">Monthly View</option>
              </select>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          {/* Summary Cards */}
          {attendanceData && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900">{attendanceData.summary.totalMembers}</div>
                <div className="text-sm text-gray-600">Total Team</div>
              </div>
              {viewMode === 'monthly' ? (
                <>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {attendanceData.summary.averageAttendanceRate?.toFixed(1) || '0.0'}%
                    </div>
                    <div className="text-sm text-gray-600">Avg Attendance</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {attendanceData.summary.totalWorkingDays || 0}
                    </div>
                    <div className="text-sm text-gray-600">Working Days</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {attendanceData.summary.totalHours?.toFixed(0) || '0'}
                    </div>
                    <div className="text-sm text-gray-600">Total Hours</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {Math.round((attendanceData.summary.totalHours || 0) / (attendanceData.summary.totalWorkingDays || 1))}
                    </div>
                    <div className="text-sm text-gray-600">Avg Hours/Day</div>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-indigo-600">{attendanceData.summary.onLeave}</div>
                    <div className="text-sm text-gray-600">Leave Days</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{attendanceData.summary.present}</div>
                    <div className="text-sm text-gray-600">Present</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{attendanceData.summary.absent}</div>
                    <div className="text-sm text-gray-600">Absent</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-600">{attendanceData.summary.late}</div>
                    <div className="text-sm text-gray-600">Late</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600">{attendanceData.summary.partial}</div>
                    <div className="text-sm text-gray-600">Partial</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{attendanceData.summary.onLeave}</div>
                    <div className="text-sm text-gray-600">On Leave</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Team Members List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  {viewMode === 'monthly' ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Days Worked
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendance Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Hours/Day
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Leave Days
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
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
                        Location
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceData?.members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    {viewMode === 'monthly' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.daysWorked || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <span className={`font-medium ${
                              (member.attendanceRate || 0) >= 90 ? 'text-green-600' :
                              (member.attendanceRate || 0) >= 75 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {member.attendanceRate?.toFixed(1) || '0.0'}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.totalHours?.toFixed(1) || '0.0'}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.averageHours?.toFixed(1) || '0.0'}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.leaveDays || 0}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span 
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                getStatusColor(member.status)
                              } ${
                                member.hasMultipleSessions ? 'cursor-pointer hover:opacity-80' : ''
                              }`}
                              onClick={() => handleStatusClick(member)}
                            >
                              {member.status === 'on_leave' ? 'ON LEAVE' : member.status.toUpperCase()}
                            </span>
                            {member.hasMultipleSessions && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                {member.sessionCount} Sessions
                              </span>
                            )}
                            {member.hasUnclosedSession && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                Active
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(member.checkInTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.hasUnclosedSession ? '-' : formatTime(member.checkOutTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.totalHours ? `${typeof member.totalHours === 'number' ? member.totalHours.toFixed(1) : parseFloat(member.totalHours).toFixed(1)}h` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.location || '-'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <SessionModal />
      </div>
    </PermissionGate>
  );
};

export default TeamAttendance;