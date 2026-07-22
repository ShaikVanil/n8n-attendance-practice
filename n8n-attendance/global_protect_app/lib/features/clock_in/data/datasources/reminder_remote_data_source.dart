import 'package:dio/dio.dart';
import '../../domain/entities/reminder.dart';
import '../models/reminder_model.dart';
import '../models/work_pattern_model.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/constants/api_constants.dart';

abstract class ReminderRemoteDataSource {
  Future<List<Reminder>> getUserReminders(String userId);
  Future<Reminder> createReminder(Reminder reminder);
  Future<Reminder> updateReminder(Reminder reminder);
  Future<void> deleteReminder(String reminderId);
  Future<WorkPattern> analyzeWorkPattern(String userId);
  Future<List<Reminder>> getSmartReminders(String userId);
}

class ReminderRemoteDataSourceImpl implements ReminderRemoteDataSource {
  final Dio dio;

  ReminderRemoteDataSourceImpl({required this.dio});

  @override
  Future<List<Reminder>> getUserReminders(String userId) async {
    try {
      final response = await dio.get(
        '${ApiConstants.baseUrl}/reminders/user/$userId',
      );

      if (response.statusCode == 200) {
        final List<dynamic> remindersJson = response.data['data'];
        return remindersJson
            .map((json) => ReminderModel.fromJson(json).toEntity())
            .toList();
      } else {
        throw ServerException('Failed to fetch reminders');
      }
    } on DioException catch (e) {
      throw ServerException('Network error: ${e.message}');
    } catch (e) {
      throw ServerException('Unexpected error: ${e.toString()}');
    }
  }

  @override
  Future<Reminder> createReminder(Reminder reminder) async {
    try {
      final response = await dio.post(
        '${ApiConstants.baseUrl}/reminders',
        data: ReminderModel.fromEntity(reminder).toJson(),
      );

      if (response.statusCode == 201) {
        return ReminderModel.fromJson(response.data['data']).toEntity();
      } else {
        throw ServerException('Failed to create reminder');
      }
    } on DioException catch (e) {
      throw ServerException('Network error: ${e.message}');
    } catch (e) {
      throw ServerException('Unexpected error: ${e.toString()}');
    }
  }

  @override
  Future<Reminder> updateReminder(Reminder reminder) async {
    try {
      final response = await dio.put(
        '${ApiConstants.baseUrl}/reminders/${reminder.id}',
        data: ReminderModel.fromEntity(reminder).toJson(),
      );

      if (response.statusCode == 200) {
        return ReminderModel.fromJson(response.data['data']).toEntity();
      } else {
        throw ServerException('Failed to update reminder');
      }
    } on DioException catch (e) {
      throw ServerException('Network error: ${e.message}');
    } catch (e) {
      throw ServerException('Unexpected error: ${e.toString()}');
    }
  }

  @override
  Future<void> deleteReminder(String reminderId) async {
    try {
      final response = await dio.delete(
        '${ApiConstants.baseUrl}/reminders/$reminderId',
      );

      if (response.statusCode != 200 && response.statusCode != 204) {
        throw ServerException('Failed to delete reminder');
      }
    } on DioException catch (e) {
      throw ServerException('Network error: ${e.message}');
    } catch (e) {
      throw ServerException('Unexpected error: ${e.toString()}');
    }
  }

  @override
  Future<WorkPattern> analyzeWorkPattern(String userId) async {
    try {
      final response = await dio.get(
        '${ApiConstants.baseUrl}/reminders/work-pattern/$userId',
      );

      if (response.statusCode == 200) {
        return WorkPatternModel.fromJson(response.data['data']).toEntity();
      } else {
        throw ServerException('Failed to analyze work pattern');
      }
    } on DioException catch (e) {
      throw ServerException('Network error: ${e.message}');
    } catch (e) {
      throw ServerException('Unexpected error: ${e.toString()}');
    }
  }

  @override
  Future<List<Reminder>> getSmartReminders(String userId) async {
    try {
      final response = await dio.get(
        '${ApiConstants.baseUrl}/reminders/smart/$userId',
      );

      if (response.statusCode == 200) {
        final List<dynamic> remindersJson = response.data['data'];
        return remindersJson
            .map((json) => ReminderModel.fromJson(json).toEntity())
            .toList();
      } else {
        throw ServerException('Failed to fetch smart reminders');
      }
    } on DioException catch (e) {
      throw ServerException('Network error: ${e.message}');
    } catch (e) {
      throw ServerException('Unexpected error: ${e.toString()}');
    }
  }
}