import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/wifi_info.dart';
import '../repositories/wifi_repository.dart';

class GetWiFiInfoUseCase implements UseCase<WiFiInfo, NoParams> {
  final WiFiRepository repository;

  GetWiFiInfoUseCase(this.repository);

  @override
  Future<Either<Failure, WiFiInfo>> call(NoParams params) async {
    return await repository.getCurrentWiFiInfo();
  }
}