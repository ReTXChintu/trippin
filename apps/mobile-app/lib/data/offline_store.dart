import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

import 'models.dart';

/// A trip saved on the phone.
class SavedTrip {
  SavedTrip({required this.summary, required this.version, required this.savedAt, required this.mapsSaved, required this.sizeKb});

  factory SavedTrip.fromJson(Json j) => SavedTrip(
        summary: TripSummary.fromJson((j['summary'] as Map).cast<String, dynamic>()),
        version: j['version'] as String? ?? '',
        savedAt: DateTime.tryParse(j['savedAt'] as String? ?? '') ?? DateTime.now(),
        mapsSaved: j['mapsSaved'] == true,
        sizeKb: (j['sizeKb'] as num?)?.toInt() ?? 0,
      );

  final TripSummary summary;
  final String version;
  final DateTime savedAt;
  final bool mapsSaved;
  final int sizeKb;

  SavedTrip copyWith({String? version, DateTime? savedAt, bool? mapsSaved, int? sizeKb, TripSummary? summary}) => SavedTrip(
        summary: summary ?? this.summary,
        version: version ?? this.version,
        savedAt: savedAt ?? this.savedAt,
        mapsSaved: mapsSaved ?? this.mapsSaved,
        sizeKb: sizeKb ?? this.sizeKb,
      );

  Json toJson() => {'summary': summary.toJson(), 'version': version, 'savedAt': savedAt.toIso8601String(), 'mapsSaved': mapsSaved, 'sizeKb': sizeKb};
}

/// A "done" / "skipped" tap made offline, sent when the phone is back online.
class PendingStatus {
  PendingStatus({required this.tripId, required this.dayNumber, required this.stopId, this.status});
  factory PendingStatus.fromJson(Json j) =>
      PendingStatus(tripId: j['tripId'] as String, dayNumber: (j['dayNumber'] as num).toInt(), stopId: j['stopId'] as String, status: j['status'] as String?);
  final String tripId, stopId;
  final int dayNumber;
  final String? status;
  Json toJson() => {'tripId': tripId, 'dayNumber': dayNumber, 'stopId': stopId, 'status': status};
}

class AppSettings {
  AppSettings({this.reminders = true, this.leadMinutes = 10, this.morningBrief = true});
  factory AppSettings.fromJson(Json j) => AppSettings(
        reminders: j['reminders'] != false,
        leadMinutes: (j['leadMinutes'] as num?)?.toInt() ?? 10,
        morningBrief: j['morningBrief'] != false,
      );
  final bool reminders, morningBrief;
  final int leadMinutes;
  AppSettings copyWith({bool? reminders, int? leadMinutes, bool? morningBrief}) =>
      AppSettings(reminders: reminders ?? this.reminders, leadMinutes: leadMinutes ?? this.leadMinutes, morningBrief: morningBrief ?? this.morningBrief);
  Json toJson() => {'reminders': reminders, 'leadMinutes': leadMinutes, 'morningBrief': morningBrief};
}

/// Plain JSON files in the app's documents folder — small, rarely written, and readable with no signal.
class OfflineStore {
  Directory? _dir;

  Future<Directory> _root() async {
    if (_dir != null) return _dir!;
    final docs = await getApplicationDocumentsDirectory();
    final dir = Directory('${docs.path}/trippin');
    await Directory('${dir.path}/trips').create(recursive: true);
    return _dir = dir;
  }

  Future<File> _file(String name) async => File('${(await _root()).path}/$name');

  Future<dynamic> _readJson(String name) async {
    try {
      final f = await _file(name);
      if (!await f.exists()) return null;
      return jsonDecode(await f.readAsString());
    } catch (_) {
      return null;
    }
  }

  Future<void> _writeJson(String name, Object value) async {
    final f = await _file(name);
    final tmp = File('${f.path}.tmp');
    await tmp.writeAsString(jsonEncode(value), flush: true);
    await tmp.rename(f.path);
  }

  // ---- saved trips ----
  Future<List<SavedTrip>> savedTrips() async {
    final list = await _readJson('saved.json');
    if (list is! List) return [];
    return list.whereType<Map>().map((e) => SavedTrip.fromJson(e.cast<String, dynamic>())).toList()
      ..sort((a, b) => a.summary.startDate.compareTo(b.summary.startDate));
  }

  Future<SavedTrip?> savedTrip(String id) async {
    for (final t in await savedTrips()) {
      if (t.summary.id == id) return t;
    }
    return null;
  }

  Future<void> _putSaved(SavedTrip trip) async {
    final all = (await savedTrips()).where((t) => t.summary.id != trip.summary.id).toList()..add(trip);
    await _writeJson('saved.json', all.map((t) => t.toJson()).toList());
  }

  Future<SavedTrip> saveBundle(Json bundle, {bool? mapsSaved}) async {
    final text = jsonEncode(bundle);
    final parsed = TripBundle.fromJson(bundle);
    await (await _file('trips/${parsed.id}.json')).writeAsString(text, flush: true);
    final previous = await savedTrip(parsed.id);
    final saved = SavedTrip(
      summary: parsed.summary,
      version: parsed.version,
      savedAt: DateTime.now(),
      mapsSaved: mapsSaved ?? previous?.mapsSaved ?? false,
      sizeKb: (text.length / 1024).ceil(),
    );
    await _putSaved(saved);
    return saved;
  }

  Future<void> markMapsSaved(String id, bool saved) async {
    final t = await savedTrip(id);
    if (t != null) await _putSaved(t.copyWith(mapsSaved: saved));
  }

  Future<void> setVersion(String id, String version) async {
    final t = await savedTrip(id);
    if (t != null) await _putSaved(t.copyWith(version: version));
  }

  Future<Json?> readBundle(String id) async {
    final j = await _readJson('trips/$id.json');
    return j is Map ? j.cast<String, dynamic>() : null;
  }

  Future<void> removeTrip(String id) async {
    final f = await _file('trips/$id.json');
    if (await f.exists()) await f.delete();
    final all = (await savedTrips()).where((t) => t.summary.id != id).toList();
    await _writeJson('saved.json', all.map((t) => t.toJson()).toList());
  }

  /// Applies a done / skipped mark to the saved copy right away.
  Future<void> setStopStatus(String tripId, int dayNumber, String stopId, String? status) async {
    final bundle = await readBundle(tripId);
    final days = (bundle?['itinerary'] as Map?)?['days'] as List?;
    if (bundle == null || days == null) return;
    for (final d in days.whereType<Map>()) {
      if (d['dayNumber'] != dayNumber) continue;
      for (final s in (d['stops'] as List? ?? []).whereType<Map>()) {
        if (s['id'] == stopId) {
          if (status == null) {
            s.remove('status');
          } else {
            s['status'] = status;
          }
        }
      }
    }
    await (await _file('trips/$tripId.json')).writeAsString(jsonEncode(bundle), flush: true);
  }

  // ---- queue of offline status taps ----
  Future<List<PendingStatus>> pending() async {
    final list = await _readJson('pending.json');
    return list is List ? list.whereType<Map>().map((e) => PendingStatus.fromJson(e.cast<String, dynamic>())).toList() : [];
  }

  Future<void> setPending(List<PendingStatus> items) => _writeJson('pending.json', items.map((e) => e.toJson()).toList());

  // ---- the signed-in user, so the app opens offline ----
  Future<Json?> cachedUser() async {
    final j = await _readJson('user.json');
    return j is Map ? j.cast<String, dynamic>() : null;
  }

  Future<void> setCachedUser(Json? user) async {
    if (user == null) {
      final f = await _file('user.json');
      if (await f.exists()) await f.delete();
    } else {
      await _writeJson('user.json', user);
    }
  }

  // ---- online trips list, shown when the signal drops ----
  Future<List<TripSummary>> cachedTripList() async {
    final list = await _readJson('trip_list.json');
    return list is List ? list.whereType<Map>().map((e) => TripSummary.fromJson(e.cast<String, dynamic>())).toList() : [];
  }

  Future<void> setCachedTripList(List<TripSummary> trips) => _writeJson('trip_list.json', trips.map((t) => t.toJson()).toList());

  // ---- settings ----
  Future<AppSettings> settings() async {
    final j = await _readJson('settings.json');
    return j is Map ? AppSettings.fromJson(j.cast<String, dynamic>()) : AppSettings();
  }

  Future<void> setSettings(AppSettings s) => _writeJson('settings.json', s.toJson());

  /// Signing out: forget everything on the phone.
  Future<void> clearAll() async {
    final root = await _root();
    if (await root.exists()) await root.delete(recursive: true);
    _dir = null;
  }
}
