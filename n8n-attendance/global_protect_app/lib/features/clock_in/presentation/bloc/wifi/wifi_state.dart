import '../../../domain/entities/wifi_info.dart';

abstract class WiFiState {}

class WiFiInitial extends WiFiState {}

class WiFiLoading extends WiFiState {}

class WiFiLoaded extends WiFiState {
  final WiFiInfo wifiInfo;
  final bool isOfficeNetwork;
  final List<String> configuredNetworks;
  
  WiFiLoaded({
    required this.wifiInfo,
    required this.isOfficeNetwork,
    this.configuredNetworks = const [],
  });
}

class WiFiPermissionRequired extends WiFiState {
  final String message;
  
  WiFiPermissionRequired({required this.message});
}

class WiFiPermissionGranted extends WiFiState {}

class WiFiPermissionDenied extends WiFiState {
  final String message;
  
  WiFiPermissionDenied({required this.message});
}

class WiFiValidationSuccess extends WiFiState {
  final WiFiInfo wifiInfo;
  final String networkName;
  
  WiFiValidationSuccess({
    required this.wifiInfo,
    required this.networkName,
  });
}

class WiFiValidationFailure extends WiFiState {
  final String message;
  final WiFiInfo? wifiInfo;
  
  WiFiValidationFailure({
    required this.message,
    this.wifiInfo,
  });
}

class WiFiError extends WiFiState {
  final String message;
  
  WiFiError({required this.message});
}

class ConfiguredNetworksLoaded extends WiFiState {
  final List<String> networks;
  
  ConfiguredNetworksLoaded({required this.networks});
}

class NetworkAdded extends WiFiState {
  final String ssid;
  
  NetworkAdded({required this.ssid});
}

class NetworkRemoved extends WiFiState {
  final String ssid;
  
  NetworkRemoved({required this.ssid});
}