import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/user.dart';
import '../repositories/auth_repository.dart';

class RefreshTokenUseCase implements UseCase<User, NoParams> {
  final AuthRepository repository;

  RefreshTokenUseCase(this.repository);

  @override
  Future<Either<Failure, User>> call(NoParams params) async {
    return await repository.refreshToken();
  }
}