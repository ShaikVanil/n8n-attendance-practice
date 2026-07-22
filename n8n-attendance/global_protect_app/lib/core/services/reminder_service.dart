import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/timezone.dart';
import '../../features/clock_in/domain/entities/reminder.dart';
import '../../features/clock_in/domain/entities/attendance_record.dart';

class ReminderService {
  static const String _channelId = 'clock_out_reminders';
  static const String _channelName = 'Clock-Out Reminders';
  static const String _channelDescription = 'Notifications for clock-out reminders';
  
  final FlutterLocalNotificationsPlugin _notificationsPlugin;
  final SharedPreferences _prefs;
  Timer? _reminderTimer;
  
  ReminderService({
    required FlutterLocalNotificationsPlugin notificationsPlugin,
    required SharedPreferences prefs,
  }) : _notificationsPlugin = notificationsPlugin,
       _prefs = prefs;

  Future<void> initialize() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );
    
    await _notificationsPlugin.initialize(
      initSettings,
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
      playSound: true,
    );
    
    await _notificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);
  }

  Future<void> _requestPermissions() async {
    await Permission.notification.request();
    
    if (await Permission.scheduleExactAlarm.isDenied) {
      await Permission.scheduleExactAlarm.request();
    }
  }

  Future<void> scheduleReminder(Reminder reminder) async {
    if (!reminder.isEnabled) return;
    
    // Check do-not-disturb settings
    if (await _isDoNotDisturbActive()) {
      final respectDnd = _prefs.getBool('respect_dnd') ?? true;
      if (respectDnd) return;
    }
    
    final notificationDetails = _getNotificationDetails(reminder.type);
    
    await _notificationsPlugin.zonedSchedule(
      reminder.id.hashCode,
      'Time to Clock Out',
      _getReminderMessage(reminder),
      _convertToTZDateTime(reminder.scheduledTime),
      notificationDetails,
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
      payload: reminder.id,
    );
  }

  NotificationDetails _getNotificationDetails(ReminderType type) {
    switch (type) {
      case ReminderType.alarm:
        return const NotificationDetails(
          android: AndroidNotificationDetails(
            _channelId,
            _channelName,
            channelDescription: _channelDescription,
            importance: Importance.max,
            priority: Priority.high,
            enableVibration: true,
            playSound: true,
            fullScreenIntent: true,
            category: AndroidNotificationCategory.alarm,
            actions: [
              AndroidNotificationAction(
                'snooze_5',
                'Snooze 5 min',
                icon: DrawableResourceAndroidBitmap('ic_snooze'),
              ),
              AndroidNotificationAction(
                'clock_out_now',
                'Clock Out Now',
                icon: DrawableResourceAndroidBitmap('ic_clock_out'),
              ),
            ],
          ),
          iOS: DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
            interruptionLevel: InterruptionLevel.critical,
          ),
        );
      case ReminderType.vibration:
        return const NotificationDetails(
          android: AndroidNotificationDetails(
            _channelId,
            _channelName,
            channelDescription: _channelDescription,
            importance: Importance.high,
            priority: Priority.high,
            enableVibration: true,
            playSound: false,
          ),
          iOS: DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: false,
          ),
        );
      case ReminderType.silent:
        return const NotificationDetails(
          android: AndroidNotificationDetails(
            _channelId,
            _channelName,
            channelDescription: _channelDescription,
            importance: Importance.low,
            priority: Priority.low,
            enableVibration: false,
            playSound: false,
          ),
          iOS: DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: false,
          ),
        );
      default: // notification
        return const NotificationDetails(
          android: AndroidNotificationDetails(
            _channelId,
            _channelName,
            channelDescription: _channelDescription,
            importance: Importance.high,
            priority: Priority.high,
            enableVibration: true,
            playSound: true,
            actions: [
              AndroidNotificationAction(
                'snooze_5',
                'Snooze 5 min',
                icon: DrawableResourceAndroidBitmap('ic_snooze'),
              ),
              AndroidNotificationAction(
                'clock_out_now',
                'Clock Out Now',
                icon: DrawableResourceAndroidBitmap('ic_clock_out'),
              ),
            ],
          ),
          iOS: DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        );
    }
  }

  String _getReminderMessage(Reminder reminder) {
    final messages = [
      "Don't forget to clock out!",
      "Time to end your work day",
      "Remember to clock out before leaving",
      "Your work day is ending soon",
    ];
    return messages[reminder.id.hashCode % messages.length];
  }

  Future<bool> _isDoNotDisturbActive() async {
    // Platform-specific implementation to check DND status
    // This is a simplified version
    return false;
  }

  Future<void> snoozeReminder(String reminderId, Duration snoozeDuration) async {
    await cancelReminder(reminderId);
    
    // Reschedule with snooze duration
    final newTime = DateTime.now().add(snoozeDuration);
    // Implementation would reschedule the reminder
  }

  Future<void> cancelReminder(String reminderId) async {
    await _notificationsPlugin.cancel(reminderId.hashCode);
  }

  Future<void> cancelAllReminders() async {
    await _notificationsPlugin.cancelAll();
  }

  void _onNotificationTapped(NotificationResponse response) {
    final payload = response.payload;
    final actionId = response.actionId;
    
    if (actionId == 'snooze_5') {
      snoozeReminder(payload!, const Duration(minutes: 5));
    } else if (actionId == 'clock_out_now') {
      // Trigger clock out action
      _triggerClockOut();
    }
  }

  void _triggerClockOut() {
    // Implementation to trigger clock out
    // This would typically emit an event to the attendance bloc
  }

  TZDateTime _convertToTZDateTime(DateTime dateTime) {
    // Convert DateTime to TZDateTime for scheduling
    // Implementation depends on timezone package
    return TZDateTime.from(dateTime, getLocation('UTC'));
  }

  Future<List<Reminder>> generateSmartReminders(String userId, List<AttendanceRecord> history) async {
    final pattern = _analyzeWorkPattern(history);
    final reminders = <Reminder>[];
    
    if (pattern.confidence > 0.7) {
      // High confidence pattern - create smart reminder
      final reminderTime = DateTime.now().copyWith(
        hour: pattern.suggestedClockOutTime.hour,
        minute: pattern.suggestedClockOutTime.minute - 15, // 15 min before
      );
      
      reminders.add(Reminder(
        id: 'smart_${DateTime.now().millisecondsSinceEpoch}',
        userId: userId,
        scheduledTime: reminderTime,
        type: ReminderType.notification,
        frequency: ReminderFrequency.weekdays,
      ));
    }
    
    return reminders;
  }

  WorkPattern _analyzeWorkPattern(List<AttendanceRecord> history) {
    // Analyze work patterns from attendance history
    final clockInTimes = history.map((r) => r.clockInTime).toList();
    final clockOutTimes = history
        .where((r) => r.clockOutTime != null)
        .map((r) => r.clockOutTime!)
        .toList();
    
    // Calculate average work duration
    final durations = history
        .where((r) => r.clockOutTime != null)
        .map((r) => r.clockOutTime!.difference(r.clockInTime))
        .toList();
    
    final averageDuration = durations.isNotEmpty
        ? Duration(
            milliseconds: durations
                .map((d) => d.inMilliseconds)
                .reduce((a, b) => a + b) ~/
            durations.length)
        : const Duration(hours: 8);
    
    // Calculate suggested clock out time
    final avgClockOutHour = clockOutTimes.isNotEmpty
        ? clockOutTimes.map((t) => t.hour).reduce((a, b) => a + b) ~/
            clockOutTimes.length
        : 17;
    
    final avgClockOutMinute = clockOutTimes.isNotEmpty
        ? clockOutTimes.map((t) => t.minute).reduce((a, b) => a + b) ~/
            clockOutTimes.length
        : 0;
    
    final confidence = history.length >= 5 ? 0.8 : history.length * 0.15;
    
    return WorkPattern(
      userId: history.first.userId,
      clockInTimes: clockInTimes,
      clockOutTimes: clockOutTimes,
      averageWorkDuration: averageDuration,
      suggestedClockOutTime: TimeOfDay(hour: avgClockOutHour, minute: avgClockOutMinute),
      confidence: confidence,
    );
  }
}