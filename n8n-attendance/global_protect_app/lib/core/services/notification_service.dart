import 'dart:async';
import 'dart:io';
import 'dart:ui';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../features/notifications/domain/entities/notification.dart';
import '../../features/notifications/domain/entities/notification_preferences.dart';
import '../../features/notifications/domain/repositories/notification_repository.dart';

class NotificationService {
  final FlutterLocalNotificationsPlugin _flutterLocalNotificationsPlugin;
  final NotificationRepository _repository;
  
  static const String _channelId = 'attendance_notifications';
  static const String _channelName = 'Attendance Notifications';
  static const String _channelDescription = 'Notifications for attendance status updates';

  NotificationService({
    required FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin,
    required NotificationRepository repository,
  }) : _flutterLocalNotificationsPlugin = flutterLocalNotificationsPlugin,
       _repository = repository;

  Future<void> initialize() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    
    const initializationSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _flutterLocalNotificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    await _createNotificationChannel();
    await _requestPermissions();
  }

  Future<void> _createNotificationChannel() async {
    const androidChannel = AndroidNotificationChannel(
      _channelId,
      _channelName,
      description: _channelDescription,
      importance: Importance.high,
      enableVibration: true,
      enableLights: true,
    );

    await _flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);
  }

  Future<void> _requestPermissions() async {
    if (Platform.isAndroid) {
      await Permission.notification.request();
    }
  }

  Future<void> showNotification(AppNotification notification) async {
    final preferences = await _repository.getPreferences();
    
    if (!preferences.enableNotifications) return;
    if (!_shouldShowNotification(notification, preferences)) return;

    final androidDetails = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: _channelDescription,
      importance: _getImportance(notification.priority),
      priority: _getPriority(notification.priority),
      enableVibration: preferences.enableVibration,
      playSound: preferences.enableSound,
      enableLights: preferences.enableLED,
      color: _getNotificationColor(notification.type),
      actions: notification.actions?.map((action) => AndroidNotificationAction(
        action.id,
        action.label,
      )).toList(),
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _flutterLocalNotificationsPlugin.show(
      notification.id.hashCode,
      notification.title,
      notification.message,
      details,
      payload: notification.id,
    );
  }

  Future<void> showSuccessNotification(String title, String message, {Map<String, dynamic>? data}) async {
    final notification = AppNotification(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: title,
      message: message,
      type: NotificationType.success,
      timestamp: DateTime.now(),
      data: data,
      priority: NotificationPriority.normal,
    );
    
    await showNotification(notification);
  }

  Future<void> showErrorNotification(String title, String message, {List<NotificationAction>? actions, Map<String, dynamic>? data}) async {
    final notification = AppNotification(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: title,
      message: message,
      type: NotificationType.error,
      timestamp: DateTime.now(),
      actions: actions,
      data: data,
      priority: NotificationPriority.high,
    );
    
    await showNotification(notification);
  }

  Future<void> showSyncNotification(String title, String message, {Map<String, dynamic>? data}) async {
    final notification = AppNotification(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: title,
      message: message,
      type: NotificationType.sync,
      timestamp: DateTime.now(),
      data: data,
      priority: NotificationPriority.normal,
    );
    
    await showNotification(notification);
  }

  bool _shouldShowNotification(AppNotification notification, NotificationPreferences preferences) {
    // Check if notification type is enabled
    if (preferences.typePreferences[notification.type] != true) {
      return false;
    }

    // Check minimum priority
    if (notification.priority.index < preferences.minimumPriority.index) {
      return false;
    }

    // Check quiet hours
    if (preferences.quietHours != null && _isInQuietHours(preferences.quietHours!)) {
      return false;
    }

    return true;
  }

  bool _isInQuietHours(TimeRange quietHours) {
    final now = DateTime.now();
    final currentMinutes = now.hour * 60 + now.minute;
    final startMinutes = quietHours.startHour * 60 + quietHours.startMinute;
    final endMinutes = quietHours.endHour * 60 + quietHours.endMinute;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Quiet hours span midnight
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  Importance _getImportance(NotificationPriority priority) {
    switch (priority) {
      case NotificationPriority.low:
        return Importance.low;
      case NotificationPriority.normal:
        return Importance.defaultImportance;
      case NotificationPriority.high:
        return Importance.high;
      case NotificationPriority.urgent:
        return Importance.max;
    }
  }

  Priority _getPriority(NotificationPriority priority) {
    switch (priority) {
      case NotificationPriority.low:
        return Priority.low;
      case NotificationPriority.normal:
        return Priority.defaultPriority;
      case NotificationPriority.high:
        return Priority.high;
      case NotificationPriority.urgent:
        return Priority.max;
    }
  }

  Color? _getNotificationColor(NotificationType type) {
    switch (type) {
      case NotificationType.success:
        return const Color(0xFF4CAF50);
      case NotificationType.error:
        return const Color(0xFFF44336);
      case NotificationType.sync:
        return const Color(0xFF2196F3);
      case NotificationType.reminder:
        return const Color(0xFFFF9800);
      case NotificationType.info:
        return const Color(0xFF607D8B);
      case NotificationType.warning:
        return const Color(0xFFFF5722);
    }
  }

  void _onNotificationTapped(NotificationResponse response) {
    // Handle notification tap
    // Navigate to appropriate screen based on notification data
  }

  Future<void> cancelNotification(int id) async {
    await _flutterLocalNotificationsPlugin.cancel(id);
  }

  Future<void> cancelAllNotifications() async {
    await _flutterLocalNotificationsPlugin.cancelAll();
  }
}