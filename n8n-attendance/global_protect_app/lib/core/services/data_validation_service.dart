import 'package:dartz/dartz.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../error/failures.dart';
import '../../features/clock_in/domain/entities/attendance_record.dart';

class ValidationResult {
  final bool isValid;
  final String? errorMessage;
  final ValidationSeverity severity;
  final String? suggestion;

  const ValidationResult({
    required this.isValid,
    this.errorMessage,
    this.severity = ValidationSeverity.error,
    this.suggestion,
  });

  factory ValidationResult.valid() => const ValidationResult(isValid: true);
  
  factory ValidationResult.error(String message, {String? suggestion}) => 
    ValidationResult(
      isValid: false, 
      errorMessage: message, 
      severity: ValidationSeverity.error,
      suggestion: suggestion,
    );
    
  factory ValidationResult.warning(String message, {String? suggestion}) => 
    ValidationResult(
      isValid: false, 
      errorMessage: message, 
      severity: ValidationSeverity.warning,
      suggestion: suggestion,
    );
}

enum ValidationSeverity { error, warning, info }

class DataValidationService {
  static const double _maxLocationAccuracy = 50.0; // meters
  static const double _minWorkingHours = 0.5; // 30 minutes
  static const double _maxWorkingHours = 16.0; // 16 hours
  static const int _duplicatePreventionMinutes = 5;
  static const double _maxReasonableDistance = 1000.0; // 1km from office
  
  // Office location coordinates (should be configurable)
  static const double _officeLatitude = 37.7749;
  static const double _officeLongitude = -122.4194;
  
  /// Validates clock-in data before submission
  Future<ValidationResult> validateClockInData({
    required String location,
    String? notes,
    AttendanceRecord? currentAttendance,
    List<AttendanceRecord>? recentAttendance,
  }) async {
    // Check for duplicate clock-in
    final duplicateCheck = _validateDuplicateClockIn(currentAttendance, recentAttendance);
    if (!duplicateCheck.isValid) return duplicateCheck;
    
    // Validate location format and accuracy
    final locationCheck = await _validateLocationData(location);
    if (!locationCheck.isValid) return locationCheck;
    
    // Validate notes if provided
    final notesCheck = _validateNotes(notes);
    if (!notesCheck.isValid) return notesCheck;
    
    // Check for unusual patterns
    final patternCheck = _validateAttendancePattern(recentAttendance);
    if (!patternCheck.isValid) return patternCheck;
    
    return ValidationResult.valid();
  }
  
  /// Validates clock-out data before submission
  Future<ValidationResult> validateClockOutData({
    required String attendanceId,
    required AttendanceRecord currentAttendance,
    String? notes,
    String? location,
  }) async {
    // Validate attendance ID
    if (attendanceId.isEmpty) {
      return ValidationResult.error('Invalid attendance record');
    }
    
    // Check if already clocked out
    if (currentAttendance.clockOutTime != null) {
      return ValidationResult.error('You have already clocked out for this session');
    }
    
    // Validate minimum working time
    final workingTimeCheck = _validateWorkingTime(currentAttendance.clockInTime);
    if (!workingTimeCheck.isValid) return workingTimeCheck;
    
    // Validate location if provided
    if (location != null) {
      final locationCheck = await _validateLocationData(location);
      if (!locationCheck.isValid) return locationCheck;
    }
    
    // Validate notes if provided
    final notesCheck = _validateNotes(notes);
    if (!notesCheck.isValid) return notesCheck;
    
    return ValidationResult.valid();
  }
  
  /// Real-time validation for form inputs
  ValidationResult validateLocationInput(String locationInput) {
    if (locationInput.isEmpty) {
      return ValidationResult.error('Location is required');
    }
    
    final coordinates = locationInput.split(',');
    if (coordinates.length != 2) {
      return ValidationResult.error('Invalid location format. Expected: latitude,longitude');
    }
    
    try {
      final lat = double.parse(coordinates[0].trim());
      final lng = double.parse(coordinates[1].trim());
      
      if (lat < -90 || lat > 90) {
        return ValidationResult.error('Invalid latitude. Must be between -90 and 90');
      }
      
      if (lng < -180 || lng > 180) {
        return ValidationResult.error('Invalid longitude. Must be between -180 and 180');
      }
      
      return ValidationResult.valid();
    } catch (e) {
      return ValidationResult.error('Location coordinates must be valid numbers');
    }
  }
  
  ValidationResult validateNotesInput(String? notes) {
    if (notes == null || notes.isEmpty) {
      return ValidationResult.valid();
    }
    
    if (notes.length > 500) {
      return ValidationResult.error('Notes cannot exceed 500 characters');
    }
    
    // Check for inappropriate content (basic check)
    final inappropriateWords = ['spam', 'test123', 'asdf'];
    final lowerNotes = notes.toLowerCase();
    
    for (final word in inappropriateWords) {
      if (lowerNotes.contains(word)) {
        return ValidationResult.warning(
          'Please provide meaningful notes for your attendance record',
          suggestion: 'Add a brief description of your work or reason for the timing',
        );
      }
    }
    
    return ValidationResult.valid();
  }
  
  // Private validation methods
  
  ValidationResult _validateDuplicateClockIn(
    AttendanceRecord? currentAttendance,
    List<AttendanceRecord>? recentAttendance,
  ) {
    // Check if already clocked in
    if (currentAttendance != null && currentAttendance.clockOutTime == null) {
      return ValidationResult.error(
        'You are already clocked in since ${_formatTime(currentAttendance.clockInTime)}',
        suggestion: 'Please clock out first before starting a new session',
      );
    }
    
    // Check for recent clock-ins within prevention window
    if (recentAttendance != null) {
      final now = DateTime.now();
      final preventionWindow = now.subtract(Duration(minutes: _duplicatePreventionMinutes));
      
      for (final record in recentAttendance) {
        if (record.clockInTime.isAfter(preventionWindow)) {
          return ValidationResult.error(
            'You recently clocked in at ${_formatTime(record.clockInTime)}. Please wait ${_duplicatePreventionMinutes} minutes between clock-ins',
            suggestion: 'If this was an error, please contact your supervisor',
          );
        }
      }
    }
    
    return ValidationResult.valid();
  }
  
  Future<ValidationResult> _validateLocationData(String location) async {
    final coordinates = location.split(',');
    if (coordinates.length != 2) {
      return ValidationResult.error('Invalid location format');
    }
    
    try {
      final lat = double.parse(coordinates[0].trim());
      final lng = double.parse(coordinates[1].trim());
      
      // Calculate distance from office
      final distanceInMeters = Geolocator.distanceBetween(
        _officeLatitude, _officeLongitude, lat, lng,
      );
      
      if (distanceInMeters > _maxReasonableDistance) {
        return ValidationResult.warning(
          'You appear to be ${(distanceInMeters / 1000).toStringAsFixed(1)}km from the office',
          suggestion: 'Please ensure you are at the correct location or use manual override if working remotely',
        );
      }
      
      return ValidationResult.valid();
    } catch (e) {
      return ValidationResult.error('Invalid location coordinates');
    }
  }
  
  ValidationResult _validateNotes(String? notes) {
    if (notes == null || notes.isEmpty) {
      return ValidationResult.valid();
    }
    
    if (notes.length > 500) {
      return ValidationResult.error('Notes cannot exceed 500 characters');
    }
    
    if (notes.trim().length < 3) {
      return ValidationResult.warning(
        'Notes are very short',
        suggestion: 'Consider adding more detail about your work or timing',
      );
    }
    
    return ValidationResult.valid();
  }
  
  ValidationResult _validateWorkingTime(DateTime? clockInTime) {
    final now = DateTime.now();
    final workingDuration = clockInTime != null ? now.difference(clockInTime) : Duration.zero;
    final workingHours = workingDuration.inMinutes / 60.0;
    
    if (workingHours < _minWorkingHours) {
      return ValidationResult.warning(
        'You have only worked for ${workingDuration.inMinutes} minutes',
        suggestion: 'Consider if this is the correct time to clock out',
      );
    }
    
    if (workingHours > _maxWorkingHours) {
      return ValidationResult.warning(
        'You have been clocked in for ${workingHours.toStringAsFixed(1)} hours',
        suggestion: 'Please verify this is correct or contact your supervisor',
      );
    }
    
    return ValidationResult.valid();
  }
  
  ValidationResult _validateAttendancePattern(List<AttendanceRecord>? recentAttendance) {
    if (recentAttendance == null || recentAttendance.length < 3) {
      return ValidationResult.valid();
    }
    
    // Check for unusual patterns (e.g., multiple short sessions)
    final today = DateTime.now();
    final todayRecords = recentAttendance.where((record) => 
      record.clockInTime.day == today.day &&
      record.clockInTime.month == today.month &&
      record.clockInTime.year == today.year
    ).toList();
    
    if (todayRecords.length >= 3) {
      return ValidationResult.warning(
        'You have already clocked in ${todayRecords.length} times today',
        suggestion: 'Please confirm this is intentional or contact your supervisor',
      );
    }
    
    return ValidationResult.valid();
  }
  
  String _formatTime(DateTime? time) {
    return '${time?.hour.toString().padLeft(2, '0')}:${time?.minute.toString().padLeft(2, '0')}';
  }
}