import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/user_data.dart';
import '../repositories/privacy_repository.dart';

class GetUserData implements UseCase<UserData, NoParams> {
  final PrivacyRepository repository;

  GetUserData(this.repository);

  @override
  Future<Either<Failure, UserData>> call(NoParams params) async {
    return await repository.getUserData();
  }
}