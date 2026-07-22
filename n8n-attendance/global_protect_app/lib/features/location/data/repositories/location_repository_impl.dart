import 'package:dartz/dartz.dart';
import 'dart:math';
import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../domain/entities/location.dart';
import '../../domain/entities/office_location.dart';
import '../../domain/repositories/location_repository.dart';
import '../datasources/location_local_data_source.dart';
import '../datasources/location_remote_data_source.dart';

class LocationRepositoryImpl implements LocationRepository {
  final LocationLocalDataSource localDataSource;
  final LocationRemoteDataSource remoteDataSource;

  LocationRepositoryImpl({
    required this.localDataSource,
    required this.remoteDataSource,
  });

  @override
  Future<Either<Failure, Location>> getCurrentLocation() async {
    try {
      // Check if location permission is granted
      final hasPermission = await localDataSource.isLocationPermissionGranted();
      if (!hasPermission) {
        return Left(LocationFailure('Location permission not granted'));
      }

      // Check if location service is enabled
      final isServiceEnabled = await localDataSource.isLocationServiceEnabled();
      if (!isServiceEnabled) {
        return Left(LocationFailure('Location service is disabled'));
      }

      final location = await localDataSource.getCurrentLocation();
      return Right(location);
    } on LocationException catch (e) {
      return Left(LocationFailure(e.message));
    } catch (e) {
      return Left(LocationFailure('Failed to get current location'));
    }
  }

  @override
  Future<Either<Failure, List<OfficeLocation>>> getOfficeLocations() async {
    try {
      // Try to get from remote first
      final remoteLocations = await remoteDataSource.getOfficeLocations();
      await localDataSource.cacheOfficeLocations(remoteLocations);
      return Right(remoteLocations);
    } on NetworkException {
      // Fallback to cached data
      try {
        final cachedLocations = await localDataSource.getCachedOfficeLocations();
        return Right(cachedLocations);
      } catch (e) {
        return Left(CacheFailure('No cached office locations available'));
      }
    } on ServerException {
      return Left(ServerFailure('Failed to fetch office locations'));
    } catch (e) {
      return Left(ServerFailure('Unexpected error occurred'));
    }
  }

  @override
  Future<Either<Failure, bool>> isLocationPermissionGranted() async {
    try {
      final hasPermission = await localDataSource.isLocationPermissionGranted();
      return Right(hasPermission);
    } catch (e) {
      return Left(LocationFailure('Failed to check location permission'));
    }
  }

  @override
  Future<Either<Failure, bool>> requestLocationPermission() async {
    try {
      final granted = await localDataSource.requestLocationPermission();
      return Right(granted);
    } catch (e) {
      return Left(LocationFailure('Failed to request location permission'));
    }
  }

  @override
  Future<Either<Failure, bool>> isLocationServiceEnabled() async {
    try {
      final enabled = await localDataSource.isLocationServiceEnabled();
      return Right(enabled);
    } catch (e) {
      return Left(LocationFailure('Failed to check location service status'));
    }
  }

  @override
  Future<Either<Failure, bool>> validateLocationForClockIn(Location userLocation) async {
    try {
      // Get office locations
      final officeLocationsResult = await getOfficeLocations();
      
      return officeLocationsResult.fold(
        (failure) => Left(failure),
        (officeLocations) {
          // Check if user is within any office boundary
          for (final office in officeLocations) {
            if (office.isLocationWithinBounds(userLocation)) {
              return const Right(true);
            }
          }
          return const Right(false);
        },
      );
    } catch (e) {
      return Left(LocationFailure('Failed to validate location'));
    }
  }

  @override
  Future<Either<Failure, OfficeLocation?>> getNearestOffice(Location userLocation) async {
    try {
      final officesResult = await getOfficesWithDistances(userLocation);
      return officesResult.fold(
        (failure) => Left(failure),
        (offices) {
          if (offices.isEmpty) return const Right(null);
          
          // Sort by distance and return the nearest
          offices.sort((a, b) => (a.distanceFromUser ?? double.infinity)
              .compareTo(b.distanceFromUser ?? double.infinity));
          
          return Right(offices.first);
        },
      );
    } catch (e) {
      return Left(ServerFailure('Failed to get nearest office'));
    }
  }

  @override
  Future<Either<Failure, List<OfficeLocation>>> getOfficesWithDistances(Location userLocation) async {
    try {
      final offices = await remoteDataSource.getOfficesWithDistances(
        userLocation.latitude,
        userLocation.longitude,
      );
      return Right(offices);
    } on NetworkException {
      // Fallback to cached data and calculate distances locally
      try {
        final cachedOffices = await localDataSource.getCachedOfficeLocations();
        final officesWithDistances = cachedOffices.map((office) {
          final distance = _calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            office.center.latitude,
            office.center.longitude,
          );
          return office.copyWith(distanceFromUser: distance);
        }).toList();
        return Right(officesWithDistances);
      } catch (e) {
        return Left(CacheFailure('No cached office locations available'));
      }
    } catch (e) {
      return Left(ServerFailure('Failed to get offices with distances'));
    }
  }

  double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    // Haversine formula implementation
    const double earthRadius = 6371000; // Earth radius in meters
    final double dLat = _degreesToRadians(lat2 - lat1);
    final double dLon = _degreesToRadians(lon2 - lon1);
    
    final double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_degreesToRadians(lat1)) * cos(_degreesToRadians(lat2)) *
        sin(dLon / 2) * sin(dLon / 2);
    
    final double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadius * c;
  }

  double _degreesToRadians(double degrees) {
    return degrees * (pi / 180);
  }
}