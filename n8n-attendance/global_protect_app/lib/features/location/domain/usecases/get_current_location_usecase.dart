import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/location.dart';
import '../repositories/location_repository.dart';

class GetCurrentLocationUseCase implements UseCase<Location, NoParams> {
  final LocationRepository repository;

  GetCurrentLocationUseCase(this.repository);

  @override
  Future<Either<Failure, Location>> call(NoParams params) async {
    return await repository.getCurrentLocation();
  }
}