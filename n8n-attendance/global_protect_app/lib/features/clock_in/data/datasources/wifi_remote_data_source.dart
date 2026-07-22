import 'dart:io';
import 'package:dio/dio.dart';
import 'package:network_info_plus/network_info_plus.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../../core/constants/api_constants.dart';
import '../models/wifi_info_model.dart';
import '../models/wifi_network_model.dart';

abstract class WiFiRemoteDataSource {
  Future<WiFiInfoModel> getCurrentWiFiInfo();
  Future<bool> hasWiFiPermission();
  Future<bool> requestWiFiPermission();
  Future<List<WiFiNetworkModel>> getOfficeWiFiNetworks();
}

class WiFiRemoteDataSourceImpl implements WiFiRemoteDataSource {
  final NetworkInfo networkInfo;
  final Dio dio;

  WiFiRemoteDataSourceImpl({
    required this.networkInfo,
    required this.dio,
  });

  @override
  Future<WiFiInfoModel> getCurrentWiFiInfo() async {
    try {
      // Check permissions first
      final hasPermission = await hasWiFiPermission();
      if (!hasPermission) {
        return WiFiInfoModel.disconnected();
      }

      final ssid = await networkInfo.getWifiName();
      final bssid = await networkInfo.getWifiBSSID();
      final ipAddress = await networkInfo.getWifiIP();

      // Clean SSID (remove quotes if present)
      final cleanSSID = ssid?.replaceAll('"', '');

      return WiFiInfoModel(
        ssid: cleanSSID,
        bssid: bssid,
        ipAddress: ipAddress,
        isConnected: cleanSSID != null && cleanSSID.isNotEmpty,
      );
    } catch (e) {
      return WiFiInfoModel.disconnected();
    }
  }

  @override
  Future<List<WiFiNetworkModel>> getOfficeWiFiNetworks() async {
    try {
      final response = await dio.get(ApiConstants.wifiNetworksEndpoint);
      
      if (response.data is List) {
        return (response.data as List)
            .map((json) => WiFiNetworkModel.fromJson(json as Map<String, dynamic>))
            .where((network) => network.isActive)
            .toList();
      }
      
      return [];
    } on DioException catch (e) {
      throw Exception('Failed to fetch WiFi networks: ${e.message}');
    } catch (e) {
      throw Exception('Failed to fetch WiFi networks: ${e.toString()}');
    }
  }

  @override
  Future<bool> hasWiFiPermission() async {
    try {
      if (Platform.isAndroid) {
        final locationStatus = await Permission.location.status;
        return locationStatus.isGranted;
      } else if (Platform.isIOS) {
        // iOS doesn't require explicit permission for WiFi info
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  @override
  Future<bool> requestWiFiPermission() async {
    try {
      if (Platform.isAndroid) {
        final status = await Permission.location.request();
        return status.isGranted;
      } else if (Platform.isIOS) {
        // iOS doesn't require explicit permission for WiFi info
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}