import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:itinerary_planner/core/api/photo_url.dart';
import 'package:itinerary_planner/features/places/place_filter_utils.dart';
import 'package:itinerary_planner/features/trips/models/trip_models.dart';
import 'package:itinerary_planner/features/trips/trips_repository.dart';
import 'package:itinerary_planner/shared/widgets/common_widgets.dart';

class DiscoveryScreen extends ConsumerStatefulWidget {
  const DiscoveryScreen({super.key, required this.tripId});

  final String tripId;

  @override
  ConsumerState<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends ConsumerState<DiscoveryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Trip? _trip;
  List<Place> _pool = [];
  List<Place> _selected = [];
  PlaceFilterState _filter = PlaceFilterState();
  final _searchQuery = TextEditingController();
  final _manualSearch = TextEditingController();
  final _selectedIds = <String>{};
  String? _selectedLegId;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchQuery.dispose();
    _manualSearch.dispose();
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
      final pool = await repo.getDiscoveryPool(widget.tripId);
      final selected = await repo.getSelectedPlaces(widget.tripId);
      if (mounted) {
        setState(() {
          _trip = trip;
          _pool = pool;
          _selected = selected;
          if (trip.isMultiLeg && trip.legs.isNotEmpty && _selectedLegId == null) {
            _selectedLegId = trip.legs.first.id;
          }
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _discover({bool refresh = false}) async {
    setState(() => _loading = true);
    try {
      final places = await ref.read(tripsRepositoryProvider).discoverPlaces(
            widget.tripId,
            forceRefresh: refresh,
            legId: _trip?.isMultiLeg == true ? _selectedLegId : null,
          );
      if (mounted) setState(() => _pool = places);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Set<String> get _selectedPlaceIds =>
      _selected.map((p) => p.googlePlaceId).whereType<String>().toSet();

  List<Place> _filteredPool() {
    final f = _filter.copyWith(nameQuery: _searchQuery.text.trim());
    return filterPlaces(_pool, filter: f, hotelCoordinates: _trip?.hotelCoordinates);
  }

  List<Place> _filteredSelected() {
    final f = _filter.copyWith(nameQuery: _searchQuery.text.trim());
    return filterPlaces(_selected, filter: f, hotelCoordinates: _trip?.hotelCoordinates);
  }

  Future<void> _togglePlace(Place place) async {
    final id = place.googlePlaceId;
    if (id == null) return;
    try {
      final repo = ref.read(tripsRepositoryProvider);
      if (_selectedPlaceIds.contains(id)) {
        await repo.removePlace(widget.tripId, id);
      } else {
        await repo.addPlace(widget.tripId, id);
      }
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _bulkAdd() async {
    if (_selectedIds.isEmpty) return;
    try {
      await ref.read(tripsRepositoryProvider).bulkAddPlaces(widget.tripId, _selectedIds.toList());
      _selectedIds.clear();
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _bulkRemove() async {
    if (_selectedIds.isEmpty) return;
    try {
      await ref.read(tripsRepositoryProvider).bulkRemovePlaces(widget.tripId, _selectedIds.toList());
      _selectedIds.clear();
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _manualAdd() async {
    final query = _manualSearch.text.trim();
    if (query.isEmpty || _trip == null) return;
    try {
      final results = await ref.read(tripsRepositoryProvider).searchPlaces(
            query,
            city: _trip!.destinationCity,
            country: _trip!.destinationCountry,
          );
      if (!mounted) return;
      if (results.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No results')));
        return;
      }
      final picked = await showModalBottomSheet<PlaceSearchResult>(
        context: context,
        builder: (ctx) => ListView.builder(
          itemCount: results.length,
          itemBuilder: (_, i) {
            final r = results[i];
            return ListTile(
              title: Text(r.name),
              subtitle: Text(r.address ?? ''),
              onTap: () => Navigator.pop(ctx, r),
            );
          },
        ),
      );
      if (picked != null) {
        await ref.read(tripsRepositoryProvider).addPlace(widget.tripId, picked.googlePlaceId);
        _manualSearch.clear();
        await _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _showPlaceDetail(Place place) async {
    Place detail = place;
    if (place.googlePlaceId != null) {
      try {
        detail = await ref.read(tripsRepositoryProvider).getPlaceDetailRich(widget.tripId, place.googlePlaceId!);
      } catch (_) {}
    }
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        builder: (_, scroll) => _PlaceDetailSheet(place: detail, tripId: widget.tripId, scrollController: scroll),
      ),
    );
  }

  Widget _buildFilters() {
    final categories = extractCategories(_pool + _selected);
    return Column(
      children: [
        TextField(
          controller: _searchQuery,
          decoration: const InputDecoration(
            hintText: 'Search by name',
            prefixIcon: Icon(Icons.search),
            isDense: true,
          ),
          onChanged: (_) => setState(() {}),
        ),
        Row(
          children: [
            const Text('Min rating:'),
            Expanded(
              child: Slider(
                value: _filter.minRating,
                min: 0,
                max: 5,
                divisions: 10,
                label: _filter.minRating.toStringAsFixed(1),
                onChanged: (v) => setState(() => _filter = _filter.copyWith(minRating: v)),
              ),
            ),
          ],
        ),
        DropdownButton<PlaceSort>(
          value: _filter.sort,
          isExpanded: true,
          items: const [
            DropdownMenuItem(value: PlaceSort.rating, child: Text('Sort by rating')),
            DropdownMenuItem(value: PlaceSort.name, child: Text('Sort by name')),
            DropdownMenuItem(value: PlaceSort.distance, child: Text('Sort by distance')),
          ],
          onChanged: (v) => setState(() => _filter = _filter.copyWith(sort: v)),
        ),
        if (categories.isNotEmpty)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: categories.map((c) {
                final selected = _filter.categories.contains(c);
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: FilterChip(
                    label: Text(c),
                    selected: selected,
                    onSelected: (v) => setState(() {
                      final cats = Set<String>.from(_filter.categories);
                      if (v) {
                        cats.add(c);
                      } else {
                        cats.remove(c);
                      }
                      _filter = _filter.copyWith(categories: cats);
                    }),
                  ),
                );
              }).toList(),
            ),
          ),
        if (_trip?.isMultiLeg == true)
          DropdownButtonFormField<String>(
            value: _selectedLegId,
            decoration: const InputDecoration(labelText: 'Leg'),
            items: _trip!.legs
                .map((l) => DropdownMenuItem(value: l.id, child: Text('${l.name} (${l.baseCity})')))
                .toList(),
            onChanged: (v) => setState(() => _selectedLegId = v),
          ),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _manualSearch,
                decoration: const InputDecoration(hintText: 'Manual search', isDense: true),
              ),
            ),
            IconButton(onPressed: _manualAdd, icon: const Icon(Icons.add_location_alt)),
          ],
        ),
        if (_selectedIds.isNotEmpty)
          Row(
            children: [
              Text('${_selectedIds.length} selected'),
              const Spacer(),
              TextButton(onPressed: _bulkAdd, child: const Text('Add all')),
              TextButton(onPressed: _bulkRemove, child: const Text('Remove all')),
            ],
          ),
      ],
    );
  }

  Widget _buildPlaceList(List<Place> places, {required bool isPool}) {
    if (places.isEmpty) {
      return EmptyState(message: isPool ? 'No places in pool' : 'No selected places');
    }
    return ListView.builder(
      itemCount: places.length,
      itemBuilder: (_, i) {
        final place = places[i];
        final id = place.googlePlaceId;
        final isSelected = id != null && _selectedPlaceIds.contains(id);
        final bulkSelected = id != null && _selectedIds.contains(id);
        return ListTile(
          leading: bulkSelected
              ? const Icon(Icons.check_circle, color: Colors.teal)
              : CircleAvatar(child: Text(place.name.isNotEmpty ? place.name[0] : '?')),
          title: Text(place.name),
          subtitle: Text([place.category, place.formattedAddress ?? place.city].whereType<String>().join(' · ')),
          onTap: () => _showPlaceDetail(place),
          onLongPress: id != null
              ? () => setState(() {
                    if (_selectedIds.contains(id)) {
                      _selectedIds.remove(id);
                    } else {
                      _selectedIds.add(id);
                    }
                  })
              : null,
          selected: bulkSelected,
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (place.rating != null) Text('★ ${place.rating!.toStringAsFixed(1)}'),
              IconButton(
                icon: Icon(isSelected ? Icons.remove_circle_outline : Icons.add_circle_outline),
                onPressed: () => _togglePlace(place),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Discover places'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'Pool (${_pool.length})'),
            Tab(text: 'Selected (${_selected.length})'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : () => _discover(refresh: _pool.isNotEmpty),
          ),
        ],
      ),
      body: _loading && _pool.isEmpty && _selected.isEmpty
          ? const LoadingOverlay(message: 'Loading places…')
          : _error != null
              ? ErrorView(message: _error!, onRetry: _load)
              : Column(
                  children: [
                    Padding(padding: const EdgeInsets.all(12), child: _buildFilters()),
                    if (_pool.isEmpty && _tabController.index == 0)
                      Expanded(
                        child: Center(
                          child: FilledButton(onPressed: () => _discover(), child: const Text('Discover places')),
                        ),
                      )
                    else
                      Expanded(
                        child: TabBarView(
                          controller: _tabController,
                          children: [
                            _buildPlaceList(_filteredPool(), isPool: true),
                            _buildPlaceList(_filteredSelected(), isPool: false),
                          ],
                        ),
                      ),
                  ],
                ),
    );
  }
}

class _PlaceDetailSheet extends StatelessWidget {
  const _PlaceDetailSheet({
    required this.place,
    required this.tripId,
    required this.scrollController,
  });

  final Place place;
  final String tripId;
  final ScrollController scrollController;

  @override
  Widget build(BuildContext context) {
    final photos = place.photoNames ?? place.photoUrls ?? [];
    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.all(16),
      children: [
        Text(place.name, style: Theme.of(context).textTheme.headlineSmall),
        if (place.rating != null)
          Text('★ ${place.rating} (${place.userRatingCount ?? 0} reviews)'),
        if (place.formattedAddress != null) Text(place.formattedAddress!),
        if (photos.isNotEmpty) ...[
          const SizedBox(height: 12),
          SizedBox(
            height: 160,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: photos.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final name = photos[i];
                final url = name.startsWith('http') ? name : placePhotoUrl(name, tripId: tripId);
                return ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: CachedNetworkImage(imageUrl: url, width: 200, height: 160, fit: BoxFit.cover),
                );
              },
            ),
          ),
        ],
        if (place.description != null) ...[
          const SizedBox(height: 12),
          Text(place.description!),
        ],
        if (place.openingTime != null || place.closingTime != null)
          ListTile(
            leading: const Icon(Icons.schedule),
            title: Text('${place.openingTime ?? '?'} – ${place.closingTime ?? '?'}'),
          ),
        if (place.weekdayDescriptions != null)
          ...place.weekdayDescriptions!.map((d) => Text(d, style: Theme.of(context).textTheme.bodySmall)),
      ],
    );
  }
}
