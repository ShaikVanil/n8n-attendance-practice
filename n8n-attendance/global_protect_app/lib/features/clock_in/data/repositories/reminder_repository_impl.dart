import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/error/exceptions.dart';
import '../../domain/entities/reminder.dart';
import '../../domain/repositories/reminder_repository.dart';
import '../datasources/reminder_local_data_source.dart';
import '../datasources/reminder_remote_data_source.dart';
import '../../../../core/network/network_info.dart';

class ReminderRepositoryImpl implements ReminderRepository {
  final ReminderRemoteDataSource remoteDataSource;
  final ReminderLocalDataSource localDataSource;
  final NetworkInfo networkInfo;

  ReminderRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    required this.networkInfo,
  });

  @override
  Future<Either<Failure, List<Reminder>>> getUserReminders(String userId) async {
    try {
      if (await networkInfo.isConnected) {
        final remoteReminders = await remoteDataSource.getUserReminders(userId);
        await localDataSource.cacheReminders(remoteReminders);
        return Right(remoteReminders);
      } else {
        final localReminders = await localDataSource.getCachedReminders(userId);
        return Right(localReminders);
      }
    } on ServerException {
      return Left(ServerFailure('Failed to fetch reminders from server'));
    } on CacheException {
      return Left(CacheFailure('Failed to fetch reminders from cache'));
    }
  }

  @override
  Future<Either<Failure, Reminder>> createReminder(Reminder reminder) async {
    try {
      if (await networkInfo.isConnected) {
        final createdReminder = await remoteDataSource.createReminder(reminder);
        await localDataSource.cacheReminder(createdReminder);
        return Right(createdReminder);
      } else {
        await localDataSource.queueReminderForSync(reminder);
        return Right(reminder);
      }
    } on ServerException {
      return Left(ServerFailure('Failed to create reminder'));
    } on CacheException {
      return Left(CacheFailure('Failed to cache reminder'));
    }
  }

  @override
  Future<Either<Failure, Reminder>> updateReminder(Reminder reminder) async {
    try {
      if (await networkInfo.isConnected) {
        final updatedReminder = await remoteDataSource.updateReminder(reminder);
        await localDataSource.cacheReminder(updatedReminder);
        return Right(updatedReminder);
      } else {
        await localDataSource.queueReminderUpdateForSync(reminder);
        return Right(reminder);
      }
    } on ServerException {
      return Left(ServerFailure('Failed to update reminder'));
    } on CacheException {
      return Left(CacheFailure('Failed to cache reminder update'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteReminder(String reminderId) async {
    try {
      if (await networkInfo.isConnected) {
        await remoteDataSource.deleteReminder(reminderId);
        await localDataSource.deleteReminder(reminderId);
      } else {
        await localDataSource.queueReminderDeletionForSync(reminderId);
      }
      return const Right(null);
    } on ServerException {
      return Left(ServerFailure('Failed to delete reminder'));
    } on CacheException {
      return Left(CacheFailure('Failed to delete reminder from cache'));
    }
  }

  @override
  Future<Either<Failure, void>> snoozeReminder(String reminderId, Duration snoozeDuration) async {
    try {
      final reminder = await localDataSource.getReminder(reminderId);
      final snoozedReminder = reminder.copyWith(
        scheduledTime: DateTime.now().add(snoozeDuration),
        snoozeCount: reminder.snoozeCount + 1,
        lastSnoozedAt: DateTime.now(),
      );
      
      if (await networkInfo.isConnected) {
        await remoteDataSource.updateReminder(snoozedReminder);
      }
      await localDataSource.cacheReminder(snoozedReminder);
      return const Right(null);
    } on ServerException {
      return Left(ServerFailure('Failed to snooze reminder'));
    } on CacheException {
      return Left(CacheFailure('Failed to snooze reminder'));
    }
  }

  @override
  Future<Either<Failure, WorkPattern>> analyzeWorkPattern(String userId) async {
    try {
      if (await networkInfo.isConnected) {
        final workPattern = await remoteDataSource.analyzeWorkPattern(userId);
        await localDataSource.cacheWorkPattern(workPattern);
        return Right(workPattern);
      } else {
        final cachedPattern = await localDataSource.getCachedWorkPattern(userId);
        return Right(cachedPattern);
      }
    } on ServerException {
      return Left(ServerFailure('Failed to analyze work pattern'));
    } on CacheException {
      return Left(CacheFailure('Failed to get cached work pattern'));
    }
  }

  @override
  Future<Either<Failure, List<Reminder>>> getSmartReminders(String userId) async {
    try {
      if (await networkInfo.isConnected) {
        final smartReminders = await remoteDataSource.getSmartReminders(userId);
        await localDataSource.cacheSmartReminders(smartReminders);
        return Right(smartReminders);
      } else {
        final cachedSmartReminders = await localDataSource.getCachedSmartReminders(userId);
        return Right(cachedSmartReminders);
      }
    } on ServerException {
      return Left(ServerFailure('Failed to get smart reminders'));
    } on CacheException {
      return Left(CacheFailure('Failed to get cached smart reminders'));
    }
  }
}