import '../../domain/entities/wifi_info.dart';

class WiFiInfoModel extends WiFiInfo {
  const WiFiInfoModel({
    super.ssid,
    super.bssid,
    super.ipAddress,
    required super.isConnected,
    super.signalStrength,
    super.isOfficeNetwork,
  });

  factory WiFiInfoModel.fromMap(Map<String, dynamic> map) {
    return WiFiInfoModel(
      ssid: map['ssid'] as String?,
      bssid: map['bssid'] as String?,
      ipAddress: map['ipAddress'] as String?,
      isConnected: map['isConnected'] as bool? ?? false,
      signalStrength: map['signalStrength'] as int?,
      isOfficeNetwork: map['isOfficeNetwork'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'ssid': ssid,
      'bssid': bssid,
      'ipAddress': ipAddress,
      'isConnected': isConnected,
      'signalStrength': signalStrength,
      'isOfficeNetwork': isOfficeNetwork,
    };
  }

  factory WiFiInfoModel.disconnected() {
    return const WiFiInfoModel(
      isConnected: false,
      isOfficeNetwork: false,
    );
  }
}