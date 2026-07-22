class WiFiNetworkModel {
  final String id;
  final String ssid;
  final String? bssid;
  final String officeId;
  final String? officeName;
  final String? description;
  final bool isActive;

  const WiFiNetworkModel({
    required this.id,
    required this.ssid,
    this.bssid,
    required this.officeId,
    this.officeName,
    this.description,
    required this.isActive,
  });

  factory WiFiNetworkModel.fromJson(Map<String, dynamic> json) {
    return WiFiNetworkModel(
      id: json['id'] as String,
      ssid: json['ssid'] as String,
      bssid: json['bssid'] as String?,
      officeId: json['officeId'] as String? ?? json['office_id'] as String,
      officeName: json['officeName'] as String?,
      description: json['description'] as String?,
      isActive: json['isActive'] as bool? ?? json['is_active'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'ssid': ssid,
      'bssid': bssid,
      'officeId': officeId,
      'officeName': officeName,
      'description': description,
      'isActive': isActive,
    };
  }

  bool matchesWiFi(String? currentSsid, String? currentBssid) {
    if (!isActive || currentSsid == null) return false;
    
    // Clean SSID (remove quotes)
    final cleanCurrentSsid = currentSsid.replaceAll('"', '');
    
    // SSID must match
    bool ssidMatches = ssid.toLowerCase() == cleanCurrentSsid.toLowerCase();
    
    // If BSSID is available, it should also match for higher confidence
    if (bssid != null && currentBssid != null) {
      bool bssidMatches = bssid!.toLowerCase() == currentBssid.toLowerCase();
      return ssidMatches && bssidMatches;
    }
    
    return ssidMatches;
  }
}