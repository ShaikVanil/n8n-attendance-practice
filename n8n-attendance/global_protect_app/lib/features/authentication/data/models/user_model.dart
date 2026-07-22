import '../../domain/entities/user.dart';

class UserModel extends User {
  const UserModel({
    required super.id,
    required super.email,
    required super.name,
    required super.role,
    super.lastLogin,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['_id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'] ?? json['fullName'] ?? '',
      role: json['role'] ?? 'employee',
      lastLogin: json['lastLogin'] != null 
          ? DateTime.parse(json['lastLogin'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role,
      'lastLogin': lastLogin?.toIso8601String(),
    };
  }

  User toEntity() {
    return User(
      id: id,
      email: email,
      name: name,
      role: role,
      lastLogin: lastLogin,
    );
  }
}