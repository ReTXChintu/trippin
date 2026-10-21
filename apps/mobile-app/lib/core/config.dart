import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Values from the app's bundled `.env` (copied from `.env.example`).
class AppConfig {
  static String _read(String key, {String? fallback}) {
    final value = dotenv.env[key]?.trim();
    if (value != null && value.isNotEmpty) return value;
    if (fallback != null) return fallback;
    throw StateError('$key is not set. Copy .env.example to .env and fill it in.');
  }

  /// The Trippin API, including `/api/v1`.
  static String get apiBaseUrl => _read('API_BASE_URL');

  /// The Trippin website — planning happens there.
  static String get webUrl => _read('WEB_URL', fallback: apiBaseUrl.replaceFirst(RegExp(r'/api/v1/?$'), ''));

  /// Map tiles. Use a provider that allows offline saving for heavy use (MapTiler, Stadia, your own).
  static String get tileUrl => _read('MAP_TILE_URL', fallback: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');

  static const userAgentPackage = 'com.itineraryplanner.itinerary_planner';

  /// The shared identity server (one account for Trippin, SpendLog and InFrame), e.g.
  /// `https://id-x.duckdns.org:50011`. flutter_appauth finds its endpoints by discovery.
  static String get oidcIssuer => _read('OIDC_ISSUER').replaceFirst(RegExp(r'/+$'), '');

  /// This app's public client on the identity server (PKCE, no secret).
  static String get oidcClientId => _read('OIDC_CLIENT_ID', fallback: 'trippin-mobile');

  static const oidcScopes = ['openid', 'email', 'profile', 'offline_access'];

  /// Where the identity server sends the browser back to the app (sign-in and sign-out). The scheme
  /// is android/app/build.gradle.kts's `appAuthRedirectScheme` and must match it. It is the
  /// applicationId with `_` → `-`: a URI scheme can't contain `_`, so browsers and the identity
  /// server would reject `com.itineraryplanner.itinerary_planner:` itself.
  static const oidcRedirectScheme = 'com.itineraryplanner.itinerary-planner';
  static const oidcRedirectUrl = '$oidcRedirectScheme:/oauth2redirect';
}
