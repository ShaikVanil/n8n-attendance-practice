import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/notification_preferences.dart';
import '../repositories/notification_repository.dart';

class UpdateNotificationPreferences implements UseCase<void, UpdateNotificationPreferencesParams> {
  final NotificationRepository repository;

  UpdateNotificationPreferences(this.repository);

  @override
  Future<Either<Failure, void>> call(UpdateNotificationPreferencesParams params) async {
    try {
      await repository.savePreferences(params.preferences);
      return const Right(null);
    } catch (e) {
      return Left(CacheFailure(e.toString()));
    }
  }
}

class UpdateNotificationPreferencesParams {
  final NotificationPreferences preferences;

  UpdateNotificationPreferencesParams({required this.preferences});
}