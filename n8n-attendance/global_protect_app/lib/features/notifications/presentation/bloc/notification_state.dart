import 'package:equatable/equatable.dart';
import '../../domain/entities/notification.dart';
import '../../domain/entities/notification_preferences.dart';

abstract class NotificationState extends Equatable {
  const NotificationState();

  @override
  List<Object?> get props => [];
}

class NotificationInitial extends NotificationState {}

class NotificationLoading extends NotificationState {}

class NotificationsLoaded extends NotificationState {
  final List<AppNotification> notifications;
  final List<AppNotification> unreadNotifications;
  final NotificationPreferences preferences;

  const NotificationsLoaded({
    required this.notifications,
    required this.unreadNotifications,
    required this.preferences,
  });

  NotificationsLoaded copyWith({
    List<AppNotification>? notifications,
    List<AppNotification>? unreadNotifications,
    NotificationPreferences? preferences,
  }) {
    return NotificationsLoaded(
      notifications: notifications ?? this.notifications,
      unreadNotifications: unreadNotifications ?? this.unreadNotifications,
      preferences: preferences ?? this.preferences,
    );
  }

  @override
  List<Object> get props => [notifications, unreadNotifications, preferences];
}

class NotificationError extends NotificationState {
  final String message;

  const NotificationError(this.message);

  @override
  List<Object> get props => [message];
}

class NotificationPreferencesUpdated extends NotificationState {
  final NotificationPreferences preferences;

  const NotificationPreferencesUpdated(this.preferences);

  @override
  List<Object> get props => [preferences];
}