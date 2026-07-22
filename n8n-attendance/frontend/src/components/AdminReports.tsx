import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { 
  BarChart3, 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp,
  Filter,
  RefreshCw
} from 'lucide-react';
import AttendanceReports from './AttendanceReports';
import ComplianceReports from './ComplianceReports';

interface ReportMetrics {
  totalReports: number;
  reportsThisMonth: number;
  scheduledReports: number;
  lastGenerated: string;
}

const AdminReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalReports: 0,
    reportsThisMonth: 0,
    scheduledReports: 0,
    lastGenerated: 'Never'
  });
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    {
      id: 'attendance',
      name: 'Attendance Reports',
      description: 'Employee attendance tracking and analysis',
      icon: Clock,
      count: 15
    },
    {
      id: 'compliance',
      name: 'Compliance Reports',
      description: 'Regulatory compliance and audit reports',
      icon: FileText,
      count: 8
    },
    {
      id: 'user-activity',
      name: 'User Activity Reports',
      description: 'System usage and user behavior analysis',
      icon: Users,
      count: 12
    },
    {
      id: 'performance',
      name: 'Performance Reports',
      description: 'System performance and analytics',
      icon: TrendingUp,
      count: 6
    }
  ];

  useEffect(() => {
    loadReportMetrics();
  }, []);

  const loadReportMetrics = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual service call
      setTimeout(() => {
        setMetrics({
          totalReports: 41,
          reportsThisMonth: 12,
          scheduledReports: 5,
          lastGenerated: new Date().toLocaleDateString()
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to load report metrics:', error);
      setLoading(false);
    }
  };

  const handleGenerateReport = (reportType: string) => {
    console.log(`Generating ${reportType} report...`);
    // Implement report generation logic
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalReports}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.reportsThisMonth}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.scheduledReports}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Generated</p>
                <p className="text-sm font-bold text-gray-900">{metrics.lastGenerated}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((reportType) => {
          const IconComponent = reportType.icon;
          return (
            <Card key={reportType.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconComponent className="h-5 w-5" />
                    <span>{reportType.name}</span>
                  </div>
                  <Badge variant="outline">{reportType.count} reports</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{reportType.description}</p>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleGenerateReport(reportType.id)}
                    className="flex items-center space-x-1"
                  >
                    <Download className="h-4 w-4" />
                    <span>Generate</span>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setActiveTab(reportType.id)}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Reports</h1>
          <p className="text-gray-600 mt-2">Generate and manage system reports</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="user-activity">User Activity</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {renderOverview()}
          </TabsContent>

          <TabsContent value="attendance">
            <AttendanceReports />
          </TabsContent>

          <TabsContent value="compliance">
            <ComplianceReports />
          </TabsContent>

          <TabsContent value="user-activity">
            <Card>
              <CardHeader>
                <CardTitle>User Activity Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">User activity reporting functionality coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Performance reporting functionality coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Scheduled reports management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminReports;