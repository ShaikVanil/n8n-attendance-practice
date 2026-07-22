import React, { useState, useEffect } from 'react';
import { scheduledReportService } from '../services/scheduledReportService';
import CreateScheduledReportModal from './CreateScheduledReportModal';

interface ScheduledReport {
  id: string;
  name: string;
  description?: string;
  report_type: 'attendance' | 'team_summary' | 'statistics';
  schedule_cron: string;
  filters: any;
  recipients: string[];
  format: 'pdf' | 'csv' | 'excel';
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
}

const ScheduledReports: React.FC = () => {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await scheduledReportService.getScheduledReports();
      setReports(data);
    } catch (error) {
      console.error('Failed to load scheduled reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteReport = async (reportId: string) => {
    try {
      await scheduledReportService.executeReport(reportId);
      alert('Report execution started. You will receive an email when complete.');
    } catch (error) {
      console.error('Failed to execute report:', error);
      alert('Failed to execute report');
    }
  };

  const handleToggleActive = async (reportId: string, isActive: boolean) => {
    try {
      await scheduledReportService.updateScheduledReport(reportId, { is_active: !isActive });
      loadReports();
    } catch (error) {
      console.error('Failed to update report:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Scheduled Reports</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Create Scheduled Report
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Schedule
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Next Run
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{report.name}</div>
                    <div className="text-sm text-gray-500">{report.description}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.report_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.schedule_cron}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.next_run_at ? new Date(report.next_run_at).toLocaleString() : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    report.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {report.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleExecuteReport(report.id)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Execute
                  </button>
                  <button
                    onClick={() => handleToggleActive(report.id, report.is_active)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    {report.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <CreateScheduledReportModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadReports();
          }}
        />
      )}
    </div>
  );
};

export default ScheduledReports;