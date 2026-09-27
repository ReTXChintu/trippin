import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:itinerary_planner/features/trips/models/trip_models.dart';
import 'package:itinerary_planner/features/trips/trips_repository.dart';
import 'package:itinerary_planner/shared/widgets/common_widgets.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  List<Trip>? _trips;
  String? _error;
  bool _loading = true;

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
      final trips = await ref.read(tripsRepositoryProvider).listTrips();
      if (mounted) setState(() => _trips = trips);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Trip> _upcoming(List<Trip> trips) {
    final now = DateTime.now();
    return trips.where((t) {
      if (t.status == 'archived' || t.status == 'completed') return false;
      final end = DateTime.tryParse(t.endDate.split('T').first);
      return end == null || !end.isBefore(now);
    }).toList()
      ..sort((a, b) => a.startDate.compareTo(b.startDate));
  }

  List<Trip> _recent(List<Trip> trips) {
    return trips.where((t) => t.status == 'completed' || t.status == 'archived').toList()
      ..sort((a, b) => b.endDate.compareTo(a.endDate));
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _trips == null) {
      return Scaffold(appBar: AppBar(title: const Text('Dashboard')), body: const LoadingOverlay());
    }
    if (_error != null && _trips == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Dashboard')),
        body: ErrorView(message: _error!, onRetry: _load),
      );
    }

    final trips = _trips ?? [];
    final stats = TripStats.fromTrips(trips);
    final upcoming = _upcoming(trips).take(5).toList();
    final recent = _recent(trips).take(5).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _StatsRow(stats: stats),
            const SizedBox(height: 16),
            TripGeneratorCard(onCreated: (id) => context.push('/trips/$id')),
            const SizedBox(height: 24),
            _TripSection(
              title: 'Upcoming trips',
              trips: upcoming,
              emptyMessage: 'No upcoming trips',
              onTap: (id) => context.push('/trips/$id'),
            ),
            const SizedBox(height: 16),
            _TripSection(
              title: 'Recent trips',
              trips: recent,
              emptyMessage: 'No recent trips',
              onTap: (id) => context.push('/trips/$id'),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.stats});
  final TripStats stats;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _StatCard(label: 'Total', value: stats.totalTrips)),
        const SizedBox(width: 8),
        Expanded(child: _StatCard(label: 'Upcoming', value: stats.upcomingTrips)),
        const SizedBox(width: 8),
        Expanded(child: _StatCard(label: 'Done', value: stats.completedTrips)),
        const SizedBox(width: 8),
        Expanded(child: _StatCard(label: 'Archived', value: stats.archivedTrips)),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});
  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        child: Column(
          children: [
            Text('$value', style: Theme.of(context).textTheme.headlineSmall),
            Text(label, style: Theme.of(context).textTheme.labelSmall, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class TripGeneratorCard extends ConsumerStatefulWidget {
  const TripGeneratorCard({super.key, required this.onCreated});
  final ValueChanged<String> onCreated;

  @override
  ConsumerState<TripGeneratorCard> createState() => _TripGeneratorCardState();
}

class _TripGeneratorCardState extends ConsumerState<TripGeneratorCard> {
  final _prompt = TextEditingController();
  bool _generating = false;

  @override
  void dispose() {
    _prompt.dispose();
    super.dispose();
  }

  Future<void> _generate() async {
    final text = _prompt.text.trim();
    if (text.isEmpty) return;
    setState(() => _generating = true);
    try {
      final result = await ref.read(tripsRepositoryProvider).generateFromPrompt(text);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Trip created (${(result.confidence * 100).round()}% confidence)')),
        );
        widget.onCreated(result.trip.id);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('AI Trip Generator', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            TextField(
              controller: _prompt,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Describe your dream trip…',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _generating ? null : _generate,
              icon: _generating
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.auto_awesome),
              label: const Text('Generate trip'),
            ),
          ],
        ),
      ),
    );
  }
}

class _TripSection extends StatelessWidget {
  const _TripSection({
    required this.title,
    required this.trips,
    required this.emptyMessage,
    required this.onTap,
  });

  final String title;
  final List<Trip> trips;
  final String emptyMessage;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (trips.isEmpty)
          EmptyState(message: emptyMessage)
        else
          ...trips.map(
            (t) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(t.title),
                subtitle: Text('${t.destinationCity} · ${t.startDate.split('T').first}'),
                trailing: Chip(label: Text(t.status)),
                onTap: () => onTap(t.id),
              ),
            ),
          ),
      ],
    );
  }
}
