import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../repositories/reminder_repository.dart';

class SnoozeReminderUseCase implements UseCase<void, SnoozeReminderParams> {
  final ReminderRepository repository;

  SnoozeReminderUseCase(this.repository);

  @override
  Future<Either<Failure, void>> call(SnoozeReminderParams params) async {
    return await repository.snoozeReminder(params.reminderId, params.snoozeDuration);
  }
}

class SnoozeReminderParams {
  final String reminderId;
  final Duration snoozeDuration;

  SnoozeReminderParams({
    required this.reminderId,
    required this.snoozeDuration,
  });
}