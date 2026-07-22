import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../domain/entities/wifi_info.dart';
import '../../domain/repositories/wifi_repository.dart';
import '../datasources/wifi_local_data_source.dart';
import '../datasources/wifi_remote_data_source.dart';
import '../models/wifi_network_model.dart';

class WiFiRepositoryImpl implements WiFiRepository {
  final WiFiRemoteDataSource remoteDataSource;
  final WiFiLocalDataSource localDataSource;

  WiFiRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
  });

  @override
  Future<Either<Failure, WiFiInfo>> getCurrentWiFiInfo() async {
    try {
      final wifiInfo = await remoteDataSource.getCurrentWiFiInfo();
      
      // Cache the WiFi info
      await localDataSource.cacheWiFiInfo(wifiInfo);
      
      return Right(wifiInfo);
    } catch (e) {
      // Try to get cached WiFi info as fallback
      try {
        final cachedInfo = await localDataSource.getCachedWiFiInfo();
        if (cachedInfo != null) {
          return Right(cachedInfo);
        }
      } catch (_) {}
      
      return Left(ServerFailure('Failed to get WiFi info: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<WiFiNetworkModel>>> getOfficeWiFiNetworks() async {
    try {
      final networks = await remoteDataSource.getOfficeWiFiNetworks();
      
      // Cache the networks
      await localDataSource.cacheWiFiNetworks(networks);
      
      return Right(networks);
    } catch (e) {
      // Try to get cached networks as fallback
      try {
        final cachedNetworks = await localDataSource.getCachedWiFiNetworks();
        if (cachedNetworks.isNotEmpty) {
          return Right(cachedNetworks);
        }
      } catch (_) {}
      
      return Left(ServerFailure('Failed to get WiFi networks: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, bool>> validateWiFiAgainstOfficeNetworks(WiFiInfo wifiInfo) async {
    try {
      if (!wifiInfo.isConnected || wifiInfo.ssid == null) {
        return const Right(false);
      }

      final networksResult = await getOfficeWiFiNetworks();
      return networksResult.fold(
        (failure) => Left(failure),
        (networks) {
          final isValid = networks.any((network) => 
            network.matchesWiFi(wifiInfo.ssid, wifiInfo.bssid));
          return Right(isValid);
        },
      );
    } catch (e) {
      return Left(ServerFailure('WiFi validation failed: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, bool>> hasWiFiPermission() async {
    try {
      final hasPermission = await remoteDataSource.hasWiFiPermission();
      return Right(hasPermission);
    } catch (e) {
      return Left(ServerFailure('Failed to check WiFi permission: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, bool>> requestWiFiPermission() async {
    try {
      final granted = await remoteDataSource.requestWiFiPermission();
      return Right(granted);
    } catch (e) {
      return Left(ServerFailure('Failed to request WiFi permission: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<String>>> getConfiguredOfficeNetworks() async {
    try {
      final networks = await localDataSource.getConfiguredOfficeNetworks();
      return Right(networks);
    } catch (e) {
      return Left(CacheFailure('Failed to get configured networks: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> addOfficeNetwork(String ssid) async {
    try {
      await localDataSource.addOfficeNetwork(ssid);
      return const Right(null);
    } catch (e) {
      return Left(CacheFailure('Failed to add office network: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> removeOfficeNetwork(String ssid) async {
    try {
      await localDataSource.removeOfficeNetwork(ssid);
      return const Right(null);
    } catch (e) {
      return Left(CacheFailure('Failed to remove office network: ${e.toString()}'));
    }
  }
}