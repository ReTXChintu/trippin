import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:itinerary_planner/core/config/api_config.dart';

const _tokenKey = 'access_token';

class TokenStorage {
  TokenStorage(this._storage);

  final FlutterSecureStorage _storage;

  Future<String?> read() => _storage.read(key: _tokenKey);

  Future<void> write(String token) => _storage.write(key: _tokenKey, value: token);

  Future<void> clear() => _storage.delete(key: _tokenKey);
}

class ApiClient {
  ApiClient(this._tokenStorage) {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 60),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokenStorage.read();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  late final Dio _dio;
  final TokenStorage _tokenStorage;

  Dio get dio => _dio;

  Future<Map<String, dynamic>> getJson(String path, {Map<String, dynamic>? query}) async {
    final response = await _dio.get<Map<String, dynamic>>(path, queryParameters: query);
    return response.data ?? {};
  }

  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, dynamic>? body,
    Map<String, dynamic>? query,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      path,
      data: body,
      queryParameters: query,
    );
    return response.data ?? {};
  }

  Future<Map<String, dynamic>> patchJson(String path, {Map<String, dynamic>? body}) async {
    final response = await _dio.patch<Map<String, dynamic>>(path, data: body);
    return response.data ?? {};
  }

  Future<Map<String, dynamic>> putJson(String path, {Map<String, dynamic>? body}) async {
    final response = await _dio.put<Map<String, dynamic>>(path, data: body);
    return response.data ?? {};
  }

  Future<Map<String, dynamic>> deleteJson(String path, {Map<String, dynamic>? query}) async {
    final response = await _dio.delete<Map<String, dynamic>>(path, queryParameters: query);
    return response.data ?? {};
  }

  T unwrapData<T>(Map<String, dynamic> json, T Function(Map<String, dynamic>) parser) {
    if (json['success'] != true) {
      throw ApiException(json['error']?.toString() ?? 'Request failed');
    }
    final data = json['data'];
    if (data is Map<String, dynamic>) {
      return parser(data);
    }
    throw ApiException('Invalid response');
  }

  List<T> unwrapList<T>(
    Map<String, dynamic> json,
    String listKey,
    T Function(Map<String, dynamic>) parser,
  ) {
    if (json['success'] != true) {
      throw ApiException(json['error']?.toString() ?? 'Request failed');
    }
    final data = json['data'] as Map<String, dynamic>?;
    final list = data?[listKey] as List<dynamic>? ?? [];
    return list.map((e) => parser(e as Map<String, dynamic>)).toList();
  }
}

class ApiException implements Exception {
  ApiException(this.message);
  final String message;

  @override
  String toString() => message;
}
