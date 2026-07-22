import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/error/exceptions.dart';
import '../models/privacy_settings_model.dart';

abstract class PrivacyLocalDataSource {
  Future<PrivacySettingsModel> getPrivacySettings();
  Future<void> cachePrivacySettings(PrivacySettingsModel settings);
  Future<void> clearAllData();
}

const CACHED_PRIVACY_SETTINGS = 'CACHED_PRIVACY_SETTINGS';

class PrivacyLocalDataSourceImpl implements PrivacyLocalDataSource {
  final SharedPreferences sharedPreferences;

  PrivacyLocalDataSourceImpl({required this.sharedPreferences});

  @override
  Future<PrivacySettingsModel> getPrivacySettings() {
    final jsonString = sharedPreferences.getString(CACHED_PRIVACY_SETTINGS);
    if (jsonString != null) {
      return Future.value(PrivacySettingsModel.fromJson(json.decode(jsonString)));
    } else {
      throw CacheException();
    }
  }

  @override
  Future<void> cachePrivacySettings(PrivacySettingsModel settings) {
    return sharedPreferences.setString(
      CACHED_PRIVACY_SETTINGS,
      json.encode(settings.toJson()),
    );
  }

  @override
  Future<void> clearAllData() async {
    await sharedPreferences.remove(CACHED_PRIVACY_SETTINGS);
  }
}