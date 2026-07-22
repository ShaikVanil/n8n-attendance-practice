import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../../core/usecases/usecase.dart';
import '../../../domain/usecases/get_wifi_info_usecase.dart';
import '../../../domain/usecases/validate_office_wifi_usecase.dart';
import '../../../domain/repositories/wifi_repository.dart';
import 'wifi_event.dart';
import 'wifi_state.dart';

class WiFiBloc extends Bloc<WiFiEvent, WiFiState> {
  final GetWiFiInfoUseCase getWiFiInfoUseCase;
  final ValidateOfficeWiFiUseCase validateOfficeWiFiUseCase;
  final WiFiRepository wifiRepository;

  WiFiBloc({
    required this.getWiFiInfoUseCase,
    required this.validateOfficeWiFiUseCase,
    required this.wifiRepository,
  }) : super(WiFiInitial()) {
    on<GetCurrentWiFiEvent>(_onGetCurrentWiFi);
    on<RequestWiFiPermissionEvent>(_onRequestWiFiPermission);
    on<ValidateOfficeWiFiEvent>(_onValidateOfficeWiFi);
    on<AddOfficeNetworkEvent>(_onAddOfficeNetwork);
    on<RemoveOfficeNetworkEvent>(_onRemoveOfficeNetwork);
    on<GetConfiguredNetworksEvent>(_onGetConfiguredNetworks);
  }

  Future<void> _onGetCurrentWiFi(
    GetCurrentWiFiEvent event,
    Emitter<WiFiState> emit,
  ) async {
    emit(WiFiLoading());

    // Check permission first
    final permissionResult = await wifiRepository.hasWiFiPermission();
    
    if (permissionResult.isLeft()) {
      final failure = permissionResult.fold((l) => l, (r) => null)!;
      emit(WiFiError(message: failure.message));
      return;
    }

    final hasPermission = permissionResult.fold((l) => false, (r) => r);
    
    if (!hasPermission) {
      emit(WiFiPermissionRequired(
        message: 'Location permission is required to detect WiFi networks',
      ));
      return;
    }

    try {
      // Get WiFi info
      final result = await getWiFiInfoUseCase(NoParams());

      // Handle the result properly
      if (result.isLeft()) {
        final failure = result.fold((l) => l, (r) => null)!;
        emit(WiFiError(message: failure.message));
        return;
      }

      final wifiInfo = result.fold((l) => null, (r) => r)!;

      // Get configured networks
      final networksResult = await wifiRepository.getConfiguredOfficeNetworks();

      if (networksResult.isLeft()) {
        emit(WiFiLoaded(
          wifiInfo: wifiInfo,
          isOfficeNetwork: wifiInfo.isOfficeNetwork,
        ));
      } else {
        final networks = networksResult.fold((l) => <String>[], (r) => r);
        emit(WiFiLoaded(
          wifiInfo: wifiInfo,
          isOfficeNetwork: wifiInfo.isOfficeNetwork,
          configuredNetworks: networks,
        ));
      }
    } catch (error) {
      emit(WiFiError(message: 'Failed to get WiFi info: $error'));
    }
  }

  Future<void> _onRequestWiFiPermission(
    RequestWiFiPermissionEvent event,
    Emitter<WiFiState> emit,
  ) async {
    emit(WiFiLoading());

    final result = await wifiRepository.requestWiFiPermission();
    result.fold(
      (failure) => emit(WiFiPermissionDenied(message: failure.message)),
      (granted) {
        if (granted) {
          emit(WiFiPermissionGranted());
          // Automatically get WiFi info after permission granted
          add(GetCurrentWiFiEvent());
        } else {
          emit(WiFiPermissionDenied(
            message:
                'WiFi permission was denied. Please enable location permission in settings.',
          ));
        }
      },
    );
  }

  Future<void> _onValidateOfficeWiFi(
    ValidateOfficeWiFiEvent event,
    Emitter<WiFiState> emit,
  ) async {
    emit(WiFiLoading());

    // Get current WiFi info
    final wifiResult = await getWiFiInfoUseCase(NoParams());
    
    if (wifiResult.isLeft()) {
      final failure = wifiResult.fold((l) => l, (r) => null)!;
      emit(WiFiError(message: failure.message));
      return;
    }

    final wifiInfo = wifiResult.fold((l) => null, (r) => r)!;

    // Validate office WiFi
    final validationResult = await validateOfficeWiFiUseCase(
      ValidateOfficeWiFiParams(wifiInfo: wifiInfo),
    );

    if (validationResult.isLeft()) {
      final failure = validationResult.fold((l) => l, (r) => null)!;
      emit(WiFiValidationFailure(
        message: failure.message,
        wifiInfo: wifiInfo,
      ));
      return;
    }

    final isValid = validationResult.fold((l) => false, (r) => r);
    
    if (isValid) {
      emit(WiFiValidationSuccess(
        wifiInfo: wifiInfo,
        networkName: wifiInfo.ssid ?? 'Unknown Network',
      ));
    } else {
      String message;
      if (!wifiInfo.isConnected) {
        message = 'Not connected to WiFi. Please connect to office WiFi network.';
      } else if (!wifiInfo.isOfficeNetwork) {
        message = 'Connected to "${wifiInfo.ssid}", but this is not a recognized office network.';
      } else {
        message = 'WiFi network validation failed.';
      }

      emit(WiFiValidationFailure(
        message: message,
        wifiInfo: wifiInfo,
      ));
    }
  }

  Future<void> _onAddOfficeNetwork(
    AddOfficeNetworkEvent event,
    Emitter<WiFiState> emit,
  ) async {
    final result = await wifiRepository.addOfficeNetwork(event.ssid);
    result.fold(
      (failure) => emit(WiFiError(message: failure.message)),
      (_) => emit(NetworkAdded(ssid: event.ssid)),
    );
  }

  Future<void> _onRemoveOfficeNetwork(
    RemoveOfficeNetworkEvent event,
    Emitter<WiFiState> emit,
  ) async {
    final result = await wifiRepository.removeOfficeNetwork(event.ssid);
    result.fold(
      (failure) => emit(WiFiError(message: failure.message)),
      (_) => emit(NetworkRemoved(ssid: event.ssid)),
    );
  }

  Future<void> _onGetConfiguredNetworks(
    GetConfiguredNetworksEvent event,
    Emitter<WiFiState> emit,
  ) async {
    final result = await wifiRepository.getConfiguredOfficeNetworks();
    result.fold(
      (failure) => emit(WiFiError(message: failure.message)),
      (networks) => emit(ConfiguredNetworksLoaded(networks: networks)),
    );
  }
}
