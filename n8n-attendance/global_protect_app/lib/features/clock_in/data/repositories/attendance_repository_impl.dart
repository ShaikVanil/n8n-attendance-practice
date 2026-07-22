import 'package:dartz/dartz.dart';
import 'package:global_protect_app/core/services/sync_service.dart';
import 'package:global_protect_app/features/clock_in/data/models/offline_clock_in_request_model.dart';
import 'package:global_protect_app/features/clock_in/domain/entities/offline_clock_in_request.dart';
import '../../../../core/error/exceptions.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/network/network_info.dart';
import '../../domain/entities/attendance_record.dart';
import '../../domain/repositories/attendance_repository.dart';
import '../datasources/attendance_local_data_source.dart';
import '../datasources/attendance_remote_data_source.dart';

class AttendanceRepositoryImpl implements AttendanceRepository {
  final AttendanceRemoteDataSource remoteDataSource;
  final AttendanceLocalDataSource localDataSource;
  final NetworkInfo networkInfo;
  final SyncService syncService;

  AttendanceRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    required this.networkInfo,
    required this.syncService,
  });

  @override
  Future<Either<Failure, AttendanceRecord>> clockIn({
    required String location,
    String? notes,
  }) async {
    if (await networkInfo.isConnected) {
      try {
        final result = await remoteDataSource.clockIn(
          location: location,
          notes: notes,
        );
        await localDataSource.cacheCurrentAttendance(result);
        return Right(result.toEntity());
      } on ServerException catch (e) {
        // Add to offline queue as fallback
        await _addToOfflineQueue(
          location: location,
          notes: notes,
          isClockIn: true,
        );
        return Left(ServerFailure('${e.message}. Request queued for later sync.'));
      }
    } else {
      // Offline - add to queue
      await _addToOfflineQueue(
        location: location,
        notes: notes,
        isClockIn: true,
      );
      return Left(NetworkFailure('No internet connection. Clock-in queued for sync.'));
    }
  }

  @override
  Future<Either<Failure, AttendanceRecord>> clockOut({
    required String attendanceId,
    String? notes,
    String? location,
  }) async {
    if (await networkInfo.isConnected) {
      try {
        final result = await remoteDataSource.clockOut(
          attendanceId: attendanceId,
          notes: notes,
          location: location,
        );
        await localDataSource.cacheCurrentAttendance(result);
        return Right(result.toEntity());
      } on ServerException catch (e) {
        // Add to offline queue as fallback
        await _addToOfflineQueue(
          attendanceId: attendanceId,
          location: location ?? '',
          notes: notes,
          isClockIn: false,
        );
        return Left(ServerFailure('${e.message}. Request queued for later sync.'));
      }
    } else {
      // Offline - add to queue
      await _addToOfflineQueue(
        attendanceId: attendanceId,
        location: location ?? '',
        notes: notes,
        isClockIn: false,
      );
      return Left(NetworkFailure('No internet connection. Clock-out queued for sync.'));
    }
  }

  @override
  Future<Either<Failure, AttendanceRecord?>> getCurrentAttendance() async {
    if (await networkInfo.isConnected) {
      try {
        final result = await remoteDataSource.getCurrentAttendance();
        if (result != null) {
          await localDataSource.cacheCurrentAttendance(result);
          return Right(result.toEntity());
        }
        return const Right(null);
      } on ServerException catch (e) {
        // Fallback to cached data
        final cached = await localDataSource.getCachedCurrentAttendance();
        if (cached != null) {
          return Right(cached.toEntity());
        }
        return Left(ServerFailure(e.message));
      }
    } else {
      // Offline - use cached data
      final cached = await localDataSource.getCachedCurrentAttendance();
      if (cached != null) {
        return Right(cached.toEntity());
      }
      return Left(NetworkFailure('No internet connection and no cached data'));
    }
  }

  @override
  Future<Either<Failure, List<AttendanceRecord>>> getAttendanceHistory({
    DateTime? startDate,
    DateTime? endDate,
    String? userId,
    int? limit,
  }) async {
    if (await networkInfo.isConnected) {
      try {
        final result = await remoteDataSource.getAttendanceHistory();
        await localDataSource.cacheAttendanceHistory(result);
        return Right(result.map((model) => model.toEntity()).toList());
      } on ServerException catch (e) {
        // Fallback to cached data
        final cached = await localDataSource.getCachedAttendanceHistory();
        return Right(cached.map((model) => model.toEntity()).toList());
      }
    } else {
      // Offline - use cached data
      final cached = await localDataSource.getCachedAttendanceHistory();
      return Right(cached.map((model) => model.toEntity()).toList());
    }
  }

  @override
  Future<Either<Failure, bool>> isCurrentlyClockedIn() async {
    final result = await getCurrentAttendance();
    return result.fold(
      (failure) => Left(failure),
      (attendance) => Right(attendance?.status == AttendanceStatus.clockedIn),
    );
  }

  @override
  Future<Either<Failure, void>> addOfflineClockInRequest({
    required String location,
    String? notes,
    Map<String, dynamic>? additionalData,
  }) async {
    try {
      final request = OfflineClockInRequestModel.createClockIn(
        location: location,
        notes: notes,
        additionalData: additionalData,
      );
      await localDataSource.addOfflineRequest(request);
      return const Right(null);
    } catch (e) {
      return Left(CacheFailure('Failed to queue offline request: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> addOfflineClockOutRequest({
    required String attendanceId,
    required String location,
    String? notes,
    Map<String, dynamic>? additionalData,
  }) async {
    try {
      final request = OfflineClockInRequestModel.createClockOut(
        attendanceId: attendanceId,
        location: location,
        notes: notes,
        additionalData: additionalData,
      );
      await localDataSource.addOfflineRequest(request);
      return const Right(null);
    } catch (e) {
      return Left(CacheFailure('Failed to queue offline request: $e'));
    }
  }

  @override
  Future<Either<Failure, List<OfflineClockInRequest>>> getPendingOfflineRequests() async {
    try {
      final requests = await localDataSource.getPendingOfflineRequests();
      return Right(requests.map((model) => model.toEntity()).toList());
    } catch (e) {
      return Left(CacheFailure('Failed to get offline requests: $e'));
    }
  }

  @override
  Future<Either<Failure, int>> getOfflineRequestCount() async {
    try {
      final count = await localDataSource.getOfflineRequestCount();
      return Right(count);
    } catch (e) {
      return Left(CacheFailure('Failed to get offline request count: $e'));
    }
  }

  @override
  Future<Either<Failure, SyncResult>> syncOfflineRequests() async {
    try {
      final result = await syncService.syncPendingRequests();
      return Right(result);
    } catch (e) {
      return Left(ServerFailure('Sync failed: $e'));
    }
  }

  @override
  Stream<SyncStatus> get syncStatusStream => syncService.syncStatusStream;

  Future<void> _addToOfflineQueue({
    required String location,
    String? notes,
    String? attendanceId,
    required bool isClockIn,
  }) async {
    if (isClockIn) {
      await addOfflineClockInRequest(
        location: location,
        notes: notes,
      );
    } else {
      await addOfflineClockOutRequest(
        attendanceId: attendanceId!,
        location: location,
        notes: notes,
      );
    }
  }
}