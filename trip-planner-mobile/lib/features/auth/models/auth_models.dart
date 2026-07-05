class UserProfile {
  UserProfile({
    required this.id,
    required this.name,
    required this.email,
    this.avatar,
    this.hasOpenaiKey = false,
    this.hasGoogleMapsKey = false,
    this.openaiApiKeyLast4,
    this.googleMapsApiKeyLast4,
  });

  final String id;
  final String name;
  final String email;
  final String? avatar;
  final bool hasOpenaiKey;
  final bool hasGoogleMapsKey;
  final String? openaiApiKeyLast4;
  final String? googleMapsApiKeyLast4;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      avatar: json['avatar'] as String?,
      hasOpenaiKey: json['hasOpenaiKey'] as bool? ?? false,
      hasGoogleMapsKey: json['hasGoogleMapsKey'] as bool? ?? false,
      openaiApiKeyLast4: json['openaiApiKeyLast4'] as String?,
      googleMapsApiKeyLast4: json['googleMapsApiKeyLast4'] as String?,
    );
  }
}

class AuthUser {
  AuthUser({required this.id, required this.name, required this.email, this.avatar});

  final String id;
  final String name;
  final String email;
  final String? avatar;

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      avatar: json['avatar'] as String?,
    );
  }
}
