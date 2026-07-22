import api from './api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  department?: string;
  status?: 'present' | 'absent' | 'partial';
  includeBreaks?: boolean;
}

export interface AttendanceReportData {
  employee: {
    id: string;
    name: string;
    email: string;
    department: string;
  };
  summary: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    partialDays: number;
    totalHours: number;
    averageHours: number;
    overtimeHours: number;
  };
  records: Array<{
    date: string;
    checkIn?: string;
    checkOut?: string;
    totalHours: number;
    status: string;
    breaks: Array<{
      startTime: string;
      endTime?: string;
      duration?: number;
    }>;
    overtime?: {
      hours: number;
      approved: boolean;
    };
  }>;
  overtimePattern: {
    weeklyAverages: Array<{
      week: string;
      hours: number;
    }>;
    monthlyTotals: Array<{
      month: string;
      hours: number;
    }>;
  };
  absencePattern: {
    frequentDays: string[];
    longestStreak: number;
    totalAbsences: number;
  };
}

export interface TeamSummary {
  department: string;
  totalEmployees: number;
  averageAttendance: number;
  totalHours: number;
  overtimeHours: number;
  employees: Array<{
    id: string;
    name: string;
    attendanceRate: number;
    totalHours: number;
    overtimeHours: number;
  }>;
}

class ReportService {
  // Generate attendance report
  async generateAttendanceReport(filters: ReportFilters): Promise<AttendanceReportData> {
    const response = await api.get('/reports/attendance', { params: filters });
    return response.data;
  }

  // Get team summary
  async getTeamSummary(filters: ReportFilters): Promise<TeamSummary[]> {
    const response = await api.get('/reports/team-summary', { params: filters });
    return response.data;
  }

  // Get report statistics
  async getReportStatistics(filters: ReportFilters) {
    const response = await api.get('/reports/statistics', { params: filters });
    return response.data;
  }

  // Get employees list for filtering
  async getEmployees() {
    const response = await api.get('/reports/employees');
    return response.data;
  }

  // Get departments list for filtering
  async getDepartments() {
    const response = await api.get('/reports/departments');
    return response.data;
  }

  // Export to CSV
  async exportToCSV(filters: ReportFilters, filename: string = 'attendance-report') {
    const response = await api.get('/reports/attendance', {
      params: { ...filters, format: 'csv' },
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Export to Excel
  async exportToExcel(filters: ReportFilters, filename: string = 'attendance-report') {
    const response = await api.get('/reports/attendance', {
      params: { ...filters, format: 'excel' },
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Export to PDF
  async exportToPDF(filters: ReportFilters, filename: string = 'attendance-report') {
    const response = await api.get('/reports/attendance', {
      params: { ...filters, format: 'pdf' },
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Client-side Excel export using XLSX
  exportDataToExcel(data: any[], filename: string = 'report') {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  }

  // Client-side PDF export using jsPDF
  exportDataToPDF(data: any[], columns: string[], filename: string = 'report') {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Attendance Report', 20, 20);
    
    autoTable(doc, {
      head: [columns],
      body: data.map(row => columns.map(col => row[col] || '')),
      startY: 30,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    doc.save(`${filename}.pdf`);
  }
}

export const reportService = new ReportService();