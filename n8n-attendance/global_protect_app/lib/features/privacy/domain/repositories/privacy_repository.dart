import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/privacy_settings.dart';
import '../entities/user_data.dart';

abstract class PrivacyRepository {
  Future<Either<Failure, PrivacySettings>> getPrivacySettings();
  Future<Either<Failure, void>> updatePrivacySettings(PrivacySettings settings);
  Future<Either<Failure, UserData>> getUserData();
  Future<Either<Failure, void>> requestDataDeletion();
}