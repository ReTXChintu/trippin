import 'dart:convert';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:itinerary_planner/core/api/api_client.dart';
import 'package:itinerary_planner/features/trips/models/trip_models.dart';
import 'package:itinerary_planner/features/trips/models/route_models.dart';
import 'package:itinerary_planner/features/trips/trips_repository.dart';

/// Everything the itinerary screen needs to render fully offline for one trip:
/// the trip itself (for hotel/leg info), its itinerary (stops/schedule), and
/// the real road-following routes (polylines + distances). Bundled together
/// because there is no leg concept in the mobile itinerary model yet, so
/// "download for offline" is scoped to the whole trip rather than a leg.
class OfflineTripBundle {
  OfflineTripBundle({required this.trip, required this.itinerary, required this.routes, required this.savedAt});

  final Trip trip;
  final Itinerary itinerary;
  final List<DayRoute> routes;
  final DateTime savedAt;

  Map<String, dynamic> toJson() => {
        'trip': trip.toJson(),
        'itinerary': itinerary.toJson(),
        'routes': routes.map((r) => r.toJson()).toList(),
        'savedAt': savedAt.toIso8601String(),
      };

  factory OfflineTripBundle.fromJson(Map<String, dynamic> json) => OfflineTripBundle(
        trip: Trip.fromJson(json['trip'] as Map<String, dynamic>),
        itinerary: Itinerary.fromJson(json['itinerary'] as Map<String, dynamic>),
        routes: (json['routes'] as List<dynamic>? ?? [])
            .map((r) => DayRoute.fromJson(r as Map<String, dynamic>))
            .toList(),
        savedAt: DateTime.tryParse(json['savedAt'] as String? ?? '') ?? DateTime.now(),
      );
}

/// Reads/writes a single JSON file per trip under the app's documents
/// directory. Deliberately a plain file, not a database — this is small,
/// infrequently-written data (one bundle per trip, replaced wholesale on
/// each "Download for offline" tap).
class OfflineBundleCache {
  OfflineBundleCache(this._repository);

  final TripsRepository _repository;

  Future<File> _fileFor(String tripId) async {
    final dir = await getApplicationDocumentsDirectory();
    final offlineDir = Directory('${dir.path}/offline_trips');
    if (!await offlineDir.exists()) {
      await offlineDir.create(recursive: true);
    }
    return File('${offlineDir.path}/$tripId.json');
  }

  Future<bool> isDownloaded(String tripId) async {
    final file = await _fileFor(tripId);
    return file.exists();
  }

  Future<OfflineTripBundle?> read(String tripId) async {
    try {
      final file = await _fileFor(tripId);
      if (!await file.exists()) return null;
      final raw = await file.readAsString();
      return OfflineTripBundle.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  /// Fetches trip + itinerary + routes live and persists them together.
  /// Throws if the trip has no itinerary yet or any fetch fails — callers
  /// should surface that as "nothing to download" rather than silently
  /// caching a partial/empty bundle.
  Future<OfflineTripBundle> download(String tripId) async {
    final trip = await _repository.getTrip(tripId);
    final itinerary = await _repository.getItinerary(tripId);
    if (itinerary == null) {
      throw ApiException('Generate an itinerary before downloading it for offline use');
    }
    final routes = await _repository.getItineraryRoutes(tripId);

    final bundle = OfflineTripBundle(trip: trip, itinerary: itinerary, routes: routes, savedAt: DateTime.now());
    final file = await _fileFor(tripId);
    await file.writeAsString(jsonEncode(bundle.toJson()));
    return bundle;
  }

  Future<void> delete(String tripId) async {
    final file = await _fileFor(tripId);
    if (await file.exists()) {
      await file.delete();
    }
  }
}

final offlineBundleCacheProvider = Provider<OfflineBundleCache>((ref) {
  final repository = ref.watch(tripsRepositoryProvider);
  return OfflineBundleCache(repository);
});
