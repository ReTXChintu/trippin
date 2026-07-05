import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:itinerary_planner/core/constants/app_constants.dart';
import 'package:itinerary_planner/features/trips/models/trip_models.dart';
import 'package:itinerary_planner/features/trips/trips_repository.dart';
import 'package:itinerary_planner/shared/widgets/common_widgets.dart';

class TripListScreen extends ConsumerStatefulWidget {
  const TripListScreen({super.key});

  @override
  ConsumerState<TripListScreen> createState() => _TripListScreenState();
}

class _TripListScreenState extends ConsumerState<TripListScreen> {
  List<Trip>? _trips;
  String? _error;
  bool _loading = true;
  String? _statusFilter;

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
      final trips = await ref.read(tripsRepositoryProvider).listTrips(status: _statusFilter);
      if (mounted) setState(() => _trips = trips);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _setFilter(String? status) {
    setState(() => _statusFilter = status);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Trips')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/trips/new'),
        child: const Icon(Icons.add),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                FilterChip(
                  label: const Text('All'),
                  selected: _statusFilter == null,
                  onSelected: (_) => _setFilter(null),
                ),
                const SizedBox(width: 8),
                ...AppConstants.tripStatuses.map(
                  (s) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(s),
                      selected: _statusFilter == s,
                      onSelected: (_) => _setFilter(s),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _loading && _trips == null
                ? const LoadingOverlay()
                : _error != null && _trips == null
                    ? ErrorView(message: _error!, onRetry: _load)
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: (_trips?.isEmpty ?? true)
                            ? ListView(
                                children: [
                                  SizedBox(
                                    height: MediaQuery.of(context).size.height * 0.4,
                                    child: EmptyState(
                                      message: 'No trips yet',
                                      action: () => context.push('/trips/new'),
                                      actionLabel: 'Create trip',
                                    ),
                                  ),
                                ],
                              )
                            : ListView.separated(
                                padding: const EdgeInsets.all(16),
                                itemCount: _trips!.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 8),
                                itemBuilder: (context, index) {
                                  final trip = _trips![index];
                                  return Card(
                                    child: ListTile(
                                      title: Text(trip.title),
                                      subtitle: Text(
                                        '${trip.destinationCity}, ${trip.destinationCountry}\n'
                                        '${trip.startDate.split('T').first} – ${trip.endDate.split('T').first}',
                                      ),
                                      isThreeLine: true,
                                      trailing: Chip(label: Text(trip.status)),
                                      onTap: () => context.push('/trips/${trip.id}'),
                                    ),
                                  );
                                },
                              ),
                      ),
          ),
        ],
      ),
    );
  }
}
