import '../entities/notification.dart';
import '../entities/notification_preferences.dart';

abstract class NotificationRepository {
  Future<void> saveNotification(AppNotification notification);
  Future<List<AppNotification>> getNotifications({
    int? limit,
    NotificationType? type,
    bool? unreadOnly,
  });
  Future<List<AppNotification>> getUnreadNotifications();
  Future<void> markAsRead(String notificationId);
  Future<void> markAllAsRead();
  Future<void> deleteNotification(String notificationId);
  Future<void> clearAllNotifications();
  Future<int> getUnreadCount();
  
  Future<void> savePreferences(NotificationPreferences preferences);
  Future<NotificationPreferences> getPreferences();
  
  Stream<List<AppNotification>> watchNotifications();
  Stream<int> watchUnreadCount();
  Stream<AppNotification> get notificationStream;
}