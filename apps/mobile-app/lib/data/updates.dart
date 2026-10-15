import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../core/config.dart';

/// A newer APK published on the Trippin server (`trippin-apk.json`, written by the release pipeline).
class AppUpdate {
  AppUpdate({required this.version, required this.buildNumber, required this.url, this.notes});
  final String version;
  final int buildNumber;
  final String url;
  final String? notes;
}

final appInfoProvider = FutureProvider<PackageInfo>((_) => PackageInfo.fromPlatform());

/// The installed version, e.g. "0.2.0 (7)".
final appVersionProvider = FutureProvider<String>((ref) async {
  final info = await ref.watch(appInfoProvider.future);
  return '${info.version} (${info.buildNumber})';
});

/// A newer build on the server, or null (up to date, offline, or the check failed — never an error).
final updateProvider = FutureProvider<AppUpdate?>((ref) async {
  final info = await ref.watch(appInfoProvider.future);
  final current = int.tryParse(info.buildNumber) ?? 0;
  try {
    final base = Uri.parse(AppConfig.webUrl.endsWith('/') ? AppConfig.webUrl : '${AppConfig.webUrl}/');
    final res = await Dio(BaseOptions(connectTimeout: const Duration(seconds: 8), receiveTimeout: const Duration(seconds: 8)))
        .getUri<dynamic>(base.resolve('trippin-apk.json?t=${DateTime.now().millisecondsSinceEpoch}'));
    final data = res.data is String ? jsonDecode(res.data as String) : res.data;
    if (data is! Map) return null;
    final build = (data['buildNumber'] as num?)?.toInt() ?? int.tryParse('${data['buildNumber']}') ?? 0;
    if (build <= current) return null;
    return AppUpdate(
      version: '${data['version'] ?? ''}',
      buildNumber: build,
      url: base.resolve('${data['url'] ?? 'trippin.apk'}').toString(),
      notes: (data['notes'] as String?)?.trim().isEmpty == true ? null : data['notes'] as String?,
    );
  } catch (_) {
    return null;
  }
});

/// The build the user tapped "Later" on, so the banner stays away until the next one.
final dismissedUpdateProvider = StateProvider<int?>((_) => null);
