import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/office_location.dart';
import '../repositories/location_repository.dart';

class GetOfficeLocationsUseCase implements UseCase<List<OfficeLocation>, NoParams> {
  final LocationRepository repository;

  GetOfficeLocationsUseCase(this.repository);

  @override
  Future<Either<Failure, List<OfficeLocation>>> call(NoParams params) async {
    return await repository.getOfficeLocations();
  }
}