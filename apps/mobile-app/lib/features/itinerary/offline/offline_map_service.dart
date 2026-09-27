import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_tile_caching/flutter_map_tile_caching.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

/// One FMTC store shared by every trip — tiles are addressed by (z, x, y) so
/// a single store naturally dedupes overlapping regions across trips whose
/// routes cross the same area. Region downloads are still scoped per trip
/// via the bounds passed to [OfflineMapService.downloadRegion].
const _storeName = 'itinerary_planner_tiles';
const _tileUrlTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const _userAgent = 'com.itineraryplanner.app';

/// Wraps flutter_map_tile_caching (FMTC) for downloading a bounded map
/// region once while online and rendering it from disk later with no
/// network access. No GPS/live-location code involved anywhere here — this
/// is purely "cache these tiles, replay them later."
class OfflineMapService {
  bool _initialised = false;

  Future<void> _ensureInitialised() async {
    if (_initialised) return;
    await FMTCObjectBoxBackend().initialise();
    final store = const FMTCStore(_storeName);
    if (!await store.manage.ready) {
      await store.manage.create();
    }
    _initialised = true;
  }

  /// The tile layer to use in [FlutterMap] — serves cached tiles first and
  /// falls back to network fetches (and caches those too) when online.
  Future<TileProvider> tileProvider() async {
    await _ensureInitialised();
    return const FMTCStore(_storeName).getTileProvider();
  }

  static TileLayer buildTileLayer(TileProvider provider) => TileLayer(
        urlTemplate: _tileUrlTemplate,
        userAgentPackageName: _userAgent,
        tileProvider: provider,
      );

  /// Downloads every tile between [minZoom] and [maxZoom] covering the
  /// bounding box of [routePoints] (padded so nearby roads/labels are
  /// visible, not just the exact route line). Reports 0.0-1.0 progress.
  Stream<double> downloadRegion(
    List<LatLng> routePoints, {
    int minZoom = 12,
    int maxZoom = 16,
    double paddingDegrees = 0.02,
  }) async* {
    await _ensureInitialised();
    if (routePoints.isEmpty) return;

    var minLat = routePoints.first.latitude;
    var maxLat = routePoints.first.latitude;
    var minLng = routePoints.first.longitude;
    var maxLng = routePoints.first.longitude;
    for (final p in routePoints) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }

    final bounds = LatLngBounds(
      LatLng(minLat - paddingDegrees, minLng - paddingDegrees),
      LatLng(maxLat + paddingDegrees, maxLng + paddingDegrees),
    );

    final region = RectangleRegion(bounds).toDownloadable(
      minZoom: minZoom,
      maxZoom: maxZoom,
      options: TileLayer(urlTemplate: _tileUrlTemplate, userAgentPackageName: _userAgent),
    );

    final store = const FMTCStore(_storeName);
    final download = store.download.startForeground(region: region);

    await for (final progress in download.downloadProgress) {
      yield progress.percentageProgress / 100;
    }
  }
}

final offlineMapServiceProvider = Provider<OfflineMapService>((ref) => OfflineMapService());
