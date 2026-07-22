import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'biometric_service.dart';

class QuickClockInService {
  final BiometricService _biometricService;
  final FlutterTts _flutterTts = FlutterTts();

  QuickClockInService(this._biometricService);

  Future<bool> canUseQuickClockIn() async {
    return await _biometricService.isBiometricAvailable();
  }

  Future<bool> authenticateForQuickClockIn() async {
    return await _biometricService.authenticateWithBiometrics(
      reason: 'Authenticate to clock in quickly',
      useErrorDialogs: true,
      stickyAuth: true,
    );
  }

  void provideHapticFeedback() {
    HapticFeedback.lightImpact();
  }

  void provideSuccessHapticFeedback() {
    HapticFeedback.mediumImpact();
  }

  void provideErrorHapticFeedback() {
    HapticFeedback.heavyImpact();
  }

  Future<void> announceClockInSuccess(String message) async {
    await _flutterTts.setLanguage('en-US');
    await _flutterTts.setSpeechRate(0.5);
    await _flutterTts.speak(message);
  }

  String determineClockInMethod(bool isWiFiConnected, bool isLocationValid) {
    if (isWiFiConnected && isLocationValid) {
      return 'wifi_location';
    } else if (isLocationValid) {
      return 'location_only';
    }
    return 'unavailable';
  }
}