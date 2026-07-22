import 'package:global_protect_app/features/clock_in/data/models/reminder_model.dart';
import 'package:global_protect_app/features/clock_in/data/models/work_pattern_model.dart';
import 'package:hive/hive.dart';
import '../../domain/entities/reminder.dart';
import '../../../../core/error/exceptions.dart';

abstract class ReminderLocalDataSource {
  Future<List<Reminder>> getCachedReminders(String userId);
  Future<void> cacheReminders(List<Reminder> reminders);
  Future<void> cacheReminder(Reminder reminder);
  Future<Reminder> getReminder(String reminderId);
  Future<void> deleteReminder(String reminderId);
  Future<void> queueReminderForSync(Reminder reminder);
  Future<void> queueReminderUpdateForSync(Reminder reminder);
  Future<void> queueReminderDeletionForSync(String reminderId);
  Future<void> cacheWorkPattern(WorkPattern workPattern);
  Future<WorkPattern> getCachedWorkPattern(String userId);
  Future<void> cacheSmartReminders(List<Reminder> reminders);
  Future<List<Reminder>> getCachedSmartReminders(String userId);
}

class ReminderLocalDataSourceImpl implements ReminderLocalDataSource {
  final Box box;
  
  static const String _remindersKey = 'reminders';
  static const String _workPatternsKey = 'work_patterns';
  static const String _smartRemindersKey = 'smart_reminders';
  static const String _syncQueueKey = 'reminder_sync_queue';

  ReminderLocalDataSourceImpl({required this.box});

  @override
  Future<List<Reminder>> getCachedReminders(String userId) async {
    try {
      final remindersJson = box.get('${_remindersKey}_$userId');
      if (remindersJson == null) return [];
      
      final List<dynamic> remindersList = remindersJson;
      return remindersList
          .map((json) => ReminderModel.fromJson(json).toEntity())
          .toList();
    } catch (e) {
      throw CacheException('Failed to get cached reminders');
    }
  }

  @override
  Future<void> cacheReminders(List<Reminder> reminders) async {
    try {
      if (reminders.isNotEmpty) {
        final userId = reminders.first.userId;
        final remindersJson = reminders
            .map((reminder) => ReminderModel.fromEntity(reminder).toJson())
            .toList();
        await box.put('${_remindersKey}_$userId', remindersJson);
      }
    } catch (e) {
      throw CacheException('Failed to cache reminders');
    }
  }

  @override
  Future<void> cacheReminder(Reminder reminder) async {
    try {
      final existingReminders = await getCachedReminders(reminder.userId);
      final updatedReminders = existingReminders
          .where((r) => r.id != reminder.id)
          .toList();
      updatedReminders.add(reminder);
      await cacheReminders(updatedReminders);
    } catch (e) {
      throw CacheException('Failed to cache reminder');
    }
  }

  @override
  Future<Reminder> getReminder(String reminderId) async {
    try {
      // Search through all cached reminders
      final allKeys = box.keys.where((key) => key.toString().startsWith(_remindersKey));
      
      for (final key in allKeys) {
        final remindersJson = box.get(key);
        if (remindersJson != null) {
          final List<dynamic> remindersList = remindersJson;
          for (final json in remindersList) {
            final reminder = ReminderModel.fromJson(json).toEntity();
            if (reminder.id == reminderId) {
              return reminder;
            }
          }
        }
      }
      throw CacheException('Reminder not found');
    } catch (e) {
      throw CacheException('Failed to get reminder');
    }
  }

  @override
  Future<void> deleteReminder(String reminderId) async {
    try {
      final reminder = await getReminder(reminderId);
      final existingReminders = await getCachedReminders(reminder.userId);
      final updatedReminders = existingReminders
          .where((r) => r.id != reminderId)
          .toList();
      await cacheReminders(updatedReminders);
    } catch (e) {
      throw CacheException('Failed to delete reminder');
    }
  }

  @override
  Future<void> queueReminderForSync(Reminder reminder) async {
    try {
      final syncQueue = box.get(_syncQueueKey, defaultValue: <Map<String, dynamic>>[]);
      final List<Map<String, dynamic>> queue = List<Map<String, dynamic>>.from(syncQueue);
      
      queue.add({
        'type': 'create',
        'reminder': ReminderModel.fromEntity(reminder).toJson(),
        'timestamp': DateTime.now().toIso8601String(),
      });
      
      await box.put(_syncQueueKey, queue);
    } catch (e) {
      throw CacheException('Failed to queue reminder for sync');
    }
  }

  @override
  Future<void> queueReminderUpdateForSync(Reminder reminder) async {
    try {
      final syncQueue = box.get(_syncQueueKey, defaultValue: <Map<String, dynamic>>[]);
      final List<Map<String, dynamic>> queue = List<Map<String, dynamic>>.from(syncQueue);
      
      queue.add({
        'type': 'update',
        'reminder': ReminderModel.fromEntity(reminder).toJson(),
        'timestamp': DateTime.now().toIso8601String(),
      });
      
      await box.put(_syncQueueKey, queue);
    } catch (e) {
      throw CacheException('Failed to queue reminder update for sync');
    }
  }

  @override
  Future<void> queueReminderDeletionForSync(String reminderId) async {
    try {
      final syncQueue = box.get(_syncQueueKey, defaultValue: <Map<String, dynamic>>[]);
      final List<Map<String, dynamic>> queue = List<Map<String, dynamic>>.from(syncQueue);
      
      queue.add({
        'type': 'delete',
        'reminderId': reminderId,
        'timestamp': DateTime.now().toIso8601String(),
      });
      
      await box.put(_syncQueueKey, queue);
    } catch (e) {
      throw CacheException('Failed to queue reminder deletion for sync');
    }
  }

  @override
  Future<void> cacheWorkPattern(WorkPattern workPattern) async {
    try {
      final workPatternJson = WorkPatternModel.fromEntity(workPattern).toJson();
      await box.put('${_workPatternsKey}_${workPattern.userId}', workPatternJson);
    } catch (e) {
      throw CacheException('Failed to cache work pattern');
    }
  }

  @override
  Future<WorkPattern> getCachedWorkPattern(String userId) async {
    try {
      final workPatternJson = box.get('${_workPatternsKey}_$userId');
      if (workPatternJson == null) {
        throw CacheException('No cached work pattern found');
      }
      return WorkPatternModel.fromJson(workPatternJson).toEntity();
    } catch (e) {
      throw CacheException('Failed to get cached work pattern');
    }
  }

  @override
  Future<void> cacheSmartReminders(List<Reminder> reminders) async {
    try {
      if (reminders.isNotEmpty) {
        final userId = reminders.first.userId;
        final remindersJson = reminders
            .map((reminder) => ReminderModel.fromEntity(reminder).toJson())
            .toList();
        await box.put('${_smartRemindersKey}_$userId', remindersJson);
      }
    } catch (e) {
      throw CacheException('Failed to cache smart reminders');
    }
  }

  @override
  Future<List<Reminder>> getCachedSmartReminders(String userId) async {
    try {
      final remindersJson = box.get('${_smartRemindersKey}_$userId');
      if (remindersJson == null) return [];
      
      final List<dynamic> remindersList = remindersJson;
      return remindersList
          .map((json) => ReminderModel.fromJson(json).toEntity())
          .toList();
    } catch (e) {
      throw CacheException('Failed to get cached smart reminders');
    }
  }
}