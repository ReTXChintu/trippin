import 'package:flutter/widgets.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_tile_caching/flutter_map_tile_caching.dart';
import 'package:latlong2/latlong.dart';

import '../core/config.dart';
import 'models.dart';

/// Offline map tiles. One store for every trip, so areas several trips share are saved once.
class TileService {
  static const _store = 'trippin_tiles';
  bool _ready = false;

  Future<void> init() async {
    if (_ready) return;
    await FMTCObjectBoxBackend().initialise();
    final store = const FMTCStore(_store);
    if (!await store.manage.ready) await store.manage.create();
    _ready = true;
  }

  Widget layer() => TileLayer(
        urlTemplate: AppConfig.tileUrl,
        userAgentPackageName: AppConfig.userAgentPackage,
        tileProvider: _ready
            ? FMTCTileProvider(stores: const {_store: BrowseStoreStrategy.readUpdateCreate})
            : NetworkTileProvider(),
      );

  TileLayer get _options => TileLayer(urlTemplate: AppConfig.tileUrl, userAgentPackageName: AppConfig.userAgentPackage);

  /// What to save for a trip: a corridor along every day's route and around every stop at street
  /// level, plus an overview of the whole area — not whole rectangles, which would be huge.
  List<DownloadableRegion> regionsFor(TripBundle trip) {
    final streets = <BaseRegion>[];
    for (final day in trip.days) {
      final route = trip.routes[day.number]?.points ?? const <LatLng>[];
      if (route.length >= 2) streets.add(LineRegion(_thin(route), 350));
    }
    for (final p in trip.allPoints) {
      streets.add(CircleRegion(p, 0.9));
    }
    final all = trip.allPoints;
    final regions = <DownloadableRegion>[];
    if (all.isNotEmpty) {
      var minLat = all.first.latitude, maxLat = minLat, minLng = all.first.longitude, maxLng = minLng;
      for (final p in all) {
        if (p.latitude < minLat) minLat = p.latitude;
        if (p.latitude > maxLat) maxLat = p.latitude;
        if (p.longitude < minLng) minLng = p.longitude;
        if (p.longitude > maxLng) maxLng = p.longitude;
      }
      final overview = RectangleRegion(LatLngBounds(LatLng(minLat - 0.05, minLng - 0.05), LatLng(maxLat + 0.05, maxLng + 0.05)));
      regions.add(overview.toDownloadable(minZoom: 8, maxZoom: 12, options: _options));
    }
    if (streets.isNotEmpty) regions.add(MultiRegion(streets).toDownloadable(minZoom: 13, maxZoom: 16, options: _options));
    return regions;
  }

  /// Keeps a long route manageable: a point every ~150 m is plenty for a 350 m corridor.
  List<LatLng> _thin(List<LatLng> line) {
    final out = <LatLng>[line.first];
    const d = Distance();
    for (final p in line.skip(1)) {
      if (d.as(LengthUnit.Meter, out.last, p) >= 150) out.add(p);
    }
    if (out.last != line.last) out.add(line.last);
    return out;
  }

  Future<int> countTiles(TripBundle trip) async {
    await init();
    var total = 0;
    for (final r in regionsFor(trip)) {
      total += await const FMTCStore(_store).download.countTiles(r);
    }
    return total;
  }

  /// Saves the trip's tiles, reporting 0–1. Tiles already on the phone are skipped.
  Stream<double> download(TripBundle trip) async* {
    await init();
    final regions = regionsFor(trip);
    final counts = <int>[];
    for (final r in regions) {
      counts.add(await const FMTCStore(_store).download.countTiles(r));
    }
    final total = counts.fold<int>(0, (a, b) => a + b);
    if (total == 0) return;
    var before = 0;
    for (var i = 0; i < regions.length; i++) {
      final dl = const FMTCStore(_store).download.startForeground(
            region: regions[i],
            skipExistingTiles: true,
            parallelThreads: 4,
            // Be gentle with the free tile servers.
            rateLimit: 40,
            instanceId: i,
          );
      await for (final p in dl.downloadProgress) {
        yield ((before + p.attemptedTilesCount) / total).clamp(0.0, 1.0);
      }
      before += counts[i];
    }
    yield 1;
  }

  /// Space the saved map tiles use, in MB.
  Future<double> sizeMb() async {
    await init();
    return (await const FMTCStore(_store).stats.size) / 1024;
  }

  Future<void> clear() async {
    await init();
    await const FMTCStore(_store).manage.reset();
  }
}
