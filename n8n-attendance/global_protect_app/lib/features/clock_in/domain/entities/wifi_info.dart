class WiFiInfo {
  final String? ssid;
  final String? bssid;
  final String? ipAddress;
  final bool isConnected;
  final int? signalStrength;
  final bool isOfficeNetwork;

  const WiFiInfo({
    this.ssid,
    this.bssid,
    this.ipAddress,
    required this.isConnected,
    this.signalStrength,
    this.isOfficeNetwork = false,
  });

  @override
  String toString() {
    return 'WiFiInfo(ssid: $ssid, bssid: $bssid, isConnected: $isConnected)';
  }
}