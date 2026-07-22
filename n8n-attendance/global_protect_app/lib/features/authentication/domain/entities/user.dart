class User {
  final String id;
  final String email;
  final String name;
  final String role;
  final DateTime? lastLogin;

  const User({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    this.lastLogin,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is User &&
        other.id == id &&
        other.email == email &&
        other.name == name &&
        other.role == role;
  }

  @override
  int get hashCode => Object.hash(id, email, name, role);
}