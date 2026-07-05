import 'package:itinerary_planner/core/api/api_client.dart';
import 'package:itinerary_planner/features/auth/auth_provider.dart';
import 'package:itinerary_planner/features/auth/models/auth_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AuthRepository {
  AuthRepository(this._api);
  final ApiClient _api;

  Future<AuthSession> login(String email, String password) async {
    final json = await _api.postJson('/auth/login', body: {'email': email, 'password': password});
    if (json['success'] != true) throw ApiException(json['error']?.toString() ?? 'Login failed');
    final data = json['data'] as Map<String, dynamic>;
    return AuthSession(
      accessToken: data['accessToken'] as String,
      user: AuthUser.fromJson(data['user'] as Map<String, dynamic>),
    );
  }

  Future<AuthSession> register(String name, String email, String password) async {
    final json = await _api.postJson('/auth/register', body: {
      'name': name,
      'email': email,
      'password': password,
      'confirmPassword': password,
    });
    if (json['success'] != true) throw ApiException(json['error']?.toString() ?? 'Registration failed');
    final data = json['data'] as Map<String, dynamic>;
    return AuthSession(
      accessToken: data['accessToken'] as String,
      user: AuthUser.fromJson(data['user'] as Map<String, dynamic>),
    );
  }

  Future<String> forgotPassword(String email) async {
    final json = await _api.postJson('/auth/forgot-password', body: {'email': email});
    if (json['success'] != true) throw ApiException(json['error']?.toString() ?? 'Failed');
    return json['data']?['message'] as String? ?? 'Check your email';
  }

  Future<String> resetPassword(String token, String password) async {
    final json = await _api.postJson('/auth/reset-password', body: {
      'token': token,
      'password': password,
      'confirmPassword': password,
    });
    if (json['success'] != true) throw ApiException(json['error']?.toString() ?? 'Failed');
    return json['data']?['message'] as String? ?? 'Password updated';
  }
}

final authRepositoryProvider = Provider((ref) => AuthRepository(ref.watch(apiClientProvider)));

class AuthSession {
  AuthSession({required this.accessToken, required this.user});
  final String accessToken;
  final AuthUser user;
}
