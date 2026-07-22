import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../repositories/privacy_repository.dart';

class RequestDataDeletion implements UseCase<void, NoParams> {
  final PrivacyRepository repository;

  RequestDataDeletion(this.repository);

  @override
  Future<Either<Failure, void>> call(NoParams params) async {
    return await repository.requestDataDeletion();
  }
}