import 'package:global_protect_app/features/authentication/domain/entities/user.dart';

abstract class AuthEvent {}

class CheckAuthStatusEvent extends AuthEvent {}

class LoginEvent extends AuthEvent {
  final String email;
  final String password;

  LoginEvent({required this.email, required this.password});
}

class LogoutEvent extends AuthEvent {}

class LogoutRequestedEvent extends AuthEvent {}

class LogoutConfirmedEvent extends AuthEvent {}

class LogoutCancelledEvent extends AuthEvent {}

class RefreshTokenEvent extends AuthEvent {}

class StartTokenMonitoringEvent extends AuthEvent {}

class StopTokenMonitoringEvent extends AuthEvent {}

class TokenRefreshSuccessEvent extends AuthEvent {
  final User user;

  TokenRefreshSuccessEvent({required this.user});
}

class TokenRefreshFailedEvent extends AuthEvent {
  final String message;

  TokenRefreshFailedEvent({required this.message});
}