import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/notification.dart';
import '../repositories/notification_repository.dart';

class GetNotifications implements UseCase<List<AppNotification>, GetNotificationsParams> {
  final NotificationRepository repository;

  GetNotifications(this.repository);

  @override
  Future<Either<Failure, List<AppNotification>>> call(GetNotificationsParams params) async {
    try {
      final notifications = await repository.getNotifications(
        limit: params.limit,
        type: params.type,
        unreadOnly: params.unreadOnly,
      );
      return Right(notifications);
    } catch (e) {
      return Left(CacheFailure(e.toString())); // or appropriate failure type
    }
  }
}

class GetNotificationsParams {
  final int? limit;
  final int? offset;
  final NotificationType? type;
  final bool? unreadOnly;

  GetNotificationsParams({
    this.limit,
    this.offset,
    this.type,
    this.unreadOnly,
  });
}