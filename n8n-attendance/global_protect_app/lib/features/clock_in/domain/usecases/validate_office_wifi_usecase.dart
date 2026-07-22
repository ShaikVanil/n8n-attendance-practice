import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/wifi_info.dart';
import '../repositories/wifi_repository.dart';

class ValidateOfficeWiFiParams {
  final WiFiInfo wifiInfo;

  ValidateOfficeWiFiParams({required this.wifiInfo});
}

class ValidateOfficeWiFiUseCase implements UseCase<bool, ValidateOfficeWiFiParams> {
  final WiFiRepository repository;

  ValidateOfficeWiFiUseCase(this.repository);

  @override
  Future<Either<Failure, bool>> call(ValidateOfficeWiFiParams params) async {
    try {
      // Check if connected to WiFi
      if (!params.wifiInfo.isConnected) {
        return const Right(false);
      }

      // Validate against backend office networks
      return await repository.validateWiFiAgainstOfficeNetworks(params.wifiInfo);
    } catch (e) {
      return Left(ServerFailure('WiFi validation failed: ${e.toString()}'));
    }
  }
}