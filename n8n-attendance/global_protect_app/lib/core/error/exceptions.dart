class ServerException implements Exception {
  final String message;
  ServerException([this.message = 'Server error occurred']);
}

class CacheException implements Exception {
  final String message;
  CacheException([this.message = 'Cache error occurred']);
}

class NetworkException implements Exception {
  final String message;
  NetworkException([this.message = 'Network error occurred']);
}

class LocationException implements Exception {
  final String message;
  LocationException([this.message = 'Location error occurred']);
}

// New API-specific exception classes for Story 6.2
class APIException implements Exception {
  final String message;
  final bool isTemporary;
  final bool canRetry;
  
  APIException(
    this.message, {
    required this.isTemporary,
    required this.canRetry,
  });
}

class TemporaryAPIException extends APIException {
  TemporaryAPIException(super.message)
      : super(isTemporary: true, canRetry: true);
}

class PermanentAPIException extends APIException {
  PermanentAPIException(super.message)
      : super(isTemporary: false, canRetry: false);
}

class AuthenticationException extends PermanentAPIException {
  AuthenticationException([String message = 'Authentication failed'])
      : super(message);
}

class RateLimitException extends TemporaryAPIException {
  RateLimitException([String message = 'Rate limit exceeded'])
      : super(message);
}