import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'security_logger.dart';
import 'secure_storage_service.dart';

enum SecurityEventType {
  authenticationAttempt,
  authenticationSuccess,
  authenticationFailure,
  tokenRefresh,
  dataAccess,
  dataModification,
  encryptionOperation,
  secureStorageAccess,
  biometricAuthentication,
  locationAccess,
  networkRequest,
  dataExport,
  securityViolation,
}

class SecurityEvent {
  final SecurityEventType type;
  final DateTime timestamp;
  final String description;
  final Map<String, dynamic> metadata;
  final String? userId;
  final String? ipAddress;
  final bool isSuccessful;
  
  SecurityEvent({
    required this.type,
    required this.timestamp,
    required this.description,
    required this.metadata,
    this.userId,
    this.ipAddress,
    required this.isSuccessful,
  });
  
  Map<String, dynamic> toJson() => {
    'type': type.toString(),
    'timestamp': timestamp.toIso8601String(),
    'description': description,
    'metadata': metadata,
    'userId': userId,
    'ipAddress': ipAddress,
    'isSuccessful': isSuccessful,
  };
}

class SecurityAuditService {
  final SecureStorageService _secureStorage;
  static const String _auditLogKey = 'security_audit_log';
  static const int _maxLogEntries = 1000;
  
  SecurityAuditService(this._secureStorage);
  
  /// Log security event
  Future<void> logSecurityEvent(SecurityEvent event) async {
    try {
      // Log to console/debug output
      SecurityLogger.logSecurityEvent(
        event.type.toString(),
        event.toJson(),
      );
      
      // Store in secure storage for audit trail
      await _storeAuditEvent(event);
      
      // Check for security violations
      await _checkSecurityViolations(event);
      
    } catch (e) {
      SecurityLogger.logError('Failed to log security event: $e');
    }
  }
  
  /// Store audit event in secure storage
  Future<void> _storeAuditEvent(SecurityEvent event) async {
    try {
      final existingLogs = await _getAuditLogs();
      existingLogs.add(event.toJson());
      
      // Keep only the most recent entries
      if (existingLogs.length > _maxLogEntries) {
        existingLogs.removeRange(0, existingLogs.length - _maxLogEntries);
      }
      
      await _secureStorage.storeUserData(_auditLogKey, {
        'logs': existingLogs,
        'lastUpdated': DateTime.now().toIso8601String(),
      });
    } catch (e) {
      SecurityLogger.logError('Failed to store audit event: $e');
    }
  }
  
  /// Get audit logs
  Future<List<Map<String, dynamic>>> _getAuditLogs() async {
    try {
      final auditData = await _secureStorage.getUserData(_auditLogKey);
      if (auditData == null) return [];
      
      final logs = auditData['logs'] as List<dynamic>?;
      return logs?.cast<Map<String, dynamic>>() ?? [];
    } catch (e) {
      SecurityLogger.logError('Failed to get audit logs: $e');
      return [];
    }
  }
  
  /// Check for security violations
  Future<void> _checkSecurityViolations(SecurityEvent event) async {
    try {
      final recentLogs = await _getRecentLogs(Duration(minutes: 15));
      
      // Check for multiple failed authentication attempts
      if (event.type == SecurityEventType.authenticationFailure) {
        final failedAttempts = recentLogs
            .where((log) => 
                log['type'] == SecurityEventType.authenticationFailure.toString() &&
                log['isSuccessful'] == false)
            .length;
        
        if (failedAttempts >= 5) {
          await logSecurityEvent(SecurityEvent(
            type: SecurityEventType.securityViolation,
            timestamp: DateTime.now(),
            description: 'Multiple failed authentication attempts detected',
            metadata: {'failedAttempts': failedAttempts},
            isSuccessful: false,
          ));
        }
      }
      
      // Check for unusual data access patterns
      if (event.type == SecurityEventType.dataAccess) {
        final dataAccessCount = recentLogs
            .where((log) => log['type'] == SecurityEventType.dataAccess.toString())
            .length;
        
        if (dataAccessCount > 50) {
          await logSecurityEvent(SecurityEvent(
            type: SecurityEventType.securityViolation,
            timestamp: DateTime.now(),
            description: 'Unusual data access pattern detected',
            metadata: {'accessCount': dataAccessCount},
            isSuccessful: false,
          ));
        }
      }
    } catch (e) {
      SecurityLogger.logError('Failed to check security violations: $e');
    }
  }
  
  /// Get recent logs within time window
  Future<List<Map<String, dynamic>>> _getRecentLogs(Duration timeWindow) async {
    try {
      final allLogs = await _getAuditLogs();
      final cutoffTime = DateTime.now().subtract(timeWindow);
      
      return allLogs.where((log) {
        final timestamp = DateTime.parse(log['timestamp'] as String);
        return timestamp.isAfter(cutoffTime);
      }).toList();
    } catch (e) {
      SecurityLogger.logError('Failed to get recent logs: $e');
      return [];
    }
  }
  
  /// Get security audit report
  Future<Map<String, dynamic>> getSecurityAuditReport() async {
    try {
      final allLogs = await _getAuditLogs();
      final last24Hours = await _getRecentLogs(Duration(hours: 24));
      final last7Days = await _getRecentLogs(Duration(days: 7));
      
      final report = {
        'totalEvents': allLogs.length,
        'last24Hours': {
          'totalEvents': last24Hours.length,
          'authenticationAttempts': _countEventType(last24Hours, SecurityEventType.authenticationAttempt),
          'authenticationFailures': _countEventType(last24Hours, SecurityEventType.authenticationFailure),
          'dataAccess': _countEventType(last24Hours, SecurityEventType.dataAccess),
          'securityViolations': _countEventType(last24Hours, SecurityEventType.securityViolation),
        },
        'last7Days': {
          'totalEvents': last7Days.length,
          'authenticationAttempts': _countEventType(last7Days, SecurityEventType.authenticationAttempt),
          'authenticationFailures': _countEventType(last7Days, SecurityEventType.authenticationFailure),
          'dataAccess': _countEventType(last7Days, SecurityEventType.dataAccess),
          'securityViolations': _countEventType(last7Days, SecurityEventType.securityViolation),
        },
        'generatedAt': DateTime.now().toIso8601String(),
      };
      
      return report;
    } catch (e) {
      SecurityLogger.logError('Failed to generate security audit report: $e');
      return {};
    }
  }
  
  int _countEventType(List<Map<String, dynamic>> logs, SecurityEventType type) {
    return logs.where((log) => log['type'] == type.toString()).length;
  }
  
  /// Clear old audit logs
  Future<void> clearOldAuditLogs({Duration? olderThan}) async {
    try {
      final cutoffTime = DateTime.now().subtract(olderThan ?? Duration(days: 90));
      final allLogs = await _getAuditLogs();
      
      final recentLogs = allLogs.where((log) {
        final timestamp = DateTime.parse(log['timestamp'] as String);
        return timestamp.isAfter(cutoffTime);
      }).toList();
      
      await _secureStorage.storeUserData(_auditLogKey, {
        'logs': recentLogs,
        'lastUpdated': DateTime.now().toIso8601String(),
      });
      
      SecurityLogger.logInfo('Cleared ${allLogs.length - recentLogs.length} old audit logs');
    } catch (e) {
      SecurityLogger.logError('Failed to clear old audit logs: $e');
    }
  }
}