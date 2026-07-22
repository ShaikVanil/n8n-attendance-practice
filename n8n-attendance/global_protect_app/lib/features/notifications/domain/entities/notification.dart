import 'package:equatable/equatable.dart';

class AppNotification extends Equatable {
  final String id;
  final String title;
  final String message;
  final NotificationType type;
  final DateTime timestamp;
  final Map<String, dynamic>? data;
  final List<NotificationAction>? actions;
  final bool isRead;
  final NotificationPriority priority;

  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.timestamp,
    this.data,
    this.actions,
    this.isRead = false,
    this.priority = NotificationPriority.normal,
  });

  AppNotification copyWith({
    String? id,
    String? title,
    String? message,
    NotificationType? type,
    DateTime? timestamp,
    Map<String, dynamic>? data,
    List<NotificationAction>? actions,
    bool? isRead,
    NotificationPriority? priority,
  }) {
    return AppNotification(
      id: id ?? this.id,
      title: title ?? this.title,
      message: message ?? this.message,
      type: type ?? this.type,
      timestamp: timestamp ?? this.timestamp,
      data: data ?? this.data,
      actions: actions ?? this.actions,
      isRead: isRead ?? this.isRead,
      priority: priority ?? this.priority,
    );
  }

  @override
  List<Object?> get props => [
        id,
        title,
        message,
        type,
        timestamp,
        data,
        actions,
        isRead,
        priority,
      ];
}

enum NotificationType {
  success,
  error,
  sync,
  reminder,
  info,
  warning,
}

enum NotificationPriority {
  low,
  normal,
  high,
  urgent,
}

class NotificationAction extends Equatable {
  final String id;
  final String label;
  final String action;
  final Map<String, dynamic>? data;

  const NotificationAction({
    required this.id,
    required this.label,
    required this.action,
    this.data,
  });

  @override
  List<Object?> get props => [id, label, action, data];
}