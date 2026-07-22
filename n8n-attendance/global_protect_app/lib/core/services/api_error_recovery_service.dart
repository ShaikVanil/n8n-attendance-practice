import 'package:dio/dio.dart';
import '../error/failures.dart';
import '../error/exceptions.dart';

enum APIErrorType {
  networkTimeout,
  serverError,
  authenticationError,
  rateLimitError,
  maintenanceError,
  unknownError,
}

class APIErrorDetails {
  final APIErrorType type;
  final String message;
  final String userFriendlyMessage;
  final bool isTemporary;
  final bool canRetry;
  final Duration? estimatedResolutionTime;
  final String? supportContact;

  const APIErrorDetails({
    required this.type,
    required this.message,
    required this.userFriendlyMessage,
    required this.isTemporary,
    required this.canRetry,
    this.estimatedResolutionTime,
    this.supportContact,
  });
}

class APIErrorRecoveryService {
  static const int maxRetryAttempts = 3;
  static const Duration baseRetryDelay = Duration(seconds: 2);
  static const String technicalSupportEmail = 'support@company.com';
  static const String technicalSupportPhone = '+1-800-SUPPORT';

  /// Analyzes API errors and provides detailed error information
  APIErrorDetails analyzeAPIError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return APIErrorDetails(
          type: APIErrorType.networkTimeout,
          message: 'Connection timeout: ${error.message}',
          userFriendlyMessage: 'Connection timed out. Please check your internet connection and try again.',
          isTemporary: true,
          canRetry: true,
          estimatedResolutionTime: Duration(minutes: 2),
        );

      case DioExceptionType.badResponse:
        return _handleBadResponse(error);

      case DioExceptionType.connectionError:
        return APIErrorDetails(
          type: APIErrorType.networkTimeout,
          message: 'Connection error: ${error.message}',
          userFriendlyMessage: 'Unable to connect to server. Please check your internet connection.',
          isTemporary: true,
          canRetry: true,
          estimatedResolutionTime: Duration(minutes: 1),
        );

      case DioExceptionType.cancel:
        return APIErrorDetails(
          type: APIErrorType.unknownError,
          message: 'Request cancelled',
          userFriendlyMessage: 'Request was cancelled. Please try again.',
          isTemporary: true,
          canRetry: true,
        );

      default:
        return APIErrorDetails(
          type: APIErrorType.unknownError,
          message: 'Unknown error: ${error.message}',
          userFriendlyMessage: 'An unexpected error occurred. Please try again.',
          isTemporary: true,
          canRetry: true,
          supportContact: technicalSupportEmail,
        );
    }
  }

  APIErrorDetails _handleBadResponse(DioException error) {
    final statusCode = error.response?.statusCode;
    final responseData = error.response?.data;

    switch (statusCode) {
      case 400:
        return APIErrorDetails(
          type: APIErrorType.unknownError,
          message: 'Bad request: ${responseData?['message'] ?? 'Invalid request'}',
          userFriendlyMessage: 'Invalid request. Please check your input and try again.',
          isTemporary: false,
          canRetry: false,
        );

      case 401:
        return APIErrorDetails(
          type: APIErrorType.authenticationError,
          message: 'Authentication failed',
          userFriendlyMessage: 'Your session has expired. Please log in again.',
          isTemporary: false,
          canRetry: false,
        );

      case 403:
        return APIErrorDetails(
          type: APIErrorType.authenticationError,
          message: 'Access forbidden',
          userFriendlyMessage: 'You do not have permission to perform this action.',
          isTemporary: false,
          canRetry: false,
        );

      case 429:
        return APIErrorDetails(
          type: APIErrorType.rateLimitError,
          message: 'Rate limit exceeded',
          userFriendlyMessage: 'Too many requests. Please wait a moment before trying again.',
          isTemporary: true,
          canRetry: true,
          estimatedResolutionTime: Duration(minutes: 5),
        );

      case 500:
      case 502:
      case 503:
        return APIErrorDetails(
          type: APIErrorType.serverError,
          message: 'Server error: $statusCode',
          userFriendlyMessage: 'Server is experiencing issues. Please try again in a few minutes.',
          isTemporary: true,
          canRetry: true,
          estimatedResolutionTime: Duration(minutes: 10),
          supportContact: technicalSupportEmail,
        );

      case 504:
        return APIErrorDetails(
          type: APIErrorType.networkTimeout,
          message: 'Gateway timeout',
          userFriendlyMessage: 'Server response timed out. Please try again.',
          isTemporary: true,
          canRetry: true,
          estimatedResolutionTime: Duration(minutes: 5),
        );

      default:
        return APIErrorDetails(
          type: APIErrorType.serverError,
          message: 'HTTP error: $statusCode',
          userFriendlyMessage: 'Server error occurred. Please try again later.',
          isTemporary: true,
          canRetry: true,
          estimatedResolutionTime: Duration(minutes: 15),
          supportContact: technicalSupportEmail,
        );
    }
  }

  /// Implements retry mechanism with exponential backoff
  Future<T> retryWithBackoff<T>(
    Future<T> Function() operation, {
    int maxAttempts = maxRetryAttempts,
    Duration baseDelay = baseRetryDelay,
  }) async {
    int attempt = 0;
    
    while (attempt < maxAttempts) {
      try {
        return await operation();
      } on DioException catch (e) {
        final errorDetails = analyzeAPIError(e);
        
        // Don't retry if error is not temporary or retryable
        if (!errorDetails.isTemporary || !errorDetails.canRetry) {
          throw e;
        }
        
        attempt++;
        
        // If this was the last attempt, throw the error
        if (attempt >= maxAttempts) {
          throw e;
        }
        
        // Calculate exponential backoff delay
        final delay = Duration(
          milliseconds: (baseDelay.inMilliseconds * (1 << attempt)).toInt(),
        );
        
        await Future.delayed(delay);
      }
    }
    
    throw Exception('Max retry attempts exceeded');
  }

  /// Checks if offline mode should be activated
  bool shouldActivateOfflineMode(APIErrorDetails errorDetails) {
    return errorDetails.type == APIErrorType.networkTimeout ||
           errorDetails.type == APIErrorType.serverError;
  }

  /// Gets technical support contact information
  Map<String, String> getTechnicalSupportInfo() {
    return {
      'email': technicalSupportEmail,
      'phone': technicalSupportPhone,
      'hours': 'Monday-Friday, 9 AM - 5 PM EST',
      'website': 'https://support.company.com',
    };
  }

  /// Generates error report data
  Map<String, dynamic> generateErrorReport(APIErrorDetails errorDetails, {
    String? userId,
    String? deviceInfo,
    String? appVersion,
  }) {
    return {
      'errorType': errorDetails.type.toString(),
      'message': errorDetails.message,
      'timestamp': DateTime.now().toIso8601String(),
      'userId': userId,
      'deviceInfo': deviceInfo,
      'appVersion': appVersion,
      'isTemporary': errorDetails.isTemporary,
      'canRetry': errorDetails.canRetry,
    };
  }
}