import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import morgan from 'morgan';

// Security imports
import { securityHeaders, apiRateLimit, authRateLimit, validateInput, preventSQLInjection, requestSizeLimiter } from './middleware/security';
import { enhancedAuthenticateToken } from './middleware/enhancedAuth';
import { corsMiddleware } from './config/cors';
import { createHTTPSServer, httpsRedirect } from './config/ssl';
import { securityLoggingMiddleware } from './middleware/securityLogger';

// Monitoring imports
import { requestMonitoring } from './middleware/monitoring';
import { monitoringService } from './services/monitoringService';
import { errorTrackingService } from './services/errorTrackingService';

// Import routes
import authRoutes from './routes/auth';
import deviceRoutes from './routes/devices';
import attendanceRoutes from './routes/attendance';
import wifiRoutes from './routes/wifi';
import notificationRoutes from './routes/notifications';
import breakRoutes from './routes/breaks';
import userRoutes from './routes/users';
import systemConfigRoutes from './routes/systemConfig';
import policyTemplateRoutes from './routes/policyTemplates';
import policyEnforcementRoutes from './routes/policyEnforcement';
import leaveRoutes from './routes/leave';
import auditRoutes from './routes/audit';
import dataRetentionRoutes from './routes/dataRetention';
import locationRoutes from './routes/locations';
import monitoringRoutes from './routes/monitoring';
import activitiesRoutes from './routes/activities';
import dashboardRoutes from './routes/dashboard';
import delegationRoutes from './routes/delegation';
import adminRoutes from './routes/admin';
import reportsRoutes from './routes/reports';
import scheduledReportsRoutes from './routes/scheduledReports';
import timesheetsRoutes from './routes/timesheets';
import holidayRoutes from './routes/holidays';
import dailyTimesheetRoutes from './routes/dailyTimesheet';
import projectRoutes from './routes/projects'; // Add this line

// Import services
import { attendanceAutomationService } from './services/attendanceAutomationService';
import { wifiDetectionService } from './services/wifiDetectionService';
import { notificationService } from './services/notificationService';
import { initializeDatabase } from './config/initDatabase';
import { seedTestUsers } from './database/seed';

// Load environment variables
dotenv.config();

// Temporary debug log - REMOVE after testing
console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES' : 'NO');
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Security middleware (order matters!)
app.use(httpsRedirect); // HTTPS redirect first
app.use(securityHeaders); // Security headers
app.use(corsMiddleware); // Enhanced CORS
app.use(securityLoggingMiddleware); // Security logging
app.use(requestMonitoring); // Request monitoring
app.use(requestSizeLimiter); // Request size limiting
app.use(express.json({ limit: '10mb' })); // JSON parsing with limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(validateInput); // Input validation
app.use(preventSQLInjection); // SQL injection prevention
app.use(morgan('combined')); // Logging

// Apply rate limiting
// app.use('/api/auth', authRateLimit); // Strict rate limiting for auth
// app.use('/api', apiRateLimit); // General API rate limiting

// Routes with enhanced authentication
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/devices', enhancedAuthenticateToken, deviceRoutes);
app.use('/api/attendance', enhancedAuthenticateToken, attendanceRoutes);
app.use('/api/wifi', enhancedAuthenticateToken, wifiRoutes);
app.use('/api/notifications', enhancedAuthenticateToken, notificationRoutes);
app.use('/api/breaks', enhancedAuthenticateToken, breakRoutes);
app.use('/api/users', enhancedAuthenticateToken, userRoutes);
app.use('/api/system', enhancedAuthenticateToken, systemConfigRoutes);
app.use('/api/policy-templates', enhancedAuthenticateToken, policyTemplateRoutes);
app.use('/api/policy-enforcement', enhancedAuthenticateToken, policyEnforcementRoutes);
app.use('/api/leave', enhancedAuthenticateToken, leaveRoutes);
app.use('/api/audit', enhancedAuthenticateToken, auditRoutes);
app.use('/api/data-retention', enhancedAuthenticateToken, dataRetentionRoutes);
app.use('/api/locations', enhancedAuthenticateToken, locationRoutes);
app.use('/api/activities', enhancedAuthenticateToken, activitiesRoutes);
app.use('/api/dashboard', enhancedAuthenticateToken, dashboardRoutes);
app.use('/api/delegation', enhancedAuthenticateToken, delegationRoutes);
app.use('/api/reports', enhancedAuthenticateToken, reportsRoutes);
app.use('/api/scheduled-reports', enhancedAuthenticateToken, scheduledReportsRoutes);
app.use('/api/projects', enhancedAuthenticateToken, projectRoutes); // Add this line
app.use('/api/daily-timesheets', enhancedAuthenticateToken, dailyTimesheetRoutes);
app.use('/api/timesheets', enhancedAuthenticateToken, timesheetsRoutes);

// Add this line with other route mountings (around line 97)
app.use('/api/holidays', enhancedAuthenticateToken, holidayRoutes);

// Add this line with other route registrations
app.use('/api/admin', enhancedAuthenticateToken, adminRoutes);

// Legacy health check endpoint (redirect to monitoring)
app.get('/health', (req, res) => {
  res.redirect('/api/monitoring/health');
});

// Global error handler with error tracking
app.use(errorTrackingService.expressErrorHandler());

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Start server
const httpsServer = createHTTPSServer(app);

if (httpsServer) {
  const httpsPort = process.env.HTTPS_PORT || 443;
  httpsServer.listen(httpsPort, () => {
    console.log(`🔒 HTTPS Server running on port ${httpsPort}`);
  });
}

// Initialize services
async function initializeServices() {
  try {
    // Initialize database schemas first
    await initializeDatabase();
    
    // Seed test users AFTER all schemas are created
    await seedTestUsers();
    
    // Initialize notification service with Socket.IO
    await notificationService.initialize(io);
    
    // Initialize other services
    await attendanceAutomationService.initialize();
    await wifiDetectionService.startMonitoring();
    
    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Single server startup - remove the duplicate at line 122
server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Security features enabled`);
  await initializeServices();
});

// Initialize monitoring alerts
monitoringService.on('alert', (alert) => {
  console.log(`🚨 Alert ${alert.triggered ? 'TRIGGERED' : 'RESOLVED'}: ${alert.rule.id}`);
  console.log(`   Metric: ${alert.rule.metric} = ${alert.value} (threshold: ${alert.rule.threshold})`);
  
  // Send notifications for critical alerts
  if (alert.rule.severity === 'critical' && alert.triggered) {
    // Integration with notification service or external alerting systems
    notificationService.sendSystemAlert({
      title: `Critical Alert: ${alert.rule.id}`,
      message: `${alert.rule.metric} has exceeded threshold (${alert.value} > ${alert.rule.threshold})`,
      severity: 'critical',
      timestamp: alert.timestamp
    });
  }
});

// Single export at the end
export { app, server, io };