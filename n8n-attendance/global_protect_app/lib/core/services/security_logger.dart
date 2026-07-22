import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';

class SecurityLogger {
  static const List<String> _sensitivePatterns = [
    r'password',
    r'token',
    r'secret',
    r'key',
    r'auth',
    r'credential',
    r'latitude',
    r'longitude',
    r'location',
    r'email',
    r'phone',
    r'address',
  ];
  
  static const String _redactedText = '[REDACTED]';
  
  /// Log info message with sensitive data filtering
  static void logInfo(String message, {String? tag}) {
    final sanitizedMessage = _sanitizeMessage(message);
    if (kDebugMode) {
      developer.log(
        sanitizedMessage,
        name: tag ?? 'SecurityLogger',
        level: 800, // Info level
      );
    }
  }
  
  /// Log warning message with sensitive data filtering
  static void logWarning(String message, {String? tag}) {
    final sanitizedMessage = _sanitizeMessage(message);
    if (kDebugMode) {
      developer.log(
        sanitizedMessage,
        name: tag ?? 'SecurityLogger',
        level: 900, // Warning level
      );
    }
  }
  
  /// Log error message with sensitive data filtering
  static void logError(String message, {String? tag, Object? error}) {
    final sanitizedMessage = _sanitizeMessage(message);
    final sanitizedError = error != null ? _sanitizeMessage(error.toString()) : null;
    
    if (kDebugMode) {
      developer.log(
        sanitizedMessage,
        name: tag ?? 'SecurityLogger',
        level: 1000, // Error level
        error: sanitizedError,
      );
    }
  }
  
  /// Log security event (always logged, even in release mode)
  static void logSecurityEvent(String event, Map<String, dynamic> details) {
    final sanitizedDetails = _sanitizeMap(details);
    final message = 'Security Event: $event - Details: $sanitizedDetails';
    
    developer.log(
      message,
      name: 'SecurityAudit',
      level: 1200, // Critical level
    );
  }
  
  /// Sanitize message to remove sensitive data
  static String _sanitizeMessage(String message) {
    String sanitized = message;
    
    for (final pattern in _sensitivePatterns) {
      // Replace sensitive key-value pairs
      final regex = RegExp(
        r'"?' + '$pattern"?\\s*[:=]\\s*["\']?[^\\s,}\\]"\']+',
        caseSensitive: false,
      );
      sanitized = sanitized.replaceAll(regex, '"$pattern": "$_redactedText"');
      
      // Replace standalone sensitive values
      final valueRegex = RegExp(
        r'\b' + pattern + r'\s*[:=]\s*\S+',
        caseSensitive: false,
      );
      sanitized = sanitized.replaceAll(valueRegex, '$pattern: $_redactedText');
    }
    
    // Redact potential tokens (long alphanumeric strings)
    sanitized = sanitized.replaceAll(
      RegExp(r'\b[A-Za-z0-9]{32,}\b'),
      _redactedText,
    );
    
    // Redact email addresses
    sanitized = sanitized.replaceAll(
      RegExp(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
      _redactedText,
    );
    
    // Redact phone numbers
    sanitized = sanitized.replaceAll(
      RegExp(r'\b\+?[1-9]\d{1,14}\b'),
      _redactedText,
    );
    
    return sanitized;
  }
  
  /// Sanitize map data
  static Map<String, dynamic> _sanitizeMap(Map<String, dynamic> data) {
    final sanitized = <String, dynamic>{};
    
    for (final entry in data.entries) {
      final key = entry.key.toLowerCase();
      final value = entry.value;
      
      bool isSensitive = _sensitivePatterns.any(
        (pattern) => key.contains(pattern.toLowerCase()),
      );
      
      if (isSensitive) {
        sanitized[entry.key] = _redactedText;
      } else if (value is Map<String, dynamic>) {
        sanitized[entry.key] = _sanitizeMap(value);
      } else if (value is String) {
        sanitized[entry.key] = _sanitizeMessage(value);
      } else {
        sanitized[entry.key] = value;
      }
    }
    
    return sanitized;
  }
  
  /// Check if message contains sensitive data
  static bool containsSensitiveData(String message) {
    final lowerMessage = message.toLowerCase();
    return _sensitivePatterns.any(
      (pattern) => lowerMessage.contains(pattern.toLowerCase()),
    );
  }
}