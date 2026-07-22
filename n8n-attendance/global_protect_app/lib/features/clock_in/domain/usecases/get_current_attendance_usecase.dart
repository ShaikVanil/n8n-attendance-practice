import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/attendance_record.dart';
import '../repositories/attendance_repository.dart';

class GetCurrentAttendanceUseCase implements UseCase<AttendanceRecord?, NoParams> {
  final AttendanceRepository repository;

  GetCurrentAttendanceUseCase(this.repository);

  @override
  Future<Either<Failure, AttendanceRecord?>> call(NoParams params) async {
    return await repository.getCurrentAttendance();
  }
}