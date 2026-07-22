import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { reportService } from '../services/reportService';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs';
import pool from '../config/database'; // Add this import

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * Generate attendance report
 * GET /api/reports/attendance
 */
router.get('/attendance', requireRole(['manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      employeeIds,
      teamIds,
      officeLocation,
      status,
      format = 'json'
    } = req.query;

    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    const filters = {
      startDate: startDate as string,
      endDate: endDate as string,
      employeeIds: employeeIds ? (employeeIds as string).split(',') : undefined,
      teamIds: teamIds ? (teamIds as string).split(',') : undefined,
      officeLocation: officeLocation as string,
      status: status as 'present' | 'absent' | 'partial'
    };

    const reportData = await reportService.generateAttendanceReport(filters);

    // Handle different export formats
    switch (format) {
      case 'csv':
        return await exportToCSV(res, reportData, 'attendance-report');
      case 'excel':
        return await exportToExcel(res, reportData, 'attendance-report');
      case 'pdf':
        return await exportToPDF(res, reportData, 'attendance-report');
      default:
        res.json({
          success: true,
          data: reportData,
          summary: {
            total_employees: reportData.length,
            date_range: { startDate, endDate },
            filters
          }
        });
    }
  } catch (error) {
    console.error('Error generating attendance report:', error);
    res.status(500).json({ error: 'Failed to generate attendance report' });
  }
});

/**
 * Generate team summary report
 * GET /api/reports/team-summary
 */
router.get('/team-summary', requireRole(['manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      format = 'json'
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    const filters = {
      startDate: startDate as string,
      endDate: endDate as string
    };

    const teamSummary = await reportService.generateTeamSummary(filters);

    switch (format) {
      case 'csv':
        return await exportTeamSummaryToCSV(res, teamSummary, 'team-summary-report');
      case 'excel':
        return await exportTeamSummaryToExcel(res, teamSummary, 'team-summary-report');
      case 'pdf':
        return await exportTeamSummaryToPDF(res, teamSummary, 'team-summary-report');
      default:
        res.json({
          success: true,
          data: teamSummary,
          summary: {
            total_teams: teamSummary.length,
            date_range: { startDate, endDate }
          }
        });
    }
  } catch (error) {
    console.error('Error generating team summary:', error);
    res.status(500).json({ error: 'Failed to generate team summary' });
  }
});

/**
 * Get attendance statistics for dashboard
 * GET /api/reports/statistics
 */
router.get('/statistics', requireRole(['manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      });
    }

    const filters = {
      startDate: startDate as string,
      endDate: endDate as string
    };

    const statistics = await reportService.getAttendanceStatistics(filters);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error getting attendance statistics:', error);
    res.status(500).json({ error: 'Failed to get attendance statistics' });
  }
});

/**
 * Get employee list for filtering
 * GET /api/reports/employees
 */
router.get('/employees', requireRole(['manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const { officeLocation, department } = req.query;
    
    let query = `
      SELECT id, CONCAT(first_name, ' ', last_name) as name, email, department, office_location
      FROM users
      WHERE role = 'employee'
    `;
    const params: any[] = [];
  
    if (officeLocation) {
      query += ` AND office_location = $${params.length + 1}`;
      params.push(officeLocation);
    }
  
    if (department) {
      query += ` AND department = $${params.length + 1}`;
      params.push(department);
    }
  
    query += ` ORDER BY first_name, last_name`;
  
    const result = await pool.query(query, params);
  
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting employees:', error);
    res.status(500).json({ error: 'Failed to get employees' });
  }
});
//
// // Fix departments route
// router.get('/departments', requireRole(['manager', 'admin']), async (req: Request, res: Response) => {
//   try {
//     const query = `
//       SELECT DISTINCT department
//       FROM users
//       WHERE role = 'employee' AND department IS NOT NULL
//       ORDER BY department
//     `;
//   
//     // Use imported pool instead of require
//     const result = await pool.query(query);
//   
//     res.json({
//       success: true,
//       data: result.rows.map((row: { department: string }) => row.department)
//     });
//   } catch (error) {
//     console.error('Error getting departments:', error);
//     res.status(500).json({ error: 'Failed to get departments' });
//   }
// });

/**
 * Get departments/teams list
 * GET /api/reports/departments
 */
router.get('/departments', requireRole(['manager', 'admin']), async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT DISTINCT department
      FROM users
      WHERE role = 'employee' AND department IS NOT NULL
      ORDER BY department
    `;

    // Use imported pool instead of require
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows.map((row: { department: string }) => row.department)
    });
  } catch (error) {
    console.error('Error getting departments:', error);
    res.status(500).json({ error: 'Failed to get departments' });
  }
});

// Export helper functions

/**
 * Export attendance report to CSV
 */
async function exportToCSV(res: Response, reportData: any[], filename: string) {
  try {
    const csvData = [];
    
    // Flatten the data for CSV export
    for (const employee of reportData) {
      for (const record of employee.attendance_records) {
        csvData.push({
          employee_name: employee.employee.name,
          employee_email: employee.employee.email,
          department: employee.employee.department,
          office_location: employee.employee.office_location,
          date: record.date,
          check_in_time: record.check_in_time || 'N/A',
          check_out_time: record.check_out_time || 'N/A',
          total_hours: record.total_hours || 0,
          overtime_hours: record.overtime_hours || 0,
          break_duration: record.break_duration || 0,
          status: record.status,
          notes: record.notes || ''
        });
      }
    }

    const csvWriter = createObjectCsvWriter({
      path: `/tmp/${filename}.csv`,
      header: [
        { id: 'employee_name', title: 'Employee Name' },
        { id: 'employee_email', title: 'Email' },
        { id: 'department', title: 'Department' },
        { id: 'office_location', title: 'Office Location' },
        { id: 'date', title: 'Date' },
        { id: 'check_in_time', title: 'Check In Time' },
        { id: 'check_out_time', title: 'Check Out Time' },
        { id: 'total_hours', title: 'Total Hours' },
        { id: 'overtime_hours', title: 'Overtime Hours' },
        { id: 'break_duration', title: 'Break Duration (Hours)' },
        { id: 'status', title: 'Status' },
        { id: 'notes', title: 'Notes' }
      ]
    });

    await csvWriter.writeRecords(csvData);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    
    const fileStream = fs.createReadStream(`/tmp/${filename}.csv`);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      fs.unlinkSync(`/tmp/${filename}.csv`);
    });
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    res.status(500).json({ error: 'Failed to export to CSV' });
  }
}

/**
 * Export attendance report to Excel
 */
async function exportToExcel(res: Response, reportData: any[], filename: string) {
  try {
    const workbook = XLSX.utils.book_new();
    
    // Create attendance records sheet
    const attendanceData = [];
    for (const employee of reportData) {
      for (const record of employee.attendance_records) {
        attendanceData.push({
          'Employee Name': employee.employee.name,
          'Email': employee.employee.email,
          'Department': employee.employee.department,
          'Office Location': employee.employee.office_location,
          'Date': record.date,
          'Check In Time': record.check_in_time || 'N/A',
          'Check Out Time': record.check_out_time || 'N/A',
          'Total Hours': record.total_hours || 0,
          'Overtime Hours': record.overtime_hours || 0,
          'Break Duration (Hours)': record.break_duration || 0,
          'Status': record.status,
          'Notes': record.notes || ''
        });
      }
    }
    
    const attendanceSheet = XLSX.utils.json_to_sheet(attendanceData);
    XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'Attendance Records');
    
    // Create summary sheet
    const summaryData = reportData.map(employee => ({
      'Employee Name': employee.employee.name,
      'Email': employee.employee.email,
      'Department': employee.employee.department,
      'Total Days': employee.summary.total_days,
      'Present Days': employee.summary.present_days,
      'Absent Days': employee.summary.absent_days,
      'Partial Days': employee.summary.partial_days,
      'Total Hours': employee.summary.total_hours,
      'Average Hours/Day': employee.summary.average_hours_per_day,
      'Overtime Hours': employee.summary.overtime_hours,
      'Break Hours': employee.summary.break_hours
    }));
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ error: 'Failed to export to Excel' });
  }
}

/**
 * Export attendance report to PDF
 */
async function exportToPDF(res: Response, reportData: any[], filename: string) {
  try {
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    
    doc.pipe(res);
    
    // Title
    doc.fontSize(20).text('Attendance Report', { align: 'center' });
    doc.moveDown();
    
    // Summary statistics
    const totalEmployees = reportData.length;
    const totalPresentDays = reportData.reduce((sum, emp) => sum + emp.summary.present_days, 0);
    const totalAbsentDays = reportData.reduce((sum, emp) => sum + emp.summary.absent_days, 0);
    const totalOvertimeHours = reportData.reduce((sum, emp) => sum + emp.summary.overtime_hours, 0);
    
    doc.fontSize(14).text('Report Summary:', { underline: true });
    doc.fontSize(12)
       .text(`Total Employees: ${totalEmployees}`)
       .text(`Total Present Days: ${totalPresentDays}`)
       .text(`Total Absent Days: ${totalAbsentDays}`)
       .text(`Total Overtime Hours: ${totalOvertimeHours.toFixed(2)}`);
    
    doc.moveDown();
    
    // Employee details
    for (const employee of reportData) {
      doc.addPage();
      
      doc.fontSize(16).text(`${employee.employee.name} (${employee.employee.email})`, { underline: true });
      doc.fontSize(12)
         .text(`Department: ${employee.employee.department}`)
         .text(`Office: ${employee.employee.office_location}`);
      
      doc.moveDown();
      
      // Employee summary
      doc.fontSize(14).text('Summary:', { underline: true });
      doc.fontSize(10)
         .text(`Present Days: ${employee.summary.present_days}/${employee.summary.total_days}`)
         .text(`Total Hours: ${employee.summary.total_hours.toFixed(2)}`)
         .text(`Average Hours/Day: ${employee.summary.average_hours_per_day.toFixed(2)}`)
         .text(`Overtime Hours: ${employee.summary.overtime_hours.toFixed(2)}`);
      
      doc.moveDown();
      
      // Recent attendance records (last 10)
      doc.fontSize(14).text('Recent Attendance:', { underline: true });
      const recentRecords = employee.attendance_records.slice(0, 10);
      
      for (const record of recentRecords) {
        doc.fontSize(9)
           .text(`${record.date}: ${record.check_in_time || 'N/A'} - ${record.check_out_time || 'N/A'} (${record.total_hours?.toFixed(2) || 0}h) [${record.status}]`);
      }
    }
    
    doc.end();
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    res.status(500).json({ error: 'Failed to export to PDF' });
  }
}

// Team summary export functions (similar pattern)
async function exportTeamSummaryToCSV(res: Response, teamData: any[], filename: string) {
  const csvWriter = createObjectCsvWriter({
    path: `/tmp/${filename}.csv`,
    header: [
      { id: 'team_name', title: 'Team Name' },
      { id: 'total_employees', title: 'Total Employees' },
      { id: 'average_attendance_rate', title: 'Attendance Rate (%)' },
      { id: 'total_overtime_hours', title: 'Total Overtime Hours' },
      { id: 'total_absence_hours', title: 'Total Absence Hours' },
      { id: 'productivity_score', title: 'Productivity Score (%)' }
    ]
  });

  await csvWriter.writeRecords(teamData);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  
  const fileStream = fs.createReadStream(`/tmp/${filename}.csv`);
  fileStream.pipe(res);
  
  fileStream.on('end', () => {
    fs.unlinkSync(`/tmp/${filename}.csv`);
  });
}

async function exportTeamSummaryToExcel(res: Response, teamData: any[], filename: string) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(teamData.map(team => ({
    'Team Name': team.team_name,
    'Total Employees': team.total_employees,
    'Attendance Rate (%)': team.average_attendance_rate.toFixed(2),
    'Total Overtime Hours': team.total_overtime_hours,
    'Total Absence Hours': team.total_absence_hours,
    'Productivity Score (%)': team.productivity_score.toFixed(2)
  })));
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Team Summary');
  
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  res.send(buffer);
}

async function exportTeamSummaryToPDF(res: Response, teamData: any[], filename: string) {
  const doc = new PDFDocument({ margin: 50 });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  
  doc.pipe(res);
  
  doc.fontSize(20).text('Team Summary Report', { align: 'center' });
  doc.moveDown();
  
  for (const team of teamData) {
    doc.fontSize(14).text(`${team.team_name}`, { underline: true });
    doc.fontSize(12)
       .text(`Total Employees: ${team.total_employees}`)
       .text(`Attendance Rate: ${team.average_attendance_rate.toFixed(2)}%`)
       .text(`Total Overtime Hours: ${team.total_overtime_hours}`)
       .text(`Total Absence Hours: ${team.total_absence_hours}`)
       .text(`Productivity Score: ${team.productivity_score.toFixed(2)}%`);
    doc.moveDown();
  }
  
  doc.end();
}

export default router;