import 'user_model.dart';

class AuthResponseModel {
  final String accessToken;
  final String refreshToken;
  final UserModel user;
  final DateTime expiresAt;

  const AuthResponseModel({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
    required this.expiresAt,
  });

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) {
    return AuthResponseModel(
      accessToken: json['accessToken'] ?? json['token'] ?? '',
      refreshToken: json['refreshToken'] ?? '',
      user: UserModel.fromJson(json['user'] ?? {}),
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'])
          : DateTime.now().add(const Duration(hours: 24)),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      'user': user.toJson(),
      'expiresAt': expiresAt.toIso8601String(),
    };
  }
}