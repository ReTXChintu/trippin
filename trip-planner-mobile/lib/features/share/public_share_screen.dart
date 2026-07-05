import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:itinerary_planner/features/trips/models/trip_models.dart';
import 'package:itinerary_planner/features/trips/trips_repository.dart';
import 'package:itinerary_planner/shared/widgets/common_widgets.dart';

class PublicShareScreen extends ConsumerStatefulWidget {
  const PublicShareScreen({super.key, required this.slug});

  final String slug;

  @override
  ConsumerState<PublicShareScreen> createState() => _PublicShareScreenState();
}

class _PublicShareScreenState extends ConsumerState<PublicShareScreen> {
  Trip? _trip;
  Itinerary? _itinerary;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await ref.read(tripsRepositoryProvider).getPublicShare(widget.slug);
      if (mounted) {
        setState(() {
          _trip = result.trip;
          _itinerary = result.itinerary;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(appBar: AppBar(title: const Text('Shared trip')), body: const LoadingOverlay());
    }
    if (_error != null || _trip == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Shared trip')),
        body: ErrorView(message: _error ?? 'Trip not found', onRetry: _load),
      );
    }

    final trip = _trip!;
    final days = _itinerary?.days ?? [];

    return Scaffold(
      appBar: AppBar(title: Text(trip.title)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('${trip.destinationCity}, ${trip.destinationCountry}'),
          Text('${trip.startDate.split('T').first} – ${trip.endDate.split('T').first}'),
          if (_itinerary?.summary != null) ...[
            const SizedBox(height: 16),
            Text(_itinerary!.summary!, style: Theme.of(context).textTheme.bodyLarge),
          ],
          if (days.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 24),
              child: EmptyState(message: 'No itinerary published yet'),
            )
          else
            ...days.map(
              (day) => Card(
                margin: const EdgeInsets.only(top: 12),
                child: ExpansionTile(
                  title: Text('Day ${day.dayNumber}'),
                  subtitle: Text('${day.stops.length} stops'),
                  children: day.stops
                      .map(
                        (stop) => ListTile(
                          dense: true,
                          title: Text(stop.name),
                          subtitle: stop.startTime != null ? Text(stop.startTime!) : null,
                        ),
                      )
                      .toList(),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
