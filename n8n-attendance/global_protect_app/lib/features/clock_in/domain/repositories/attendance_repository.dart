import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/attendance_record.dart';
import '../entities/offline_clock_in_request.dart';
import '../../../../core/services/sync_service.dart';

abstract class AttendanceRepository {
  Future<Either<Failure, AttendanceRecord>> clockIn({
    required String location,
    String? notes,
  });
  
  Future<Either<Failure, AttendanceRecord>> clockOut({
    required String attendanceId,
    String? notes,
    String? location,
  });
  
  Future<Either<Failure, AttendanceRecord?>> getCurrentAttendance();
  Future<Either<Failure, List<AttendanceRecord>>> getAttendanceHistory({
    String? userId,
    int? limit,
    DateTime? startDate,
    DateTime? endDate,
  });
  Future<Either<Failure, bool>> isCurrentlyClockedIn();
  
  // Offline queue methods
  Future<Either<Failure, void>> addOfflineClockInRequest({
    required String location,
    String? notes,
    Map<String, dynamic>? additionalData,
  });
  
  Future<Either<Failure, void>> addOfflineClockOutRequest({
    required String attendanceId,
    required String location,
    String? notes,
    Map<String, dynamic>? additionalData,
  });
  
  Future<Either<Failure, List<OfflineClockInRequest>>> getPendingOfflineRequests();
  Future<Either<Failure, int>> getOfflineRequestCount();
  Future<Either<Failure, SyncResult>> syncOfflineRequests();
  Stream<SyncStatus> get syncStatusStream;
}