import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:itinerary_planner/features/itinerary/export_service.dart';
import 'package:itinerary_planner/features/trips/models/trip_models.dart';
import 'package:itinerary_planner/features/trips/trips_repository.dart';
import 'package:itinerary_planner/shared/widgets/common_widgets.dart';
import 'package:latlong2/latlong.dart';

class ItineraryScreen extends ConsumerStatefulWidget {
  const ItineraryScreen({super.key, required this.tripId});

  final String tripId;

  @override
  ConsumerState<ItineraryScreen> createState() => _ItineraryScreenState();
}

class _ItineraryScreenState extends ConsumerState<ItineraryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Trip? _trip;
  Itinerary? _itinerary;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = ref.read(tripsRepositoryProvider);
      final trip = await repo.getTrip(widget.tripId);
      final itinerary = await repo.getItinerary(widget.tripId);
      if (mounted) {
        setState(() {
          _trip = trip;
          _itinerary = itinerary;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _action(Future<Itinerary> Function() fn, String label) async {
    setState(() => _loading = true);
    try {
      final itinerary = await fn();
      if (mounted) {
        setState(() => _itinerary = itinerary);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$label complete')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _reorder(ItineraryDay day, int oldIndex, int newIndex) async {
    final stops = List<ItineraryStop>.from(day.stops);
    final item = stops.removeAt(oldIndex);
    stops.insert(newIndex, item);
    setState(() {
      _itinerary = Itinerary(
        days: _itinerary!.days.map((d) {
          if (d.dayNumber == day.dayNumber) {
            return ItineraryDay(dayNumber: d.dayNumber, stops: stops, date: d.date);
          }
          return d;
        }).toList(),
        summary: _itinerary!.summary,
      );
    });
    try {
      await ref.read(tripsRepositoryProvider).reorderStops(
            widget.tripId,
            day.dayNumber,
            stops.map((s) => s.id).toList(),
          );
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      await _load();
    }
  }

  List<LatLng> _mapPoints(List<ItineraryStop> stops) {
    return stops
        .where((s) => s.coordinates != null)
        .map((s) => LatLng(s.coordinates!['lat']!, s.coordinates!['lng']!))
        .toList();
  }

  List<ItineraryStop> _foodStops() {
    return (_itinerary?.days ?? []).expand((d) => d.stops.where((s) => s.isFood || s.isMarket)).toList();
  }

  List<ItineraryStop> _guideStops() {
    return (_itinerary?.days ?? []).expand((d) => d.stops).where((s) => s.visitIntel?.summary != null).toList();
  }

  @override
  Widget build(BuildContext context) {
    final repo = ref.read(tripsRepositoryProvider);
    final days = _itinerary?.days ?? [];
    final hasStops = days.any((d) => d.stops.isNotEmpty);
    final allPoints = _mapPoints(days.expand((d) => d.stops).toList());

    return Scaffold(
      appBar: AppBar(
        title: const Text('Itinerary'),
        bottom: hasStops
            ? TabBar(
                controller: _tabController,
                tabs: const [
                  Tab(text: 'Schedule'),
                  Tab(text: 'Eat & Shop'),
                  Tab(text: 'Guide'),
                ],
              )
            : null,
        actions: [
          if (hasStops && _trip != null)
            IconButton(
              icon: const Icon(Icons.ios_share),
              onPressed: () => ItineraryExportService.share(_trip!, _itinerary!),
            ),
        ],
      ),
      body: _loading && !hasStops
          ? const LoadingOverlay()
          : _error != null && !hasStops
              ? ErrorView(message: _error!, onRetry: _load)
              : Column(
                  children: [
                    if (_loading) const LinearProgressIndicator(),
                    Padding(
                      padding: const EdgeInsets.all(8),
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          FilledButton(
                            onPressed: _loading ? null : () => _action(() => repo.generateItinerary(widget.tripId), 'Generate'),
                            child: const Text('Generate'),
                          ),
                          OutlinedButton(
                            onPressed: !hasStops || _loading
                                ? null
                                : () => _action(() => repo.summarizeItinerary(widget.tripId), 'Summarize'),
                            child: const Text('Summarize'),
                          ),
                          OutlinedButton(
                            onPressed: !hasStops || _loading
                                ? null
                                : () => _action(() => repo.optimizeItinerary(widget.tripId), 'Optimize'),
                            child: const Text('Optimize'),
                          ),
                          OutlinedButton(
                            onPressed: !hasStops || _loading
                                ? null
                                : () => _action(() => repo.enrichItinerary(widget.tripId), 'Enrich'),
                            child: const Text('Enrich'),
                          ),
                          if (hasStops && _trip != null)
                            OutlinedButton.icon(
                              onPressed: () => ItineraryExportService.share(_trip!, _itinerary!),
                              icon: const Icon(Icons.share, size: 18),
                              label: const Text('Export'),
                            ),
                        ],
                      ),
                    ),
                    if (_itinerary?.summary != null)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Text(_itinerary!.summary!),
                      ),
                    if (!hasStops)
                      const Expanded(child: EmptyState(message: 'Select places and generate an itinerary.'))
                    else
                      Expanded(
                        child: TabBarView(
                          controller: _tabController,
                          children: [
                            _ScheduleTab(
                              days: days,
                              mapPoints: allPoints,
                              onReorder: _reorder,
                            ),
                            _StopListTab(stops: _foodStops(), emptyMessage: 'No food or shopping stops'),
                            _GuideTab(stops: _guideStops()),
                          ],
                        ),
                      ),
                  ],
                ),
    );
  }
}

class _ScheduleTab extends StatelessWidget {
  const _ScheduleTab({
    required this.days,
    required this.mapPoints,
    required this.onReorder,
  });

  final List<ItineraryDay> days;
  final List<LatLng> mapPoints;
  final void Function(ItineraryDay day, int oldIndex, int newIndex) onReorder;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (mapPoints.length >= 2)
          SizedBox(
            height: 220,
            child: FlutterMap(
              options: MapOptions(initialCenter: mapPoints.first, initialZoom: 12),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.itineraryplanner.app',
                ),
                PolylineLayer(
                  polylines: [
                    Polyline(points: mapPoints, strokeWidth: 3, color: Colors.teal),
                  ],
                ),
                MarkerLayer(
                  markers: [
                    for (var i = 0; i < mapPoints.length; i++)
                      Marker(
                        point: mapPoints[i],
                        width: 28,
                        height: 28,
                        child: CircleAvatar(
                          radius: 12,
                          child: Text('${i + 1}', style: const TextStyle(fontSize: 10)),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        const SizedBox(height: 16),
        ...days.where((d) => d.stops.isNotEmpty).map(
              (day) => Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ExpansionTile(
                  initiallyExpanded: true,
                  title: Text('Day ${day.dayNumber}${day.date != null ? ' · ${day.date!.split('T').first}' : ''}'),
                  subtitle: Text('${day.stops.length} stops'),
                  children: [
                    ReorderableListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: day.stops.length,
                      onReorderItem: (o, n) => onReorder(day, o, n),
                      itemBuilder: (_, i) {
                        final stop = day.stops[i];
                        return _StopTile(key: ValueKey(stop.id), stop: stop, index: i);
                      },
                    ),
                  ],
                ),
              ),
            ),
      ],
    );
  }
}

class _StopTile extends StatelessWidget {
  const _StopTile({super.key, required this.stop, required this.index});

  final ItineraryStop stop;
  final int index;

  @override
  Widget build(BuildContext context) {
    return ExpansionTile(
      key: key,
      leading: ReorderableDragStartListener(
        index: index,
        child: const Icon(Icons.drag_handle),
      ),
      title: Text(stop.name),
      subtitle: Text([
        if (stop.startTime != null) stop.startTime,
        if (stop.travelMinutesFromPrevious != null) '${stop.travelMinutesFromPrevious} min travel',
      ].whereType<String>().join(' · ')),
      children: [
        if (stop.aiNotes != null) Padding(padding: const EdgeInsets.all(12), child: Text(stop.aiNotes!)),
        if (stop.visitIntel != null) ...[
          if (stop.visitIntel!.summary != null)
            ListTile(dense: true, title: Text(stop.visitIntel!.summary!)),
          if (stop.visitIntel!.bestTimeToVisit != null)
            ListTile(
              dense: true,
              leading: const Icon(Icons.schedule, size: 18),
              title: Text('Best time: ${stop.visitIntel!.bestTimeToVisit}'),
            ),
          if (stop.visitIntel!.hypeLevel != null)
            ListTile(
              dense: true,
              leading: const Icon(Icons.trending_up, size: 18),
              title: Text('Hype: ${stop.visitIntel!.hypeLevel}'),
            ),
        ],
      ],
    );
  }
}

class _StopListTab extends StatelessWidget {
  const _StopListTab({required this.stops, required this.emptyMessage});
  final List<ItineraryStop> stops;
  final String emptyMessage;

  @override
  Widget build(BuildContext context) {
    if (stops.isEmpty) return EmptyState(message: emptyMessage);
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: stops.length,
      itemBuilder: (_, i) {
        final stop = stops[i];
        return Card(
          child: ListTile(
            title: Text(stop.name),
            subtitle: Text([stop.startTime, stop.category].whereType<String>().join(' · ')),
          ),
        );
      },
    );
  }
}

class _GuideTab extends StatelessWidget {
  const _GuideTab({required this.stops});
  final List<ItineraryStop> stops;

  @override
  Widget build(BuildContext context) {
    if (stops.isEmpty) {
      return const EmptyState(message: 'Enrich itinerary to get visit intel and tips.');
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: stops.length,
      itemBuilder: (_, i) {
        final stop = stops[i];
        final intel = stop.visitIntel!;
        return Card(
          child: ExpansionTile(
            title: Text(stop.name),
            subtitle: intel.hypeLevel != null ? Text('Hype: ${intel.hypeLevel}') : null,
            children: [
              if (intel.summary != null) ListTile(title: Text(intel.summary!)),
              if (intel.bestTimeToVisit != null)
                ListTile(
                  leading: const Icon(Icons.schedule),
                  title: Text('Best time: ${intel.bestTimeToVisit}'),
                ),
              if (stop.aiNotes != null) ListTile(title: Text(stop.aiNotes!)),
            ],
          ),
        );
      },
    );
  }
}
