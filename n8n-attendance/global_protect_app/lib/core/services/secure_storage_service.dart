import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'encryption_service.dart';
import '../constants/storage_keys.dart';

class SecureStorageService {
  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      keyCipherAlgorithm:
          KeyCipherAlgorithm.RSA_ECB_OAEPwithSHA_256andMGF1Padding,
      storageCipherAlgorithm: StorageCipherAlgorithm.AES_GCM_NoPadding,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
      synchronizable: false,
    ),
  );

  final EncryptionService _encryptionService;

  SecureStorageService(this._encryptionService);

  /// Store encrypted token
  Future<void> storeToken(String key, String token) async {
    try {
      final encryptedToken = _encryptionService.encryptText(token);
      final timestamp = DateTime.now().millisecondsSinceEpoch.toString();
      final hash = _encryptionService.generateHash(token);

      final tokenData = {
        'token': encryptedToken,
        'timestamp': timestamp,
        'hash': hash,
      };

      await _secureStorage.write(
        key: key,
        value: jsonEncode(tokenData),
      );
    } catch (e) {
      throw SecureStorageException('Failed to store token: $e');
    }
  }

  /// Retrieve and decrypt token
  Future<String?> getToken(String key) async {
    try {
      final tokenDataJson = await _secureStorage.read(key: key);
      if (tokenDataJson == null) return null;

      final tokenData = jsonDecode(tokenDataJson) as Map<String, dynamic>;
      final encryptedToken = tokenData['token'] as String;
      final hash = tokenData['hash'] as String;

      final decryptedToken = _encryptionService.decryptText(encryptedToken);

      // Verify integrity
      if (!_encryptionService.verifyHash(decryptedToken, hash)) {
        throw SecureStorageException('Token integrity verification failed');
      }

      return decryptedToken;
    } catch (e) {
      throw SecureStorageException('Failed to retrieve token: $e');
    }
  }

  Future<void> deleteToken(String key) async {
    try {
      await _secureStorage.delete(key: key);
    } catch (e) {
      throw SecureStorageException('Failed to delete token: $e');
    }
  }

  /// Store encrypted user data
  Future<void> storeUserData(String key, Map<String, dynamic> userData) async {
    try {
      // Remove sensitive fields and encrypt them separately
      final sensitiveFields = ['email', 'phone', 'address', 'personalId'];
      final safeData = Map<String, dynamic>.from(userData);
      final sensitiveData = <String, String>{};

      for (final field in sensitiveFields) {
        if (safeData.containsKey(field)) {
          final value = safeData.remove(field).toString();
          sensitiveData[field] = _encryptionService.encryptText(value);
        }
      }

      final secureUserData = {
        'safeData': safeData,
        'sensitiveData': sensitiveData,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      };

      await _secureStorage.write(
        key: key,
        value: jsonEncode(secureUserData),
      );
    } catch (e) {
      throw SecureStorageException('Failed to store user data: $e');
    }
  }

  /// Retrieve and decrypt user data
  Future<Map<String, dynamic>?> getUserData(String key) async {
    try {
      final userDataJson = await _secureStorage.read(key: key);
      if (userDataJson == null) return null;

      final secureUserData = jsonDecode(userDataJson) as Map<String, dynamic>;
      final safeData = secureUserData['safeData'] as Map<String, dynamic>;
      final sensitiveData =
          secureUserData['sensitiveData'] as Map<String, dynamic>;

      // Decrypt sensitive fields
      for (final entry in sensitiveData.entries) {
        safeData[entry.key] = _encryptionService.decryptText(entry.value);
      }

      return safeData;
    } catch (e) {
      throw SecureStorageException('Failed to retrieve user data: $e');
    }
  }

  /// Store encrypted location data
  Future<void> storeLocationData(
      String key, Map<String, dynamic> locationData) async {
    try {
      final encryptedLocation =
          _encryptionService.encryptLocationData(locationData);
      await _secureStorage.write(
        key: key,
        value: jsonEncode(encryptedLocation),
      );
    } catch (e) {
      throw SecureStorageException('Failed to store location data: $e');
    }
  }

  /// Retrieve and decrypt location data
  Future<Map<String, dynamic>?> getLocationData(String key) async {
    try {
      final locationDataJson = await _secureStorage.read(key: key);
      if (locationDataJson == null) return null;

      final encryptedLocation =
          jsonDecode(locationDataJson) as Map<String, dynamic>;
      return _encryptionService.decryptLocationData(encryptedLocation);
    } catch (e) {
      throw SecureStorageException('Failed to retrieve location data: $e');
    }
  }

  /// Check if token exists and is valid
  Future<bool> isTokenValid(String key) async {
    try {
      final tokenDataJson = await _secureStorage.read(key: key);
      if (tokenDataJson == null) return false;

      final tokenData = jsonDecode(tokenDataJson) as Map<String, dynamic>;
      final timestamp = int.parse(tokenData['timestamp'] as String);
      final tokenAge = DateTime.now().millisecondsSinceEpoch - timestamp;

      // Token expires after 24 hours
      return tokenAge < (24 * 60 * 60 * 1000);
    } catch (e) {
      return false;
    }
  }

  /// Securely delete data
  Future<void> secureDelete(String key) async {
    try {
      await _secureStorage.delete(key: key);
    } catch (e) {
      throw SecureStorageException('Failed to delete data: $e');
    }
  }

  /// Securely delete all data
  Future<void> secureDeleteAll() async {
    try {
      await _secureStorage.deleteAll();
    } catch (e) {
      throw SecureStorageException('Failed to delete all data: $e');
    }
  }

  /// Get all stored keys (for audit purposes)
  Future<Set<String>> getAllKeys() async {
    try {
      final allData = await _secureStorage.readAll();
      return allData.keys.toSet();
    } catch (e) {
      throw SecureStorageException('Failed to get all keys: $e');
    }
  }

  /// Generic write method for storing encrypted data
  Future<void> write(String key, String value) async {
    try {
      final encryptedValue = _encryptionService.encryptText(value);
      final timestamp = DateTime.now().millisecondsSinceEpoch.toString();
      final hash = _encryptionService.generateHash(value);

      final data = {
        'value': encryptedValue,
        'timestamp': timestamp,
        'hash': hash,
      };

      await _secureStorage.write(
        key: key,
        value: jsonEncode(data),
      );
    } catch (e) {
      throw SecureStorageException('Failed to write data: $e');
    }
  }

  /// Generic read method for retrieving encrypted data
  Future<String?> read(String key) async {
    try {
      final dataJson = await _secureStorage.read(key: key);
      if (dataJson == null) return null;

      final data = jsonDecode(dataJson) as Map<String, dynamic>;
      final encryptedValue = data['value'] as String;
      final hash = data['hash'] as String;

      final decryptedValue = _encryptionService.decryptText(encryptedValue);

      // Verify integrity
      if (!_encryptionService.verifyHash(decryptedValue, hash)) {
        throw SecureStorageException('Data integrity verification failed');
      }

      return decryptedValue;
    } catch (e) {
      throw SecureStorageException('Failed to read data: $e');
    }
  }

  /// Generic delete method
  Future<void> delete(String key) async {
    try {
      await _secureStorage.delete(key: key);
    } catch (e) {
      throw SecureStorageException('Failed to delete data: $e');
    }
  }
}

class SecureStorageException implements Exception {
  final String message;
  SecureStorageException(this.message);

  @override
  String toString() => 'SecureStorageException: $message';
}
