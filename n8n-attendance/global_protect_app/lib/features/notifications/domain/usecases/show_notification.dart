import 'package:dartz/dartz.dart';
import 'package:global_protect_app/core/services/notification_service.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/notification.dart';
import '../repositories/notification_repository.dart';

class ShowNotification implements UseCase<void, ShowNotificationParams> {
  final NotificationRepository repository;
  final NotificationService notificationService;

  ShowNotification({
    required this.repository,
    required this.notificationService,
  });

  @override
  Future<Either<Failure, void>> call(ShowNotificationParams params) async {
    try {
      // Save to local storage
      await repository.saveNotification(params.notification);
      
      // Show system notification
      await notificationService.showNotification(params.notification);
      
      return const Right(null);
    } catch (e) {
      return Left(CacheFailure(e.toString()));
    }
  }
}

class ShowNotificationParams {
  final AppNotification notification;

  ShowNotificationParams({required this.notification});
}