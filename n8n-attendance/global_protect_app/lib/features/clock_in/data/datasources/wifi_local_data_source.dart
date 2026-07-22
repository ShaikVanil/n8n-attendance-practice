import 'package:global_protect_app/features/clock_in/data/models/wifi_network_model.dart';
import 'package:hive/hive.dart';
import '../../../../core/constants/storage_keys.dart';
import '../models/wifi_info_model.dart';

abstract class WiFiLocalDataSource {
  Future<List<String>> getConfiguredOfficeNetworks();
  Future<void> addOfficeNetwork(String ssid);
  Future<void> removeOfficeNetwork(String ssid);
  Future<void> cacheWiFiInfo(WiFiInfoModel wifiInfo);
  Future<WiFiInfoModel?> getCachedWiFiInfo();
  Future<void> cacheWiFiNetworks(List<WiFiNetworkModel> networks);
  Future<List<WiFiNetworkModel>> getCachedWiFiNetworks();
}

class WiFiLocalDataSourceImpl implements WiFiLocalDataSource {
  final Box box;

  WiFiLocalDataSourceImpl({required this.box});

  @override
  Future<List<String>> getConfiguredOfficeNetworks() async {
    try {
      final networks = box.get(StorageKeys.officeNetworks, defaultValue: <String>[]);
      return List<String>.from(networks);
    } catch (e) {
      throw Exception('Failed to get configured office networks: ${e.toString()}');
    }
  }

  @override
  Future<void> addOfficeNetwork(String ssid) async {
    try {
      final networks = await getConfiguredOfficeNetworks();
      if (!networks.contains(ssid)) {
        networks.add(ssid);
        await box.put(StorageKeys.officeNetworks, networks);
      }
    } catch (e) {
      throw Exception('Failed to add office network: ${e.toString()}');
    }
  }

  @override
  Future<void> removeOfficeNetwork(String ssid) async {
    try {
      final networks = await getConfiguredOfficeNetworks();
      networks.remove(ssid);
      await box.put(StorageKeys.officeNetworks, networks);
    } catch (e) {
      throw Exception('Failed to remove office network: ${e.toString()}');
    }
  }

  @override
  Future<void> cacheWiFiInfo(WiFiInfoModel wifiInfo) async {
    try {
      await box.put(StorageKeys.lastWiFiInfo, wifiInfo.toMap());
    } catch (e) {
      throw Exception('Failed to cache WiFi info: ${e.toString()}');
    }
  }

  @override
  Future<WiFiInfoModel?> getCachedWiFiInfo() async {
    try {
      final data = box.get(StorageKeys.lastWiFiInfo);
      if (data != null) {
        return WiFiInfoModel.fromMap(Map<String, dynamic>.from(data));
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  @override
  Future<void> cacheWiFiNetworks(List<WiFiNetworkModel> networks) async {
    try {
      final networksJson = networks.map((network) => network.toJson()).toList();
      await box.put(StorageKeys.cachedWiFiNetworks, networksJson);
    } catch (e) {
      throw Exception('Failed to cache WiFi networks: ${e.toString()}');
    }
  }

  @override
  Future<List<WiFiNetworkModel>> getCachedWiFiNetworks() async {
    try {
      final data = box.get(StorageKeys.cachedWiFiNetworks, defaultValue: <Map<String, dynamic>>[]);
      if (data is List) {
        return data
            .map((json) => WiFiNetworkModel.fromJson(Map<String, dynamic>.from(json)))
            .toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}