import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart';

class EncryptionService {
  static const String _keyPrefix = 'gp_key_';
  static const int _keyLength = 32;
  static const int _ivLength = 16;
  
  late final Encrypter _encrypter;
  late final Key _key;
  
  EncryptionService() {
    _initializeEncryption();
  }
  
  void _initializeEncryption() {
    // Generate or retrieve encryption key
    final keyBytes = _generateSecureKey();
    _key = Key(keyBytes);
    _encrypter = Encrypter(AES(_key));
  }
  
  Uint8List _generateSecureKey() {
    final random = Random.secure();
    final keyBytes = Uint8List(_keyLength);
    for (int i = 0; i < _keyLength; i++) {
      keyBytes[i] = random.nextInt(256);
    }
    return keyBytes;
  }
  
  /// Encrypt sensitive text data
  String encryptText(String plainText) {
    try {
      final iv = IV.fromSecureRandom(_ivLength);
      final encrypted = _encrypter.encrypt(plainText, iv: iv);
      
      // Combine IV and encrypted data
      final combined = iv.bytes + encrypted.bytes;
      return base64.encode(combined);
    } catch (e) {
      throw EncryptionException('Failed to encrypt data: $e');
    }
  }
  
  /// Decrypt sensitive text data
  String decryptText(String encryptedText) {
    try {
      final combined = base64.decode(encryptedText);
      
      // Extract IV and encrypted data
      final iv = IV(combined.sublist(0, _ivLength));
      final encryptedBytes = combined.sublist(_ivLength);
      
      final encrypted = Encrypted(encryptedBytes);
      return _encrypter.decrypt(encrypted, iv: iv);
    } catch (e) {
      throw EncryptionException('Failed to decrypt data: $e');
    }
  }
  
  /// Encrypt location data
  Map<String, dynamic> encryptLocationData(Map<String, dynamic> locationData) {
    final sensitiveFields = ['latitude', 'longitude', 'address', 'timestamp'];
    final encryptedData = Map<String, dynamic>.from(locationData);
    
    for (final field in sensitiveFields) {
      if (encryptedData.containsKey(field)) {
        final value = encryptedData[field].toString();
        encryptedData[field] = encryptText(value);
      }
    }
    
    encryptedData['_encrypted'] = true;
    return encryptedData;
  }
  
  /// Decrypt location data
  Map<String, dynamic> decryptLocationData(Map<String, dynamic> encryptedData) {
    if (encryptedData['_encrypted'] != true) {
      return encryptedData; // Not encrypted
    }
    
    final sensitiveFields = ['latitude', 'longitude', 'address', 'timestamp'];
    final decryptedData = Map<String, dynamic>.from(encryptedData);
    
    for (final field in sensitiveFields) {
      if (decryptedData.containsKey(field)) {
        final encryptedValue = decryptedData[field].toString();
        decryptedData[field] = decryptText(encryptedValue);
      }
    }
    
    decryptedData.remove('_encrypted');
    return decryptedData;
  }
  
  /// Generate hash for data integrity verification
  String generateHash(String data) {
    final bytes = utf8.encode(data);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }
  
  /// Verify data integrity
  bool verifyHash(String data, String hash) {
    return generateHash(data) == hash;
  }
  
  /// Secure data wipe
  void secureWipe(List<int> data) {
    final random = Random.secure();
    for (int i = 0; i < data.length; i++) {
      data[i] = random.nextInt(256);
    }
  }
}

class EncryptionException implements Exception {
  final String message;
  EncryptionException(this.message);
  
  @override
  String toString() => 'EncryptionException: $message';
}