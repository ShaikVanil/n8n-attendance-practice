import 'package:equatable/equatable.dart';
import '../../domain/entities/notification.dart';
import '../../domain/entities/notification_preferences.dart';

abstract class NotificationEvent extends Equatable {
  const NotificationEvent();

  @override
  List<Object?> get props => [];
}

class LoadNotificationsEvent extends NotificationEvent {
  final int? limit;
  final int? offset;

  const LoadNotificationsEvent({this.limit, this.offset});

  @override
  List<Object?> get props => [limit, offset];
}

class LoadUnreadNotificationsEvent extends NotificationEvent {}

class MarkNotificationAsReadEvent extends NotificationEvent {
  final String notificationId;

  const MarkNotificationAsReadEvent(this.notificationId);

  @override
  List<Object> get props => [notificationId];
}

class MarkAllNotificationsAsReadEvent extends NotificationEvent {}

class DeleteNotificationEvent extends NotificationEvent {
  final String notificationId;

  const DeleteNotificationEvent(this.notificationId);

  @override
  List<Object> get props => [notificationId];
}

class ClearAllNotificationsEvent extends NotificationEvent {}

class LoadNotificationPreferencesEvent extends NotificationEvent {}

class UpdateNotificationPreferencesEvent extends NotificationEvent {
  final NotificationPreferences preferences;

  const UpdateNotificationPreferencesEvent(this.preferences);

  @override
  List<Object> get props => [preferences];
}

class NotificationReceivedEvent extends NotificationEvent {
  final AppNotification notification;

  const NotificationReceivedEvent(this.notification);

  @override
  List<Object> get props => [notification];
}