import 'package:equatable/equatable.dart';
import 'package:global_protect_app/features/notifications/domain/entities/notification.dart';

class NotificationPreferences extends Equatable {
  final bool enableNotifications;
  final bool enableSuccessNotifications;
  final bool enableErrorNotifications;
  final bool enableSyncNotifications;
  final bool enableRichNotifications;
  final bool enableSound;
  final bool enableVibration;
  final bool enableLED;
  final String soundType;
  final bool respectDoNotDisturb;
  final Map<NotificationType, bool> typePreferences;
  final NotificationPriority minimumPriority;
  final TimeRange? quietHours;

  const NotificationPreferences({
    this.enableNotifications = true,
    this.enableSuccessNotifications = true,
    this.enableErrorNotifications = true,
    this.enableSyncNotifications = true,
    this.enableRichNotifications = true,
    this.enableSound = true,
    this.enableVibration = true,
    this.enableLED = true,
    this.soundType = 'default',
    this.respectDoNotDisturb = true,
    this.typePreferences = const {},
    this.minimumPriority = NotificationPriority.low,
    this.quietHours,
  });

  NotificationPreferences copyWith({
    bool? enableNotifications,
    bool? enableSuccessNotifications,
    bool? enableErrorNotifications,
    bool? enableSyncNotifications,
    bool? enableRichNotifications,
    bool? enableSound,
    bool? enableVibration,
    bool? enableLED,
    String? soundType,
    bool? respectDoNotDisturb,
    Map<NotificationType, bool>? typePreferences,
    NotificationPriority? minimumPriority,
    TimeRange? quietHours,
  }) {
    return NotificationPreferences(
      enableNotifications: enableNotifications ?? this.enableNotifications,
      enableSuccessNotifications: enableSuccessNotifications ?? this.enableSuccessNotifications,
      enableErrorNotifications: enableErrorNotifications ?? this.enableErrorNotifications,
      enableSyncNotifications: enableSyncNotifications ?? this.enableSyncNotifications,
      enableRichNotifications: enableRichNotifications ?? this.enableRichNotifications,
      enableSound: enableSound ?? this.enableSound,
      enableVibration: enableVibration ?? this.enableVibration,
      enableLED: enableLED ?? this.enableLED,
      soundType: soundType ?? this.soundType,
      respectDoNotDisturb: respectDoNotDisturb ?? this.respectDoNotDisturb,
      typePreferences: typePreferences ?? this.typePreferences,
      minimumPriority: minimumPriority ?? this.minimumPriority,
      quietHours: quietHours ?? this.quietHours,
    );
  }

  @override
  List<Object?> get props => [
        enableNotifications,
        enableSuccessNotifications,
        enableErrorNotifications,
        enableSyncNotifications,
        enableRichNotifications,
        enableSound,
        enableVibration,
        enableLED,
        soundType,
        respectDoNotDisturb,
        typePreferences,
        minimumPriority,
        quietHours,
      ];
}

class TimeRange extends Equatable {
  final int startHour;
  final int startMinute;
  final int endHour;
  final int endMinute;

  const TimeRange({
    required this.startHour,
    required this.startMinute,
    required this.endHour,
    required this.endMinute,
  });

  @override
  List<Object?> get props => [startHour, startMinute, endHour, endMinute];
}