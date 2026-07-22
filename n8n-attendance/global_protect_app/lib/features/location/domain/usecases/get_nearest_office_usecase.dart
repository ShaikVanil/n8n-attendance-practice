import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/location.dart';
import '../entities/office_location.dart';
import '../repositories/location_repository.dart';

class GetNearestOfficeParams {
  final Location userLocation;

  GetNearestOfficeParams({required this.userLocation});
}

class GetNearestOfficeUseCase implements UseCase<OfficeLocation?, GetNearestOfficeParams> {
  final LocationRepository repository;

  GetNearestOfficeUseCase(this.repository);

  @override
  Future<Either<Failure, OfficeLocation?>> call(GetNearestOfficeParams params) async {
    return await repository.getNearestOffice(params.userLocation);
  }
}