import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/privacy_settings.dart';
import '../repositories/privacy_repository.dart';

class GetPrivacySettings implements UseCase<PrivacySettings, NoParams> {
  final PrivacyRepository repository;

  GetPrivacySettings(this.repository);

  @override
  Future<Either<Failure, PrivacySettings>> call(NoParams params) async {
    return await repository.getPrivacySettings();
  }
}