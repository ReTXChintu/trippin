import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../core/theme.dart';
import '../../data/app_state.dart';
import '../../data/models.dart';
import '../../shared/widgets.dart';
import '../day/stop_sheet.dart';
import '../navigate/location.dart';

/// A day on the map: saved tiles, the road route, numbered stops and where you are.
class DayMapScreen extends ConsumerStatefulWidget {
  const DayMapScreen({super.key, required this.tripId, required this.dayNumber});
  final String tripId;
  final int dayNumber;
  @override
  ConsumerState<DayMapScreen> createState() => _DayMapScreenState();
}

class _DayMapScreenState extends ConsumerState<DayMapScreen> {
  final _map = MapController();
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    ref.read(tilesProvider).init().whenComplete(() {
      if (mounted) setState(() => _ready = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final trip = ref.watch(bundleProvider(widget.tripId)).valueOrNull;
    final day = trip?.days.where((d) => d.number == widget.dayNumber).firstOrNull;
    final fix = ref.watch(locationProvider).valueOrNull;
    if (trip == null || day == null || !_ready) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final color = TrippinColors.day(day.number);
    final route = trip.routes[day.number]?.points ?? const <LatLng>[];
    final stay = trip.stayFor(day);
    final points = [...day.stops.map((s) => s.point).whereType<LatLng>(), if (stay?.point != null) stay!.point!];
    final fallbackLine = points.length >= 2 ? points : const <LatLng>[];
    var n = 0;

    final markers = <Marker>[
      if (stay?.point != null)
        Marker(
          point: stay!.point!,
          width: 34,
          height: 34,
          // Where you sleep: an ink pin (ink is the neutral "data" colour).
          child: _Pin(color: context.ds.tx, child: Icon(Icons.hotel, size: 16, color: context.ds.bg)),
        ),
      for (final s in day.stops)
        if (s.point != null && s.kind == StopKind.visit)
          Marker(
            point: s.point!,
            width: 34,
            height: 34,
            child: GestureDetector(
              onTap: () => showStopSheet(context, ref, trip: trip, day: day, stop: s),
              child: _Pin(
                color: s.done || s.skipped ? context.ds.tx3 : color,
                child: Text('${++n}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13, fontFeatures: Ds.tabular)),
              ),
            ),
          ),
      if (fix != null)
        Marker(
          point: fix.point,
          width: 26,
          height: 26,
          // You, now: the accent (the "today / now" marker colour).
          child: Container(
            decoration: BoxDecoration(
              color: context.ds.ac,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6)],
            ),
          ),
        ),
    ];

    return Scaffold(
      appBar: AppBar(title: Text('Day ${day.number} map')),
      body: Stack(children: [
        FlutterMap(
          mapController: _map,
          options: MapOptions(
            initialCameraFit: points.length >= 2
                ? CameraFit.bounds(bounds: LatLngBounds.fromPoints(points), padding: const EdgeInsets.all(48))
                : null,
            initialCenter: points.isNotEmpty ? points.first : const LatLng(20.59, 78.96),
            initialZoom: points.isNotEmpty ? 13 : 4,
            maxZoom: 18,
          ),
          children: [
            ref.read(tilesProvider).layer(),
            PolylineLayer(polylines: [
              if (route.length >= 2)
                Polyline(points: route, color: color, strokeWidth: 5)
              else if (fallbackLine.isNotEmpty)
                Polyline(points: fallbackLine, color: color.withValues(alpha: 0.6), strokeWidth: 3, pattern: StrokePattern.dashed(segments: const [10, 8])),
            ]),
            MarkerLayer(markers: markers),
            const SimpleAttributionWidget(source: Text('OpenStreetMap contributors')),
          ],
        ),
        Positioned(
          right: 16,
          bottom: 40,
          child: Column(children: [
            MapControl(
              tooltip: 'Show the whole day',
              icon: Icons.zoom_out_map,
              onPressed: points.length >= 2
                  ? () => _map.fitCamera(CameraFit.bounds(bounds: LatLngBounds.fromPoints(points), padding: const EdgeInsets.all(48)))
                  : null,
            ),
            const SizedBox(height: 8),
            // The primary map action stays an accent FAB (56, radius 16).
            FloatingActionButton(
              heroTag: 'me',
              tooltip: 'Where am I',
              elevation: 2,
              onPressed: () {
                if (fix != null) {
                  _map.move(fix.point, 16);
                } else {
                  final err = ref.read(locationProvider).error;
                  toast(context, err is LocationError ? err.message : 'Finding you…');
                }
              },
              child: const Icon(Icons.my_location),
            ),
          ]),
        ),
      ]),
    );
  }
}

class _Pin extends StatelessWidget {
  const _Pin({required this.color, required this.child});
  final Color color;
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2.5),
          boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4)],
        ),
        child: child,
      );
}
