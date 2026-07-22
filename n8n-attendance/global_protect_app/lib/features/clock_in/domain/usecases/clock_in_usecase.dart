import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/attendance_record.dart';
import '../repositories/attendance_repository.dart';

class ClockInParams {
  final String location;
  final String? notes;

  ClockInParams({
    required this.location,
    this.notes,
  });
}

class ClockInUseCase implements UseCase<AttendanceRecord, ClockInParams> {
  final AttendanceRepository repository;

  ClockInUseCase(this.repository);

  @override
  Future<Either<Failure, AttendanceRecord>> call(ClockInParams params) async {
    return await repository.clockIn(
      location: params.location,
      notes: params.notes,
    );
  }
}