abstract class WiFiEvent {}

class GetCurrentWiFiEvent extends WiFiEvent {}

class RequestWiFiPermissionEvent extends WiFiEvent {}

class ValidateOfficeWiFiEvent extends WiFiEvent {
  final String? ssid;
  
  ValidateOfficeWiFiEvent({this.ssid});
}

class AddOfficeNetworkEvent extends WiFiEvent {
  final String ssid;
  
  AddOfficeNetworkEvent({required this.ssid});
}

class RemoveOfficeNetworkEvent extends WiFiEvent {
  final String ssid;
  
  RemoveOfficeNetworkEvent({required this.ssid});
}

class GetConfiguredNetworksEvent extends WiFiEvent {}