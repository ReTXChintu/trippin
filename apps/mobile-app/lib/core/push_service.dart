import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/app_state.dart';
import '../router.dart';

/// For notifications that arrive while the app is open: shown as a snackbar.
final pushMessengerKey = GlobalKey<ScaffoldMessengerState>();

/// Where a notification opens: its `link` (an app path), else its trip, else nothing.
String? pushLink(Map<String, dynamic> data) {
  final link = data['link'];
  if (link is String && link.startsWith('/') && !link.startsWith('//')) return link;
  final tripId = data['tripId'];
  if (tripId is String && tripId.isNotEmpty) return '/trip/${Uri.encodeComponent(tripId)}';
  return null;
}

/// Push notifications (member added/joined/left, comments, new trip dates), through Firebase.
///
/// Without the Firebase config in the build (google-services.json) this does nothing and the app
/// works as before. After sign-in it asks for permission and gives the server this phone's token;
/// at sign-out the server forgets it. A tap opens the trip.
class PushService {
  PushService(this.ref);
  final Ref ref;

  bool _ready = false;
  String? _registered;

  /// Sets Firebase up; false when this build has no Firebase config.
  Future<bool> start() async {
    if (_ready) return true;
    try {
      await Firebase.initializeApp();
    } catch (_) {
      return false;
    }
    try {
      FirebaseMessaging.onMessageOpenedApp.listen((m) => open(m.data));
      FirebaseMessaging.onMessage.listen(_showWhileOpen);
      FirebaseMessaging.instance.onTokenRefresh.listen((token) {
        if (ref.read(sessionProvider).signedIn) unawaited(_upload(token).catchError((_) {}));
      });
      final initial = await FirebaseMessaging.instance.getInitialMessage();
      if (initial != null) open(initial.data);
      _ready = true;
    } catch (_) {
      return false;
    }
    if (ref.read(sessionProvider).signedIn) unawaited(register());
    return true;
  }

  /// Signed in: ask to show notifications, and tell the server where to send them.
  Future<void> register() async {
    if (!_ready) return;
    try {
      await FirebaseMessaging.instance.requestPermission();
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await _upload(token);
    } catch (_) {
      // Offline or refused: the next start tries again.
    }
  }

  Future<void> _upload(String token) async {
    if (token == _registered) return;
    await ref.read(apiProvider).post('/notifications/devices', body: {'token': token, 'platform': 'android'});
    _registered = token;
  }

  /// Signing out: this phone stops getting that account's notifications. Never throws.
  Future<void> unregister() async {
    if (!_ready) return;
    try {
      final token = _registered ?? await FirebaseMessaging.instance.getToken();
      if (token != null) await ref.read(apiProvider).delete('/notifications/devices', body: {'token': token});
      await FirebaseMessaging.instance.deleteToken();
    } catch (_) {
      // Offline: the server drops the token the next time Firebase says it's gone.
    }
    _registered = null;
  }

  /// Opens what a tapped notification is about (once the app has a screen to go from).
  void open(Map<String, dynamic> data) {
    final link = pushLink(data);
    if (link == null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) => ref.read(routerProvider).go(link));
  }

  void _showWhileOpen(RemoteMessage message) {
    final title = message.notification?.title;
    if (title == null) return;
    final link = pushLink(message.data);
    pushMessengerKey.currentState?.showSnackBar(SnackBar(
      content: Text(title),
      action: link == null ? null : SnackBarAction(label: 'Open', onPressed: () => ref.read(routerProvider).go(link)),
    ));
  }
}

final pushProvider = Provider((ref) => PushService(ref));
