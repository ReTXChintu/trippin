import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'config.dart';

class TokenStorage {
  TokenStorage([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();
  final FlutterSecureStorage _storage;
  static const _key = 'access_token';
  static const _idTokenKey = 'id_token';

  /// Trippin's own token, sent with every API request.
  Future<String?> read() => _storage.read(key: _key);
  Future<void> write(String token) => _storage.write(key: _key, value: token);

  /// The identity server's ID token from the last sign-in — only used to end that session on sign-out.
  Future<String?> readIdToken() => _storage.read(key: _idTokenKey);
  Future<void> writeIdToken(String token) => _storage.write(key: _idTokenKey, value: token);

  Future<void> clear() async {
    await _storage.delete(key: _key);
    await _storage.delete(key: _idTokenKey);
  }
}

class ApiException implements Exception {
  ApiException(this.message, {this.unauthorized = false, this.offline = false});
  final String message;
  final bool unauthorized;
  final bool offline;
  @override
  String toString() => message;
}

/// Talks to the Trippin API with the saved sign-in token, and turns failures into readable errors.
class ApiClient {
  ApiClient(this.tokens) {
    dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 90),
      headers: {'Content-Type': 'application/json'},
      validateStatus: (_) => true,
    ));
    dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) async {
      final token = await tokens.read();
      if (token != null && token.isNotEmpty) options.headers['Authorization'] = 'Bearer $token';
      handler.next(options);
    }));
  }

  final TokenStorage tokens;
  late final Dio dio;

  Future<Map<String, dynamic>> request(String method, String path, {Object? body, Map<String, dynamic>? query}) async {
    Response<dynamic> res;
    try {
      res = await dio.request<dynamic>(path, data: body, queryParameters: query, options: Options(method: method));
    } on DioException catch (e) {
      final offline = e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.unknown;
      throw ApiException(offline ? "Can't reach Trippin — check your connection." : 'The request timed out. Try again.', offline: true);
    }
    final data = res.data is Map ? (res.data as Map).cast<String, dynamic>() : <String, dynamic>{};
    if (res.statusCode == 401) {
      throw ApiException(data['error']?.toString() ?? 'Please sign in again.', unauthorized: true);
    }
    if ((res.statusCode ?? 500) >= 400 || data['success'] == false) {
      throw ApiException(data['error']?.toString() ?? 'Something went wrong (${res.statusCode}).');
    }
    final payload = data['data'];
    return payload is Map ? payload.cast<String, dynamic>() : <String, dynamic>{};
  }

  Future<Map<String, dynamic>> get(String path, {Map<String, dynamic>? query}) => request('GET', path, query: query);
  Future<Map<String, dynamic>> post(String path, {Object? body}) => request('POST', path, body: body);
}
