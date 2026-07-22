import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/location.dart';
import '../repositories/location_repository.dart';

class ValidateLocationParams {
  final Location userLocation;

  ValidateLocationParams({required this.userLocation});
}

class ValidateLocationUseCase implements UseCase<bool, ValidateLocationParams> {
  final LocationRepository repository;

  ValidateLocationUseCase(this.repository);

  @override
  Future<Either<Failure, bool>> call(ValidateLocationParams params) async {
    return await repository.validateLocationForClockIn(params.userLocation);
  }
}