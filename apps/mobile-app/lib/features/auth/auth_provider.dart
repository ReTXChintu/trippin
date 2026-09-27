import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:itinerary_planner/core/api/api_client.dart';
import 'package:itinerary_planner/features/auth/auth_repository.dart';
import 'package:itinerary_planner/features/auth/models/auth_models.dart';
import 'package:itinerary_planner/features/trips/trips_repository.dart';

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final tokenStorageProvider = Provider<TokenStorage>((ref) {
  return TokenStorage(ref.watch(secureStorageProvider));
});

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.watch(tokenStorageProvider));
});

class AuthState {
  const AuthState({this.user, this.isLoading = false, this.error});

  final AuthUser? user;
  final bool isLoading;
  final String? error;

  bool get isAuthenticated => user != null;

  AuthState copyWith({AuthUser? user, bool? isLoading, String? error}) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._authRepo, this._tokenStorage, this._profileRepo) : super(const AuthState()) {
    _restoreSession();
  }

  final AuthRepository _authRepo;
  final TokenStorage _tokenStorage;
  final ProfileRepository _profileRepo;

  Future<void> _restoreSession() async {
    final token = await _tokenStorage.read();
    if (token == null) return;
    try {
      final profile = await _profileRepo.getProfile();
      state = AuthState(
        user: AuthUser(id: profile.id, name: profile.name, email: profile.email, avatar: profile.avatar),
      );
    } catch (_) {
      await _tokenStorage.clear();
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final session = await _authRepo.login(email, password);
      await _tokenStorage.write(session.accessToken);
      state = AuthState(user: session.user);
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> register(String name, String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final session = await _authRepo.register(name, email, password);
      await _tokenStorage.write(session.accessToken);
      state = AuthState(user: session.user);
    } on ApiException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> logout() async {
    await _tokenStorage.clear();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.watch(authRepositoryProvider),
    ref.watch(tokenStorageProvider),
    ref.watch(profileRepositoryProvider),
  );
});
