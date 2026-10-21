import 'package:flutter/services.dart';
import 'package:flutter_appauth/flutter_appauth.dart';

import 'config.dart';

/// The person closed the sign-in page without signing in.
class SignInCancelled implements Exception {
  const SignInCancelled();
}

class IdentityException implements Exception {
  const IdentityException(this.message);
  final String message;
  @override
  String toString() => message;
}

/// Sign-in through the shared identity server (one account for Trippin, SpendLog and InFrame).
/// An interface so tests can stand in for the browser round trip.
abstract class IdentityClient {
  /// Opens the identity server's sign-in page (authorization code + PKCE) and returns the ID token.
  /// Throws [SignInCancelled] when the person backs out, [IdentityException] when it fails.
  Future<String> signIn();

  /// Ends the session on the identity server too. Best effort: callers ignore failures.
  Future<void> signOut({String? idTokenHint});
}

class AppAuthIdentityClient implements IdentityClient {
  AppAuthIdentityClient([this._appAuth = const FlutterAppAuth()]);
  final FlutterAppAuth _appAuth;

  // Plain http is only for a local identity server while developing.
  bool get _insecure => AppConfig.oidcIssuer.startsWith('http://');

  @override
  Future<String> signIn() async {
    final AuthorizationTokenResponse res;
    try {
      res = await _appAuth.authorizeAndExchangeCode(AuthorizationTokenRequest(
        AppConfig.oidcClientId,
        AppConfig.oidcRedirectUrl,
        issuer: AppConfig.oidcIssuer,
        scopes: AppConfig.oidcScopes,
        allowInsecureConnections: _insecure,
      ));
    } on FlutterAppAuthUserCancelledException {
      throw const SignInCancelled();
    } on PlatformException catch (e) {
      throw IdentityException("Couldn't sign in${e.message != null ? ' — ${e.message}' : ''}. Check your connection and try again.");
    } on StateError catch (e) {
      throw IdentityException(e.message); // OIDC_ISSUER missing from the app's .env
    }
    final idToken = res.idToken;
    if (idToken == null || idToken.isEmpty) throw const IdentityException('The sign-in server sent no identity token.');
    return idToken;
  }

  @override
  Future<void> signOut({String? idTokenHint}) async {
    // Without the ID token there's no way back to the app afterwards (the sign-out page would just
    // stay open), so only a session we signed in ourselves is ended.
    if (idTokenHint == null || idTokenHint.isEmpty) return;
    await _appAuth.endSession(EndSessionRequest(
      idTokenHint: idTokenHint,
      postLogoutRedirectUrl: AppConfig.oidcRedirectUrl,
      issuer: AppConfig.oidcIssuer,
      allowInsecureConnections: _insecure,
      additionalParameters: {'client_id': AppConfig.oidcClientId},
    ));
  }
}
