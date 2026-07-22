import 'dart:async';
import 'dart:convert';
import '../../../../core/services/secure_storage_service.dart';
import '../../domain/entities/notification.dart';
import '../../domain/entities/notification_preferences.dart';
import '../../domain/repositories/notification_repository.dart';
import '../models/notification_model.dart';

class NotificationRepositoryImpl implements NotificationRepository {

  @override
  Stream<AppNotification> get notificationStream => _notificationController.stream;
  final SecureStorageService _storageService;
  final StreamController<AppNotification> _notificationController = StreamController<AppNotification>.broadcast();
  final StreamController<List<AppNotification>> _notificationsController = StreamController<List<AppNotification>>.broadcast();
  final StreamController<int> _unreadCountController = StreamController<int>.broadcast();
  
  static const String _notificationsKey = 'notifications';
  static const String _preferencesKey = 'notification_preferences';
  
  NotificationRepositoryImpl(this._storageService);

  @override
  Future<List<AppNotification>> getUnreadNotifications() async {
    return getNotifications(unreadOnly: true);
  }

  @override
  Future<void> saveNotification(AppNotification notification) async {
    final notifications = await getNotifications();
    notifications.insert(0, notification);
    
    // Keep only last 100 notifications
    if (notifications.length > 100) {
      notifications.removeRange(100, notifications.length);
    }
    
    final notificationModels = notifications.map((n) => NotificationModel.fromEntity(n)).toList();
    final jsonList = notificationModels.map((n) => n.toJson()).toList();
    
    await _storageService.write(_notificationsKey, jsonEncode(jsonList));
    _notificationController.add(notification);
    _notificationsController.add(notifications);
    _updateUnreadCount(notifications);
  }

  @override
  Future<List<AppNotification>> getNotifications({
    int? limit,
    NotificationType? type,
    bool? unreadOnly,
  }) async {
    final jsonString = await _storageService.read(_notificationsKey);
    if (jsonString == null) return [];
    
    final jsonList = jsonDecode(jsonString) as List;
    var notifications = jsonList.map((json) => NotificationModel.fromJson(json)).toList();
    
    // Apply filters
    if (type != null) {
      notifications = notifications.where((n) => n.type == type).toList();
    }
    
    if (unreadOnly == true) {
      notifications = notifications.where((n) => !n.isRead).toList();
    }
    
    // Apply limit
    if (limit != null && limit < notifications.length) {
      notifications = notifications.take(limit).toList();
    }
    
    return notifications;
  }

  @override
  Future<void> markAsRead(String notificationId) async {
    final notifications = await getNotifications();
    final index = notifications.indexWhere((n) => n.id == notificationId);
    
    if (index != -1) {
      notifications[index] = notifications[index].copyWith(isRead: true);
      
      final notificationModels = notifications.map((n) => NotificationModel.fromEntity(n)).toList();
      final jsonList = notificationModels.map((n) => n.toJson()).toList();
      
      await _storageService.write(_notificationsKey, jsonEncode(jsonList));
      _notificationsController.add(notifications);
      _updateUnreadCount(notifications);
    }
  }

  @override
  Future<void> markAllAsRead() async {
    final notifications = await getNotifications();
    final updatedNotifications = notifications.map((n) => n.copyWith(isRead: true)).toList();
    
    final notificationModels = updatedNotifications.map((n) => NotificationModel.fromEntity(n)).toList();
    final jsonList = notificationModels.map((n) => n.toJson()).toList();
    
    await _storageService.write(_notificationsKey, jsonEncode(jsonList));
    _notificationsController.add(updatedNotifications);
    _updateUnreadCount(updatedNotifications);
  }

  @override
  Future<void> deleteNotification(String notificationId) async {
    final notifications = await getNotifications();
    notifications.removeWhere((n) => n.id == notificationId);
    
    final notificationModels = notifications.map((n) => NotificationModel.fromEntity(n)).toList();
    final jsonList = notificationModels.map((n) => n.toJson()).toList();
    
    await _storageService.write(_notificationsKey, jsonEncode(jsonList));
    _notificationsController.add(notifications);
    _updateUnreadCount(notifications);
  }

  @override
  Future<void> clearAllNotifications() async {
    await _storageService.delete(_notificationsKey);
    _notificationsController.add([]);
    _unreadCountController.add(0);
  }

  @override
  Future<int> getUnreadCount() async {
    final notifications = await getNotifications(unreadOnly: true);
    return notifications.length;
  }

  @override
  Future<NotificationPreferences> getPreferences() async {
    final jsonString = await _storageService.read(_preferencesKey);
    if (jsonString == null) return const NotificationPreferences();
    
    final json = jsonDecode(jsonString);
    return NotificationPreferences(
      enableNotifications: json['enableNotifications'] ?? true,
      enableSuccessNotifications: json['enableSuccessNotifications'] ?? true,
      enableErrorNotifications: json['enableErrorNotifications'] ?? true,
      enableSyncNotifications: json['enableSyncNotifications'] ?? true,
      enableRichNotifications: json['enableRichNotifications'] ?? true,
      enableSound: json['enableSound'] ?? true,
      enableVibration: json['enableVibration'] ?? true,
      enableLED: json['enableLED'] ?? true,
      soundType: json['soundType'] ?? 'default',
      respectDoNotDisturb: json['respectDoNotDisturb'] ?? true,
      minimumPriority: NotificationPriority.values[json['minimumPriority'] ?? 0],
      quietHours: json['quietHours'] != null ? TimeRange(
        startHour: json['quietHours']['startHour'],
        startMinute: json['quietHours']['startMinute'],
        endHour: json['quietHours']['endHour'],
        endMinute: json['quietHours']['endMinute'],
      ) : null,
    );
  }

  @override
  Future<void> savePreferences(NotificationPreferences preferences) async {
    final json = {
      'enableNotifications': preferences.enableNotifications,
      'enableSuccessNotifications': preferences.enableSuccessNotifications,
      'enableErrorNotifications': preferences.enableErrorNotifications,
      'enableSyncNotifications': preferences.enableSyncNotifications,
      'enableRichNotifications': preferences.enableRichNotifications,
      'enableSound': preferences.enableSound,
      'enableVibration': preferences.enableVibration,
      'enableLED': preferences.enableLED,
      'soundType': preferences.soundType,
      'respectDoNotDisturb': preferences.respectDoNotDisturb,
      'minimumPriority': preferences.minimumPriority.index,
      'quietHours': preferences.quietHours != null ? {
        'startHour': preferences.quietHours!.startHour,
        'startMinute': preferences.quietHours!.startMinute,
        'endHour': preferences.quietHours!.endHour,
        'endMinute': preferences.quietHours!.endMinute,
      } : null,
    };
    
    await _storageService.write(_preferencesKey, jsonEncode(json));
  }

  @override
  Stream<List<AppNotification>> watchNotifications() {
    return _notificationsController.stream;
  }

  @override
  Stream<int> watchUnreadCount() {
    return _unreadCountController.stream;
  }

  void _updateUnreadCount(List<AppNotification> notifications) {
    final unreadCount = notifications.where((n) => !n.isRead).length;
    _unreadCountController.add(unreadCount);
  }
  
  void dispose() {
    _notificationController.close();
    _notificationsController.close();
    _unreadCountController.close();
  }
}