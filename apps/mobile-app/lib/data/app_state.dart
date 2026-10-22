import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../core/identity.dart';
import 'models.dart';
import 'offline_store.dart';
import 'reminders.dart';
import 'tile_service.dart';
import '../core/push_service.dart';

final storeProvider = Provider((_) => OfflineStore());
final tokensProvider = Provider((_) => TokenStorage());
final apiProvider = Provider((ref) => ApiClient(ref.watch(tokensProvider)));
final identityProvider = Provider<IdentityClient>((_) => AppAuthIdentityClient());
final tilesProvider = Provider((_) => TileService());
final remindersProvider = Provider((_) => Reminders());

/// True while the phone has any network. (A network doesn't guarantee the server is reachable.)
final onlineProvider = StreamProvider<bool>((ref) async* {
  final c = Connectivity();
  bool up(List<ConnectivityResult> r) => r.any((x) => x != ConnectivityResult.none);
  yield up(await c.checkConnectivity());
  yield* c.onConnectivityChanged.map(up);
});

// ---------------------------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------------------------

class Session {
  const Session({this.user, this.loading = true, this.needsSignIn = false});
  final Json? user;
  final bool loading;

  /// The server rejected the saved sign-in — saved trips still open, but syncing needs a new sign-in.
  final bool needsSignIn;

  bool get signedIn => user != null;
  String get name => user?['name'] as String? ?? '';
  String get email => user?['email'] as String? ?? '';
}

class SessionNotifier extends StateNotifier<Session> {
  SessionNotifier(this.ref, {Session? initial}) : super(initial ?? const Session()) {
    if (initial == null) _restore();
  }
  final Ref ref;

  Future<void> _restore() async {
    final store = ref.read(storeProvider);
    final token = await ref.read(tokensProvider).read();
    final user = await store.cachedUser();
    // Signed in as far as the phone knows — open straight away, even with no signal.
    state = Session(user: token != null ? user : null, loading: false);
    if (token == null || user == null) return;
    try {
      final profile = await ref.read(apiProvider).get('/profile');
      final p = (profile['profile'] as Map?)?.cast<String, dynamic>();
      if (p != null) {
        final fresh = {'id': p['id'], 'name': p['name'], 'email': p['email']};
        await store.setCachedUser(fresh);
        state = Session(user: fresh, loading: false);
      }
    } on ApiException catch (e) {
      if (e.unauthorized) markSignedOut();
    }
  }

  /// Signs in on the identity server's page (in the browser), then trades its ID token for
  /// Trippin's own access token. Throws [SignInCancelled] if the person backs out.
  Future<void> signIn() async {
    final idToken = await ref.read(identityProvider).signIn();
    final data = await ref.read(apiProvider).post('/auth/oidc/mobile', body: {'idToken': idToken});
    final token = data['accessToken'] as String?;
    final user = (data['user'] as Map?)?.cast<String, dynamic>();
    if (token == null || user == null) throw ApiException('Sign-in failed. Try again.');
    final tokens = ref.read(tokensProvider);
    await tokens.write(token);
    await tokens.writeIdToken(idToken);
    await ref.read(storeProvider).setCachedUser(user);
    state = Session(user: user, loading: false);
  }

  /// The server said the token is no good: keep the saved trips usable, ask to sign in to sync.
  void markSignedOut() {
    if (state.user != null) state = Session(user: state.user, loading: false, needsSignIn: true);
  }

  /// Signs out of the identity server too when it can (it may open a browser page briefly), then
  /// clears everything on the phone either way.
  Future<void> signOut() async {
    final tokens = ref.read(tokensProvider);
    // While still signed in: this phone stops getting the account's notifications.
    await ref.read(pushProvider).unregister();
    try {
      await ref.read(identityProvider).signOut(idTokenHint: await tokens.readIdToken());
    } catch (_) {
      // Offline, or the server said no — the phone is signed out regardless.
    }
    await tokens.clear();
    await ref.read(remindersProvider).cancelAll();
    await ref.read(tilesProvider).clear().catchError((_) {});
    await ref.read(storeProvider).clearAll();
    state = const Session(loading: false);
  }
}

final sessionProvider = StateNotifierProvider<SessionNotifier, Session>((ref) => SessionNotifier(ref));

// ---------------------------------------------------------------------------------------------
// Trips
// ---------------------------------------------------------------------------------------------

/// Trips saved on the phone.
class SavedTripsNotifier extends StateNotifier<List<SavedTrip>> {
  SavedTripsNotifier(this.ref) : super(const []) {
    reload();
  }
  final Ref ref;
  Future<void> reload() async => state = await ref.read(storeProvider).savedTrips();
}

final savedTripsProvider = StateNotifierProvider<SavedTripsNotifier, List<SavedTrip>>((ref) => SavedTripsNotifier(ref));

/// The account's trips from the server, or the last list seen when offline (`fromCache`).
class TripList {
  TripList(this.trips, {this.fromCache = false, this.error});
  final List<TripSummary> trips;
  final bool fromCache;
  final String? error;
}

final tripListProvider = FutureProvider.autoDispose<TripList>((ref) async {
  final store = ref.read(storeProvider);
  try {
    final data = await ref.read(apiProvider).get('/trips');
    final trips = (data['trips'] as List? ?? []).whereType<Map>().map((e) => TripSummary.fromJson(e.cast<String, dynamic>())).toList();
    await store.setCachedTripList(trips);
    return TripList(trips);
  } on ApiException catch (e) {
    if (e.unauthorized) ref.read(sessionProvider.notifier).markSignedOut();
    return TripList(await store.cachedTripList(), fromCache: true, error: e.message);
  }
});

/// One trip: the saved copy when there is one (works offline), else live from the server.
final bundleProvider = FutureProvider.autoDispose.family<TripBundle, String>((ref, id) async {
  ref.watch(savedTripsProvider); // reload after saves / refreshes
  final saved = await ref.read(storeProvider).readBundle(id);
  if (saved != null) return TripBundle.fromJson(saved);
  final live = await ref.read(apiProvider).get('/trips/$id/offline-bundle');
  return TripBundle.fromJson(live);
});

/// Progress of "Save for offline" per trip: null = idle, 0–1 = working.
final saveProgressProvider = StateProvider<Map<String, ({String label, double? value})>>((_) => const {});

final tripServiceProvider = Provider((ref) => TripService(ref));

class TripService {
  TripService(this.ref);
  final Ref ref;

  OfflineStore get _store => ref.read(storeProvider);
  ApiClient get _api => ref.read(apiProvider);

  void _progress(String id, String? label, [double? value]) {
    final next = {...ref.read(saveProgressProvider)};
    if (label == null) {
      next.remove(id);
    } else {
      next[id] = (label: label, value: value);
    }
    ref.read(saveProgressProvider.notifier).state = next;
  }

  /// Downloads the trip and (optionally) its map tiles so everything works with no signal.
  Future<void> save(String id, {bool maps = true}) async {
    try {
      _progress(id, 'Saving the plan…');
      final json = await _api.get('/trips/$id/offline-bundle');
      await _store.saveBundle(json);
      await ref.read(savedTripsProvider.notifier).reload();
      if (maps) {
        final trip = TripBundle.fromJson(json);
        _progress(id, 'Saving maps…', 0);
        await for (final p in ref.read(tilesProvider).download(trip)) {
          _progress(id, 'Saving maps…', p);
        }
        await _store.markMapsSaved(id, true);
        await ref.read(savedTripsProvider.notifier).reload();
      }
      await rescheduleReminders();
    } finally {
      _progress(id, null);
    }
  }

  Future<void> remove(String id) async {
    await _store.removeTrip(id);
    await ref.read(savedTripsProvider.notifier).reload();
    await rescheduleReminders();
  }

  /// Sends offline taps, then refreshes any saved trip that changed on the web. Quiet on failure.
  Future<void> sync() async {
    if (ref.read(sessionProvider).needsSignIn) return;
    try {
      await flushPending();
      final pending = await _store.pending();
      var changed = false;
      for (final t in await _store.savedTrips()) {
        if (pending.any((p) => p.tripId == t.summary.id)) continue;
        final v = await _api.get('/trips/${t.summary.id}/offline-bundle/version');
        if (v['version'] != null && v['version'] != t.version) {
          final json = await _api.get('/trips/${t.summary.id}/offline-bundle');
          await _store.saveBundle(json);
          changed = true;
          if (t.mapsSaved) {
            // Only tiles that aren't on the phone yet (a new stop, a changed route).
            await ref.read(tilesProvider).download(TripBundle.fromJson(json)).drain<void>();
          }
        }
      }
      if (changed) {
        await ref.read(savedTripsProvider.notifier).reload();
        await rescheduleReminders();
      }
    } on ApiException catch (e) {
      if (e.unauthorized) ref.read(sessionProvider.notifier).markSignedOut();
    } catch (_) {}
  }

  /// Marks a stop done / skipped (or clears it). Applied on the phone at once, sent when online.
  Future<void> setStatus(String tripId, int dayNumber, String stopId, String? status) async {
    final saved = await _store.savedTrip(tripId);
    if (saved != null) {
      await _store.setStopStatus(tripId, dayNumber, stopId, status);
      final queue = (await _store.pending()).where((p) => !(p.tripId == tripId && p.stopId == stopId)).toList()
        ..add(PendingStatus(tripId: tripId, dayNumber: dayNumber, stopId: stopId, status: status));
      await _store.setPending(queue);
      await ref.read(savedTripsProvider.notifier).reload();
      unawaited(flushPending());
    } else {
      await _post(tripId, dayNumber, stopId, status);
      ref.invalidate(bundleProvider(tripId));
    }
  }

  Future<void> _post(String tripId, int dayNumber, String stopId, String? status) =>
      _api.post('/trips/$tripId/itinerary', body: {'action': 'setStatus', 'dayNumber': dayNumber, 'stopId': stopId, 'status': status});

  Future<void> flushPending() async {
    final queue = await _store.pending();
    if (queue.isEmpty) return;
    final left = <PendingStatus>[];
    final sent = <String>{};
    for (final p in queue) {
      try {
        await _post(p.tripId, p.dayNumber, p.stopId, p.status);
        sent.add(p.tripId);
      } on ApiException catch (e) {
        if (e.unauthorized) ref.read(sessionProvider.notifier).markSignedOut();
        // Offline or server trouble: keep it for next time. A rejected one (stop gone) is dropped.
        if (e.offline || e.unauthorized) left.add(p);
      }
    }
    await _store.setPending(left);
    // Our copy already has these changes — adopt the server's new version so it isn't re-downloaded.
    for (final id in sent) {
      if (left.any((p) => p.tripId == id)) continue;
      try {
        final v = await _api.get('/trips/$id/offline-bundle/version');
        if (v['version'] is String) await _store.setVersion(id, v['version'] as String);
      } catch (_) {}
    }
  }

  Future<void> rescheduleReminders() async {
    final bundles = <TripBundle>[];
    for (final t in await _store.savedTrips()) {
      final j = await _store.readBundle(t.summary.id);
      if (j != null) bundles.add(TripBundle.fromJson(j));
    }
    await ref.read(remindersProvider).reschedule(bundles, await _store.settings());
  }
}

final settingsProvider = FutureProvider<AppSettings>((ref) => ref.read(storeProvider).settings());
