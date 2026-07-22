import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/error/exceptions.dart';
import '../models/privacy_settings_model.dart';
import '../models/user_data_model.dart';

abstract class PrivacyRemoteDataSource {
  Future<PrivacySettingsModel> getPrivacySettings();
  Future<void> updatePrivacySettings(PrivacySettingsModel settings);
  Future<UserDataModel> getUserData();
  Future<void> requestDataDeletion();
}

class PrivacyRemoteDataSourceImpl implements PrivacyRemoteDataSource {
  final http.Client client;
  final String baseUrl;

  PrivacyRemoteDataSourceImpl({
    required this.client,
    required this.baseUrl,
  });

  @override
  Future<PrivacySettingsModel> getPrivacySettings() async {
    final response = await client.get(
      Uri.parse('$baseUrl/privacy/settings'),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode == 200) {
      return PrivacySettingsModel.fromJson(json.decode(response.body));
    } else {
      throw ServerException();
    }
  }

  @override
  Future<void> updatePrivacySettings(PrivacySettingsModel settings) async {
    final response = await client.put(
      Uri.parse('$baseUrl/privacy/settings'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(settings.toJson()),
    );

    if (response.statusCode != 200) {
      throw ServerException();
    }
  }

  @override
  Future<UserDataModel> getUserData() async {
    final response = await client.get(
      Uri.parse('$baseUrl/privacy/user-data'),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode == 200) {
      return UserDataModel.fromJson(json.decode(response.body));
    } else {
      throw ServerException();
    }
  }

  @override
  Future<void> requestDataDeletion() async {
    final response = await client.delete(
      Uri.parse('$baseUrl/privacy/delete-data'),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode != 200) {
      throw ServerException();
    }
  }
}