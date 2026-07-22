class ApiConstants {
  static const String baseUrl = 'http://10.0.2.2:3001/api';
  
  // Authentication endpoints
  static const String loginEndpoint = '/auth/login';
  static const String refreshEndpoint = '/auth/refresh';
  static const String logoutEndpoint = '/auth/logout';
  
  // Clock-in endpoints
  static const String checkinEndpoint = '/attendance/checkin';
  static const String checkoutEndpoint = '/attendance/checkout';
  
  // Location endpoints
  static const String locationEndpoint = '/location/verify';
  static const String officeLocationsEndpoint = '/locations';
  static const String officesWithDistancesEndpoint = '/locations/with-distances';
  static const String validateLocationEndpoint = '/locations/validate';
  
  // Request timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const Duration sendTimeout = Duration(seconds: 30);
  
  // Attendance endpoints
  static const String clockInEndpoint = '/attendance/checkin';
  static const String clockOutEndpoint = '/attendance/checkout'; // Changed from '/attendance/clock-out'
  static const String currentAttendanceEndpoint = '/attendance/status';
  static const String attendanceHistoryEndpoint = '/attendance/history';
  
  // WiFi Network endpoints
  static const String wifiNetworksEndpoint = '/system/wifi-networks/detection';
  static const String wifiNetworksAdminEndpoint = '/wifi/networks';
}