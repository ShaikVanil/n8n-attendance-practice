import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/wifi_info.dart';
import '../../data/models/wifi_network_model.dart';

abstract class WiFiRepository {
  Future<Either<Failure, WiFiInfo>> getCurrentWiFiInfo();
  Future<Either<Failure, bool>> hasWiFiPermission();
  Future<Either<Failure, bool>> requestWiFiPermission();
  Future<Either<Failure, List<WiFiNetworkModel>>> getOfficeWiFiNetworks();
  Future<Either<Failure, bool>> validateWiFiAgainstOfficeNetworks(WiFiInfo wifiInfo);
  Future<Either<Failure, List<String>>> getConfiguredOfficeNetworks();
  Future<Either<Failure, void>> addOfficeNetwork(String ssid);
  Future<Either<Failure, void>> removeOfficeNetwork(String ssid);
}