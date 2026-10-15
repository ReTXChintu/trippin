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

  /// The Trippin website — sign up, password reset and planning happen there.
  static String get webUrl => _read('WEB_URL', fallback: apiBaseUrl.replaceFirst(RegExp(r'/api/v1/?$'), ''));

  /// Map tiles. Use a provider that allows offline saving for heavy use (MapTiler, Stadia, your own).
  static String get tileUrl => _read('MAP_TILE_URL', fallback: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');

  static const userAgentPackage = 'com.itineraryplanner.itinerary_planner';
}
