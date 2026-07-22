import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../repositories/auth_repository.dart';

class CheckTokenValidityUseCase implements UseCase<bool, NoParams> {
  final AuthRepository repository;

  CheckTokenValidityUseCase(this.repository);

  @override
  Future<Either<Failure, bool>> call(NoParams params) async {
    try {
      final isValid = await repository.isTokenValid();
      return Right(isValid);
    } catch (e) {
      return Left(CacheFailure('Failed to check token validity'));
    }
  }
}