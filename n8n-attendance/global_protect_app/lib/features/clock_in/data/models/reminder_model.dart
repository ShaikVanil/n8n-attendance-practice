import '../../domain/entities/reminder.dart';

class ReminderModel extends Reminder {
  const ReminderModel({
    required super.id,
    required super.userId,
    required super.scheduledTime,
    required super.type,
    super.isEnabled,
    super.snoozeCount,
    super.lastSnoozedAt,
    super.frequency,
    super.customSettings,
  });

  factory ReminderModel.fromEntity(Reminder reminder) {
    return ReminderModel(
      id: reminder.id,
      userId: reminder.userId,
      scheduledTime: reminder.scheduledTime,
      type: reminder.type,
      isEnabled: reminder.isEnabled,
      snoozeCount: reminder.snoozeCount,
      lastSnoozedAt: reminder.lastSnoozedAt,
      frequency: reminder.frequency,
      customSettings: reminder.customSettings,
    );
  }

  factory ReminderModel.fromJson(Map<String, dynamic> json) {
    return ReminderModel(
      id: json['id'],
      userId: json['userId'],
      scheduledTime: DateTime.parse(json['scheduledTime']),
      type: ReminderType.values.firstWhere(
        (e) => e.toString() == 'ReminderType.${json['type']}',
      ),
      isEnabled: json['isEnabled'] ?? true,
      snoozeCount: json['snoozeCount'] ?? 0,
      lastSnoozedAt: json['lastSnoozedAt'] != null
          ? DateTime.parse(json['lastSnoozedAt'])
          : null,
      frequency: json['frequency'] != null
          ? ReminderFrequency.values.firstWhere(
              (e) => e.toString() == 'ReminderFrequency.${json['frequency']}',
              orElse: () => ReminderFrequency.daily,
            )
          : ReminderFrequency.daily,
      customSettings: json['customSettings'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'scheduledTime': scheduledTime.toIso8601String(),
      'type': type.toString().split('.').last,
      'isEnabled': isEnabled,
      'snoozeCount': snoozeCount,
      'lastSnoozedAt': lastSnoozedAt?.toIso8601String(),
      'frequency': frequency?.toString().split('.').last,
      'customSettings': customSettings,
    };
  }

  Reminder toEntity() {
    return Reminder(
      id: id,
      userId: userId,
      scheduledTime: scheduledTime,
      type: type,
      isEnabled: isEnabled,
      snoozeCount: snoozeCount,
      lastSnoozedAt: lastSnoozedAt,
      frequency: frequency,
      customSettings: customSettings,
    );
  }
}
