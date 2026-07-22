import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/privacy_settings.dart';
import '../repositories/privacy_repository.dart';

class UpdatePrivacySettings implements UseCase<void, UpdatePrivacySettingsParams> {
  final PrivacyRepository repository;

  UpdatePrivacySettings(this.repository);

  @override
  Future<Either<Failure, void>> call(UpdatePrivacySettingsParams params) async {
    return await repository.updatePrivacySettings(params.settings);
  }
}

class UpdatePrivacySettingsParams {
  final PrivacySettings settings;

  UpdatePrivacySettingsParams({required this.settings});
}