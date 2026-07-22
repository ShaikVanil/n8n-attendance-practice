class AppConstants {
  // App Information
  static const String appName = 'Global Protect';
  static const String appVersion = '1.0.0';
  
  // Location Settings
  static const double defaultOfficeRadius = 100.0; // meters
  static const double locationAccuracyThreshold = 50.0; // meters
  static const Duration locationTimeout = Duration(seconds: 30);
  
  // Authentication
  static const Duration tokenRefreshThreshold = Duration(minutes: 5);
  static const int maxLoginAttempts = 3;
  
  // UI Constants
  static const Duration animationDuration = Duration(milliseconds: 300);
  static const double borderRadius = 12.0;
  static const double buttonHeight = 56.0;
  
  // Error Messages
  static const String networkErrorMessage = 'Please check your internet connection';
  static const String locationErrorMessage = 'Unable to get your location';
  static const String authErrorMessage = 'Authentication failed';
  static const String genericErrorMessage = 'Something went wrong';
}