import 'package:equatable/equatable.dart';

abstract class Failure extends Equatable {
  final String message;
  
  const Failure(this.message);
  
  @override
  List<Object> get props => [message];
}

class ServerFailure extends Failure {
  const ServerFailure(super.message);
}

class CacheFailure extends Failure {
  const CacheFailure(super.message);
}

class NetworkFailure extends Failure {
  const NetworkFailure(super.message);
}

class LocationFailure extends Failure {
  const LocationFailure(super.message);
}

// New API-specific failure classes for Story 6.2
class APIFailure extends Failure {
  final bool isTemporary;
  final bool canRetry;
  final Duration? estimatedResolutionTime;
  final String? supportContact;
  
  const APIFailure(
    super.message, {
    required this.isTemporary,
    required this.canRetry,
    this.estimatedResolutionTime,
    this.supportContact,
  });
  
  @override
  List<Object> get props => [
    message,
    isTemporary,
    canRetry,
    estimatedResolutionTime!,
    supportContact!,
  ];
}

class TemporaryAPIFailure extends APIFailure {
  const TemporaryAPIFailure(
    super.message, {
    super.canRetry = true,
    super.estimatedResolutionTime,
    super.supportContact,
  }) : super(isTemporary: true);
}

class PermanentAPIFailure extends APIFailure {
  const PermanentAPIFailure(
    super.message, {
    super.canRetry = false,
    super.supportContact,
  }) : super(isTemporary: false);
}

class AuthenticationFailure extends PermanentAPIFailure {
  const AuthenticationFailure(
    super.message, {
    super.supportContact,
  });
}

class RateLimitFailure extends TemporaryAPIFailure {
  const RateLimitFailure(
    super.message, {
    super.estimatedResolutionTime = const Duration(minutes: 5),
  });
}