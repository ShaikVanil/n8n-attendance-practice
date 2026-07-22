import '../../domain/entities/notification.dart';

class NotificationModel extends AppNotification {
  const NotificationModel({
    required super.id,
    required super.title,
    required super.message,
    required super.type,
    required super.priority,
    required super.timestamp,
    super.isRead,
    super.data,
    super.actions,
  });

  factory NotificationModel.fromEntity(AppNotification notification) {
    return NotificationModel(
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      timestamp: notification.timestamp,
      isRead: notification.isRead,
      data: notification.data,
      actions: notification.actions,
    );
  }

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'],
      title: json['title'],
      message: json['message'],
      type: NotificationType.values.firstWhere(
        (e) => e.toString() == 'NotificationType.${json['type']}',
      ),
      priority: NotificationPriority.values.firstWhere(
        (e) => e.toString() == 'NotificationPriority.${json['priority']}',
      ),
      timestamp: DateTime.parse(json['timestamp']),
      isRead: json['isRead'] ?? false,
      data: json['data'],
      actions: json['actions'] != null
          ? (json['actions'] as List)
              .map((action) => NotificationAction(
                    id: action['id'],
                    label: action['label'],
                    action: action['action'],
                    data: action['data'],
                  ))
              .toList()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'message': message,
      'type': type.toString().split('.').last,
      'priority': priority.toString().split('.').last,
      'timestamp': timestamp.toIso8601String(),
      'isRead': isRead,
      'data': data,
      'actions': actions?.map((action) => {
        'id': action.id,
        'label': action.label,
        'action': action.action,
        'data': action.data,
      }).toList(),
    };
  }
}