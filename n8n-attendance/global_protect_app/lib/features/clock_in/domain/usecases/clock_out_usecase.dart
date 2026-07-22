import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/attendance_record.dart';
import '../repositories/attendance_repository.dart';

class ClockOutParams {
  final String attendanceId;
  final String? notes;
  final String? location;

  ClockOutParams({
    required this.attendanceId,
    this.notes,
    this.location,
  });
}

class ClockOutUseCase implements UseCase<AttendanceRecord, ClockOutParams> {
  final AttendanceRepository repository;

  ClockOutUseCase(this.repository);

  @override
  Future<Either<Failure, AttendanceRecord>> call(ClockOutParams params) async {
    return await repository.clockOut(
      attendanceId: params.attendanceId,
      notes: params.notes,
      location: params.location,
    );
  }
}