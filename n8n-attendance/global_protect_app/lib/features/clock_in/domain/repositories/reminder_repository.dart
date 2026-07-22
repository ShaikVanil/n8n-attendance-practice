import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/reminder.dart';

abstract class ReminderRepository {
  Future<Either<Failure, List<Reminder>>> getUserReminders(String userId);
  Future<Either<Failure, Reminder>> createReminder(Reminder reminder);
  Future<Either<Failure, Reminder>> updateReminder(Reminder reminder);
  Future<Either<Failure, void>> deleteReminder(String reminderId);
  Future<Either<Failure, void>> snoozeReminder(String reminderId, Duration snoozeDuration);
  Future<Either<Failure, WorkPattern>> analyzeWorkPattern(String userId);
  Future<Either<Failure, List<Reminder>>> getSmartReminders(String userId);
}