import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/reminder.dart';
import '../repositories/reminder_repository.dart';

class CreateReminderUseCase implements UseCase<Reminder, CreateReminderParams> {
  final ReminderRepository repository;

  CreateReminderUseCase(this.repository);

  @override
  Future<Either<Failure, Reminder>> call(CreateReminderParams params) async {
    return await repository.createReminder(params.reminder);
  }
}

class CreateReminderParams {
  final Reminder reminder;

  CreateReminderParams({required this.reminder});
}