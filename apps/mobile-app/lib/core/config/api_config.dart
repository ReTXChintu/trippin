import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConfig {
  static String get baseUrl {
    final url = dotenv.env['API_BASE_URL']?.trim();
    if (url == null || url.isEmpty) {
      throw StateError(
        'API_BASE_URL is not set. Copy .env.example to .env and set your API URL.',
      );
    }
    return url;
  }
}
