import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/reminder.dart';
import '../repositories/reminder_repository.dart';

class GetSmartRemindersUseCase implements UseCase<List<Reminder>, GetSmartRemindersParams> {
  final ReminderRepository repository;

  GetSmartRemindersUseCase(this.repository);

  @override
  Future<Either<Failure, List<Reminder>>> call(GetSmartRemindersParams params) async {
    return await repository.getSmartReminders(params.userId);
  }
}

class GetSmartRemindersParams {
  final String userId;

  GetSmartRemindersParams({required this.userId});
}