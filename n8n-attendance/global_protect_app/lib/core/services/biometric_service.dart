import 'package:local_auth/local_auth.dart';
import 'package:local_auth_android/local_auth_android.dart';
import 'package:local_auth_darwin/local_auth_darwin.dart';
import 'package:flutter/services.dart';

class BiometricService {
  final LocalAuthentication _localAuth = LocalAuthentication();

  Future<bool> isBiometricAvailable() async {
    try {
      final bool isAvailable = await _localAuth.canCheckBiometrics;
      final bool isDeviceSupported = await _localAuth.isDeviceSupported();
      return isAvailable && isDeviceSupported;
    } catch (e) {
      return false;
    }
  }

  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _localAuth.getAvailableBiometrics();
    } catch (e) {
      return [];
    }
  }

  Future<bool> authenticateWithBiometrics({
    required String reason,
    bool useErrorDialogs = true,
    bool stickyAuth = false,
  }) async {
    try {
      final bool isAuthenticated = await _localAuth.authenticate(
        localizedReason: reason,
        authMessages: [
          const AndroidAuthMessages(
            signInTitle: 'Biometric Authentication Required',
            cancelButton: 'Cancel',
          ),
          const IOSAuthMessages(
            cancelButton: 'Cancel',
          ),
        ],
        options: AuthenticationOptions(
          useErrorDialogs: useErrorDialogs,
          stickyAuth: stickyAuth,
          biometricOnly: true,
        ),
      );
      return isAuthenticated;
    } on PlatformException catch (e) {
      print('Biometric authentication error: $e');
      return false;
    }
  }
}