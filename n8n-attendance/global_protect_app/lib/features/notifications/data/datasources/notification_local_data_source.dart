import 'package:flutter/material.dart';

import '../models/notification_model.dart';
import '../../domain/entities/notification.dart';
import '../../domain/entities/notification_preferences.dart';
import '../../../../core/services/secure_storage_service.dart';
import 'dart:convert';

abstract class NotificationLocalDataSource {
  Future<void> cacheNotifications(List<AppNotification> notifications);
  Future<List<AppNotification>> getCachedNotifications();
  Future<void> savePreferences(NotificationPreferences preferences);
  Future<NotificationPreferences> getPreferences();
  Future<void> clearCache();
}

class NotificationLocalDataSourceImpl implements NotificationLocalDataSource {
  final SecureStorageService _secureStorage;

  static const String _notificationsKey = 'cached_notifications';
  static const String _preferencesKey = 'notification_preferences';

  NotificationLocalDataSourceImpl(this._secureStorage);

  @override
  Future<void> cacheNotifications(List<AppNotification> notifications) async {
    final notificationModels =
        notifications.map((n) => NotificationModel.fromEntity(n)).toList();
    final jsonList = notificationModels.map((n) => n.toJson()).toList();
    await _secureStorage.write(_notificationsKey, jsonEncode(jsonList));
  }

  @override
  Future<List<AppNotification>> getCachedNotifications() async {
    final jsonString = await _secureStorage.read(_notificationsKey);
    if (jsonString == null) return [];

    final jsonList = jsonDecode(jsonString) as List;
    return jsonList.map((json) => NotificationModel.fromJson(json)).toList();
  }

  @override
  Future<void> savePreferences(NotificationPreferences preferences) async {
    final json = {
      'enableSound': preferences.enableSound,
      'enableVibration': preferences.enableVibration,
      'enableLED': preferences.enableLED,
      'minimumPriority': preferences.minimumPriority.toString(),
      'quietHours': preferences.quietHours != null
          ? {
              'start':
                  '${preferences.quietHours!.startHour}:${preferences.quietHours!.startMinute}',
              'end':
                  '${preferences.quietHours!.endHour}:${preferences.quietHours!.endMinute}',
            }
          : null,
    };
    await _secureStorage.write(_preferencesKey, jsonEncode(json));
  }

  @override
  Future<NotificationPreferences> getPreferences() async {
    final jsonString = await _secureStorage.read(_preferencesKey);
    if (jsonString == null) {
      return const NotificationPreferences();
    }

    final json = jsonDecode(jsonString) as Map<String, dynamic>;
    return NotificationPreferences(
      enableSound: json['enableSound'] ?? true,
      enableVibration: json['enableVibration'] ?? true,
      enableLED: json['enableLED'] ?? true,
      minimumPriority: NotificationPriority.values.firstWhere(
        (p) => p.toString() == json['minimumPriority'],
        orElse: () => NotificationPriority.normal,
      ),
      quietHours: json['quietHours'] != null
          ? TimeRange(
              startHour: json['quietHours']['startHour'] ?? 22,
              startMinute: json['quietHours']['startMinute'] ?? 0,
              endHour: json['quietHours']['endHour'] ?? 6,
              endMinute: json['quietHours']['endMinute'] ?? 0,
            )
          : null,
    );
  }

  @override
  Future<void> clearCache() async {
    await _secureStorage.delete(_notificationsKey);
  }

  TimeOfDay _parseTimeOfDay(String timeString) {
    final parts = timeString.split(':');
    return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
  }
}
