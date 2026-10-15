import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../../core/geo.dart';
import '../../core/theme.dart';
import '../../data/app_state.dart';
import '../../data/models.dart';
import '../../shared/widgets.dart';
import 'location.dart';

/// Where to go: a stop on a day (with the road route into it), or any point (a stay, a hospital).
class NavTarget {
  NavTarget({required this.name, required this.point, this.address, this.route = const [], this.dayNumber, this.stopId});
  final String name;
  final LatLng point;
  final String? address;
  final List<LatLng> route;
  final int? dayNumber;
  final String? stopId;
}

/// Builds the target from the URL: `?day=&stop=` or `?lat=&lng=&name=`.
NavTarget? resolveTarget(TripBundle trip, Map<String, String> q) {
  final lat = double.tryParse(q['lat'] ?? ''), lng = double.tryParse(q['lng'] ?? '');
  if (lat != null && lng != null) return NavTarget(name: q['name'] ?? 'Destination', point: LatLng(lat, lng));
  final day = trip.days.where((d) => '${d.number}' == q['day']).firstOrNull;
  if (day == null) return null;
  final i = day.stops.indexWhere((s) => s.id == q['stop']);
  if (i < 0 || day.stops[i].point == null) return null;
  final stop = day.stops[i];
  // The road route into this stop: from the previous stop with a location (or the stay) to it.
  LatLng? from;
  for (var j = i - 1; j >= 0; j--) {
    if (day.stops[j].point != null) {
      from = day.stops[j].point;
      break;
    }
  }
  from ??= trip.stayFor(day)?.point;
  final route = routeBetween(trip.routes[day.number]?.points ?? const [], from, stop.point!);
  return NavTarget(
    name: stop.title,
    point: stop.point!,
    address: trip.places[stop.placeId]?.address,
    route: route,
    dayNumber: day.number,
    stopId: stop.id,
  );
}

/// Compass navigation that works with no internet: GPS + compass point you at the stop, the saved
/// route shows the road, and you're told when you've wandered off it.
class NavigateScreen extends ConsumerStatefulWidget {
  const NavigateScreen({super.key, required this.tripId, required this.query});
  final String tripId;
  final Map<String, String> query;
  @override
  ConsumerState<NavigateScreen> createState() => _NavigateScreenState();
}

class _NavigateScreenState extends ConsumerState<NavigateScreen> {
  static const offRouteM = 150.0;
  static const arrivedM = 40.0;
  final _map = MapController();
  // Start with you, the stop and the road in view; follow you once you ask (or get close).
  bool _follow = false;
  bool _fitted = false;
  // The arrow's rotation, kept continuous so 359° → 1° is a small nudge, not a full spin.
  double _turns = 0;

  double _arrowTurns(double relativeDeg) {
    final target = relativeDeg / 360;
    final delta = ((target - _turns) % 1 + 1.5) % 1 - 0.5;
    return _turns += delta;
  }
  bool _tilesReady = false;

  @override
  void initState() {
    super.initState();
    WakelockPlus.enable().catchError((_) {});
    ref.read(tilesProvider).init().whenComplete(() {
      if (mounted) setState(() => _tilesReady = true);
    });
  }

  @override
  void dispose() {
    WakelockPlus.disable().catchError((_) {});
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final trip = ref.watch(bundleProvider(widget.tripId)).valueOrNull;
    final target = trip == null ? null : resolveTarget(trip, widget.query);
    final loc = ref.watch(locationProvider);
    final heading = ref.watch(headingProvider).valueOrNull;

    if (trip == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (target == null) {
      return Scaffold(appBar: AppBar(), body: const EmptyState(icon: Icons.wrong_location_outlined, title: 'No location for this stop', text: 'This stop has no map position.'));
    }

    final fix = loc.valueOrNull;
    final distance = fix == null ? null : distanceM(fix.point, target.point);
    final bearing = fix == null ? null : bearingDeg(fix.point, target.point);
    // Facing: the compass; when it's missing, the direction you're moving.
    final facing = heading ?? ((fix?.speed ?? 0) > 1 ? fix!.heading : null);
    final onRoute = fix != null && target.route.length >= 2 ? nearestOnLine(fix.point, target.route) : null;
    final offRoute = onRoute != null && onRoute.distanceM > offRouteM && (distance ?? 0) > 300;
    final roadLeft = onRoute != null && !offRoute ? remainingAlong(target.route, onRoute) + onRoute.distanceM : null;
    final arrived = distance != null && distance <= arrivedM + (fix?.accuracy ?? 0) / 2;
    final walkMin = distance == null ? null : ((roadLeft ?? distance * 1.3) / 75).ceil(); // ~4.5 km/h

    if (fix != null && _tilesReady) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        try {
          if (!_fitted) {
            _fitted = true;
            _map.fitCamera(CameraFit.bounds(
              bounds: LatLngBounds.fromPoints([fix.point, target.point, ...target.route]),
              padding: const EdgeInsets.all(40),
              maxZoom: 17,
            ));
          } else if (_follow) {
            _map.move(fix.point, _map.camera.zoom);
          }
        } catch (_) {}
      });
    }

    return Scaffold(
      appBar: AppBar(title: Text(target.name, overflow: TextOverflow.ellipsis)),
      body: Column(children: [
        // ---- the compass ----
        Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: Column(children: [
            if (loc.hasError)
              _LocationProblem(error: loc.error)
            else if (fix == null)
              const Padding(padding: EdgeInsets.all(32), child: Column(children: [CircularProgressIndicator(), SizedBox(height: 12), Text('Finding you… (works without internet)')]))
            else ...[
              SizedBox(
                height: 170,
                child: Stack(alignment: Alignment.center, children: [
                  Container(
                    width: 170,
                    height: 170,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: arrived ? context.successSoft : context.accentSoft),
                  ),
                  if (arrived)
                    Icon(Icons.flag_rounded, size: 84, color: context.success)
                  else if (facing != null && bearing != null)
                    AnimatedRotation(
                      turns: _arrowTurns((bearing - facing) % 360),
                      duration: const Duration(milliseconds: 250),
                      child: Icon(Icons.navigation_rounded, size: 110, color: offRoute ? context.warn : context.accent),
                    )
                  else
                    Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(bearing == null ? '' : compassPoint(bearing), style: TextStyle(fontSize: 52, fontWeight: FontWeight.w800, color: context.accent)),
                      Text('Head this way', style: TextStyle(color: context.muted)),
                    ]),
                ]),
              ),
              const SizedBox(height: 12),
              Text(
                arrived ? 'You’re here' : formatDistance(roadLeft ?? distance!),
                style: Theme.of(context).textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w800),
              ),
              Text(
                arrived
                    ? target.name
                    : [
                        roadLeft != null ? 'by road' : 'straight line, ${compassPoint(bearing!)}',
                        if (walkMin != null) '~${formatMinutes(walkMin)} on foot',
                        if (fix.accuracy > 50) 'GPS ±${fix.accuracy.round()} m',
                      ].join(' · '),
                style: TextStyle(color: context.muted, fontSize: 15),
                textAlign: TextAlign.center,
              ),
              if (facing == null && !arrived)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text('No compass on this phone — start walking and the arrow follows your direction.', style: TextStyle(color: context.muted, fontSize: 12.5), textAlign: TextAlign.center),
                ),
            ],
            if (offRoute) ...[
              const SizedBox(height: 12),
              Notice(
                text: 'You’re ${formatDistance(onRoute.distanceM)} off the planned road. The arrow points straight at the stop — head back to the blue line if the way is blocked.',
                icon: Icons.alt_route,
                tone: 'warn',
              ),
            ],
          ]),
        ),
        // ---- the map ----
        Expanded(
          child: _tilesReady
              ? Stack(children: [
                  FlutterMap(
                    mapController: _map,
                    options: MapOptions(
                      initialCenter: fix?.point ?? target.point,
                      initialZoom: 16,
                      maxZoom: 18,
                      onPositionChanged: (_, gesture) {
                        if (gesture && _follow) setState(() => _follow = false);
                      },
                    ),
                    children: [
                      ref.read(tilesProvider).layer(),
                      PolylineLayer(polylines: [
                        if (target.route.length >= 2) Polyline(points: target.route, color: const Color(0xFF2563EB), strokeWidth: 6),
                        if (fix != null)
                          Polyline(
                            points: [fix.point, target.point],
                            color: context.accent.withValues(alpha: 0.7),
                            strokeWidth: 2.5,
                            pattern: StrokePattern.dashed(segments: const [8, 8]),
                          ),
                      ]),
                      MarkerLayer(markers: [
                        Marker(point: target.point, width: 40, height: 40, alignment: Alignment.topCenter, child: Icon(Icons.location_on, size: 40, color: context.danger)),
                        if (fix != null)
                          Marker(
                            point: fix.point,
                            width: 30,
                            height: 30,
                            child: Transform.rotate(
                              angle: (facing ?? 0) * math.pi / 180,
                              child: Container(
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2563EB),
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 3),
                                  boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6)],
                                ),
                                child: facing != null ? const Icon(Icons.arrow_drop_up, color: Colors.white, size: 20) : null,
                              ),
                            ),
                          ),
                      ]),
                    ],
                  ),
                  if (!_follow && fix != null)
                    Positioned(
                      right: 12,
                      top: 12,
                      child: FloatingActionButton.small(
                        heroTag: 'follow',
                        tooltip: 'Follow me',
                        onPressed: () {
                          setState(() => _follow = true);
                          _map.move(fix.point, _map.camera.zoom < 15 ? 16 : _map.camera.zoom);
                        },
                        child: const Icon(Icons.my_location),
                      ),
                    ),
                ])
              : const Center(child: CircularProgressIndicator()),
        ),
        // ---- actions ----
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
            child: Row(children: [
              if (arrived && target.stopId != null && target.dayNumber != null)
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () async {
                      await ref.read(tripServiceProvider).setStatus(widget.tripId, target.dayNumber!, target.stopId!, 'done');
                      if (context.mounted) Navigator.pop(context);
                    },
                    icon: const Icon(Icons.check_circle_outline),
                    label: const Text('Mark visited'),
                  ),
                )
              else
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => openDirections(context, target.point, label: target.name),
                    icon: const Icon(Icons.directions_outlined),
                    label: const Text('Google Maps'),
                  ),
                ),
              const SizedBox(width: 8),
              IconButton.outlined(
                tooltip: 'Show to a driver',
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => DriverCard(name: target.name, address: target.address ?? ''))),
                icon: const Icon(Icons.local_taxi_outlined),
              ),
            ]),
          ),
        ),
      ]),
    );
  }
}

class _LocationProblem extends StatelessWidget {
  const _LocationProblem({required this.error});
  final Object? error;
  @override
  Widget build(BuildContext context) {
    final e = error;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(children: [
        Icon(Icons.location_off_outlined, size: 48, color: context.warn),
        const SizedBox(height: 10),
        Text(e is LocationError ? e.message : 'Couldn’t get your location.', textAlign: TextAlign.center),
        if (e is LocationError) ...[
          const SizedBox(height: 10),
          FilledButton(onPressed: () => openLocationSettings(e.issue), child: const Text('Open settings')),
        ],
      ]),
    );
  }
}

/// Big, plain text to show a taxi or auto driver where you're going.
class DriverCard extends StatefulWidget {
  const DriverCard({super.key, required this.name, required this.address});
  final String name, address;
  @override
  State<DriverCard> createState() => _DriverCardState();
}

class _DriverCardState extends State<DriverCard> {
  @override
  void initState() {
    super.initState();
    WakelockPlus.enable().catchError((_) {});
  }

  @override
  void dispose() {
    WakelockPlus.disable().catchError((_) {});
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(backgroundColor: Colors.white, foregroundColor: Colors.black, title: const Text('Show this to your driver')),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Please take me to', style: TextStyle(color: Colors.black54, fontSize: 20)),
              const SizedBox(height: 12),
              Text(widget.name, style: const TextStyle(color: Colors.black, fontSize: 40, fontWeight: FontWeight.w800, height: 1.15)),
              if (widget.address.isNotEmpty) ...[
                const SizedBox(height: 20),
                Text(widget.address, style: const TextStyle(color: Colors.black87, fontSize: 24, height: 1.3)),
              ],
            ]),
          ),
        ),
      );
}
