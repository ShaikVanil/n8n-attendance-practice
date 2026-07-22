import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz;
import '../injection/injection_container.dart';
import '../../features/location/domain/entities/office_location.dart';
import '../../features/location/domain/repositories/location_repository.dart';

class TimezoneService {
  String _currentOfficeTimezone = 'UTC';
  tz.Location? _officeLocation;
  
  String get currentOfficeTimezone => _currentOfficeTimezone;
  tz.Location get officeLocation => _officeLocation ?? tz.UTC;

  Future<void> initialize() async {
    // Initialize timezone database
    tz.initializeTimeZones();
    
    // Try to get current office timezone
    await _loadOfficeTimezone();
  }

  Future<void> _loadOfficeTimezone() async {
    try {
      final locationRepository = sl<LocationRepository>();
      final officeLocationsResult = await locationRepository.getOfficeLocations();
      
      officeLocationsResult.fold(
        (failure) {
          // Fallback to UTC if can't get office locations
          _setTimezone('UTC');
        },
        (offices) {
          if (offices.isNotEmpty) {
            // Use the first active office's timezone
            final activeOffice = offices.firstWhere(
              (office) => office.isActive,
              orElse: () => offices.first,
            );
            _setTimezone(activeOffice.timezone);
          } else {
            _setTimezone('UTC');
          }
        },
      );
    } catch (e) {
      print('Error loading office timezone: $e');
      _setTimezone('UTC');
    }
  }

  void _setTimezone(String timezone) {
    try {
      _currentOfficeTimezone = timezone;
      _officeLocation = tz.getLocation(timezone);
    } catch (e) {
      print('Invalid timezone $timezone, falling back to UTC: $e');
      _currentOfficeTimezone = 'UTC';
      _officeLocation = tz.UTC;
    }
  }

  /// Convert a UTC DateTime to office timezone
  DateTime convertToOfficeTime(DateTime utcDateTime) {
    if (utcDateTime.isUtc) {
      final tzDateTime = tz.TZDateTime.from(utcDateTime, officeLocation);
      return DateTime(
        tzDateTime.year,
        tzDateTime.month,
        tzDateTime.day,
        tzDateTime.hour,
        tzDateTime.minute,
        tzDateTime.second,
        tzDateTime.millisecond,
      );
    }
    // If not UTC, assume it's already in the correct timezone
    return utcDateTime;
  }

  /// Parse API time string and convert to office timezone
  DateTime parseApiTimeToOfficeTime(String timeString) {
    try {
      // Parse as UTC first
      DateTime utcTime;
      if (timeString.endsWith('Z') || timeString.contains('+') || timeString.contains('-')) {
        // Already has timezone info
        utcTime = DateTime.parse(timeString).toUtc();
      } else {
        // Assume UTC if no timezone info
        utcTime = DateTime.parse(timeString + 'Z');
      }
      
      return convertToOfficeTime(utcTime);
    } catch (e) {
      print('Error parsing time string $timeString: $e');
      return DateTime.now();
    }
  }

  /// Get current time in office timezone
  DateTime getCurrentOfficeTime() {
    final now = DateTime.now().toUtc();
    return convertToOfficeTime(now);
  }

  /// Update office timezone when office changes
  Future<void> updateOfficeTimezone(OfficeLocation office) async {
    _setTimezone(office.timezone);
  }

  /// Format time for display (always in office timezone)
  String formatTimeForDisplay(DateTime dateTime, {String pattern = 'MMM dd, yyyy • HH:mm'}) {
    final officeTime = dateTime.isUtc ? convertToOfficeTime(dateTime) : dateTime;
    return _formatDateTime(officeTime, pattern);
  }

  String _formatDateTime(DateTime dateTime, String pattern) {
    // Simple formatting - you can enhance this with intl package
    switch (pattern) {
      case 'HH:mm':
        return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
      case 'MMM dd, yyyy • HH:mm':
        final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return '${months[dateTime.month - 1]} ${dateTime.day.toString().padLeft(2, '0')}, ${dateTime.year} • ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
      default:
        return dateTime.toString();
    }
  }
}