import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/location.dart';
import '../entities/office_location.dart';

abstract class LocationRepository {
  Future<Either<Failure, Location>> getCurrentLocation();
  Future<Either<Failure, List<OfficeLocation>>> getOfficeLocations();
  Future<Either<Failure, OfficeLocation?>> getNearestOffice(Location userLocation);
  Future<Either<Failure, List<OfficeLocation>>> getOfficesWithDistances(Location userLocation);
  Future<Either<Failure, bool>> isLocationPermissionGranted();
  Future<Either<Failure, bool>> requestLocationPermission();
  Future<Either<Failure, bool>> isLocationServiceEnabled();
  Future<Either<Failure, bool>> validateLocationForClockIn(Location userLocation);
}