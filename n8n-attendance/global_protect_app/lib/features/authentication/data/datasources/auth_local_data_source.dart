import 'package:hive/hive.dart';
import '../../../../core/constants/storage_keys.dart';
import '../models/auth_response_model.dart';
import 'dart:convert';

abstract class AuthLocalDataSource {
  Future<void> cacheAuthData(AuthResponseModel authData);
  Future<AuthResponseModel?> getCachedAuthData();
  Future<void> clearAuthData();
  Future<void> clearAllData();
}

class AuthLocalDataSourceImpl implements AuthLocalDataSource {
  final Box<String> secureBox;

  AuthLocalDataSourceImpl({required this.secureBox});

  @override
  Future<void> cacheAuthData(AuthResponseModel authResponse) async {
    final authJson = authResponse.toJson();
    await secureBox.put(StorageKeys.accessToken, authResponse.accessToken);
    await secureBox.put(StorageKeys.refreshToken, authResponse.refreshToken);
    await secureBox.put(StorageKeys.userData, jsonEncode(authResponse.user.toJson())); // Fix: Use jsonEncode
    await secureBox.put(StorageKeys.expiresAt, authResponse.expiresAt.toIso8601String());
  }

  @override
  Future<AuthResponseModel?> getCachedAuthData() async {
    final accessToken = secureBox.get(StorageKeys.accessToken);
    final refreshToken = secureBox.get(StorageKeys.refreshToken);
    final userData = secureBox.get(StorageKeys.userData);
    final expiresAt = secureBox.get(StorageKeys.expiresAt);

    if (accessToken != null && refreshToken != null && userData != null) {
      try {
        final authData = {
          'accessToken': accessToken,
          'refreshToken': refreshToken,
          'user': jsonDecode(userData), // Fix: Use jsonDecode
          'expiresAt': expiresAt ?? DateTime.now().add(const Duration(hours: 24)).toIso8601String(),
        };
        return AuthResponseModel.fromJson(authData);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  @override
  Future<void> clearAuthData() async {
    await secureBox.delete(StorageKeys.accessToken);
    await secureBox.delete(StorageKeys.refreshToken);
    await secureBox.delete(StorageKeys.userData);
    await secureBox.delete(StorageKeys.expiresAt);
  }

  @override
  Future<void> clearAllData() async {
    // Clear all authentication-related data using delete() method
    await Future.wait([
      secureBox.delete(StorageKeys.authData),
      secureBox.delete(StorageKeys.accessToken),
      secureBox.delete(StorageKeys.refreshToken),
      secureBox.delete(StorageKeys.userData),
      secureBox.delete(StorageKeys.expiresAt),
      secureBox.delete(StorageKeys.userProfile),
      secureBox.delete(StorageKeys.biometricEnabled),
      secureBox.delete(StorageKeys.lastLoginTime),
    ]);
  }
}