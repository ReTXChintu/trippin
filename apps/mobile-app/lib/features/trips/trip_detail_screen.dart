import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:itinerary_planner/features/auth/auth_provider.dart';
import 'package:itinerary_planner/features/trips/models/trip_models.dart';
import 'package:itinerary_planner/features/trips/trips_repository.dart';
import 'package:itinerary_planner/shared/widgets/common_widgets.dart';
import 'package:url_launcher/url_launcher.dart';

class TripDetailScreen extends ConsumerStatefulWidget {
  const TripDetailScreen({super.key, required this.tripId});

  final String tripId;

  @override
  ConsumerState<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends ConsumerState<TripDetailScreen> {
  Trip? _trip;
  List<TripMember> _members = [];
  String? _error;
  bool _loading = true;
  final _memberEmail = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _memberEmail.dispose();
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
      final members = await repo.getMembers(widget.tripId);
      if (mounted) {
        setState(() {
          _trip = trip;
          _members = members;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _delete() async {
    final ok = await showConfirmDialog(
      context,
      title: 'Delete trip',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    );
    if (ok != true) return;
    try {
      await ref.read(tripsRepositoryProvider).deleteTrip(widget.tripId);
      if (mounted) context.go('/trips');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _duplicate() async {
    try {
      final trip = await ref.read(tripsRepositoryProvider).duplicateTrip(widget.tripId);
      if (mounted) context.push('/trips/${trip.id}');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _archive() async {
    try {
      await ref.read(tripsRepositoryProvider).archiveTrip(widget.tripId);
      await _load();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Trip archived')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _share() async {
    try {
      final url = await ref.read(tripsRepositoryProvider).shareTrip(widget.tripId);
      await Clipboard.setData(ClipboardData(text: url));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Share link copied')));
      }
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _unshare() async {
    try {
      await ref.read(tripsRepositoryProvider).unshareTrip(widget.tripId);
      await _load();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sharing disabled')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _addMember() async {
    final email = _memberEmail.text.trim();
    if (email.isEmpty) return;
    try {
      final members = await ref.read(tripsRepositoryProvider).addMember(widget.tripId, email);
      _memberEmail.clear();
      setState(() => _members = members);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _removeMember(TripMember member) async {
    final ok = await showConfirmDialog(context, title: 'Remove member', message: 'Remove ${member.name}?');
    if (ok != true) return;
    try {
      final members = await ref.read(tripsRepositoryProvider).removeMember(widget.tripId, member.id);
      setState(() => _members = members);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _leaveTrip() async {
    final ok = await showConfirmDialog(context, title: 'Leave trip', message: 'You will lose access to this trip.');
    if (ok != true) return;
    try {
      await ref.read(tripsRepositoryProvider).leaveTrip(widget.tripId);
      if (mounted) context.go('/trips');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _openUrl(String? url) async {
    if (url == null) return;
    final uri = Uri.tryParse(url);
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _trip == null) {
      return Scaffold(appBar: AppBar(), body: const LoadingOverlay());
    }
    if (_error != null || _trip == null) {
      return Scaffold(appBar: AppBar(), body: ErrorView(message: _error ?? 'Not found', onRetry: _load));
    }

    final trip = _trip!;
    final keys = trip.ownerApiKeys;
    final missingKeys = keys != null && (!keys.hasGoogleMapsKey || !keys.hasOpenaiKey);
    final currentUserId = ref.watch(authProvider).user?.id;
    final isOwner = currentUserId == trip.userId;
    final rentals = [
      ...trip.vehicleRentalSuggestions,
      for (final leg in trip.legs) ...leg.vehicleRentalSuggestions,
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(trip.title),
        actions: [
          IconButton(icon: const Icon(Icons.edit), onPressed: () => context.push('/trips/${trip.id}/edit')),
          PopupMenuButton<String>(
            onSelected: (action) async {
              switch (action) {
                case 'duplicate':
                  await _duplicate();
                case 'archive':
                  await _archive();
                case 'delete':
                  await _delete();
                case 'leave':
                  await _leaveTrip();
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'duplicate', child: Text('Duplicate')),
              if (trip.status != 'archived')
                const PopupMenuItem(value: 'archive', child: Text('Archive')),
              if (isOwner)
                const PopupMenuItem(value: 'delete', child: Text('Delete')),
              if (!isOwner) const PopupMenuItem(value: 'leave', child: Text('Leave trip')),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (missingKeys)
              Card(
                color: Colors.amber.shade50,
                child: const ListTile(
                  leading: Icon(Icons.warning_amber),
                  title: Text('API keys missing'),
                  subtitle: Text('Trip owner must configure API keys in Profile for discovery and AI.'),
                ),
              ),
            Text('${trip.destinationCity}${trip.destinationState != null ? ', ${trip.destinationState}' : ''}, ${trip.destinationCountry}'),
            Text('${trip.startDate.split('T').first} – ${trip.endDate.split('T').first}'),
            Chip(label: Text(trip.status)),
            if (trip.interests.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                children: trip.interests.map((i) => Chip(label: Text(i), visualDensity: VisualDensity.compact)).toList(),
              ),
            ],
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.icon(
                  onPressed: () => context.push('/trips/${trip.id}/discover'),
                  icon: const Icon(Icons.explore),
                  label: const Text('Discover'),
                ),
                FilledButton.tonalIcon(
                  onPressed: () => context.push('/trips/${trip.id}/itinerary'),
                  icon: const Icon(Icons.route),
                  label: const Text('Itinerary'),
                ),
                if (trip.publicSlug != null)
                  OutlinedButton.icon(
                    onPressed: _unshare,
                    icon: const Icon(Icons.link_off),
                    label: const Text('Unshare'),
                  )
                else
                  OutlinedButton.icon(
                    onPressed: _share,
                    icon: const Icon(Icons.share),
                    label: const Text('Share'),
                  ),
              ],
            ),
            if (trip.isMultiLeg) ...[
              const SizedBox(height: 24),
              Text('Trip legs', style: Theme.of(context).textTheme.titleMedium),
              ...trip.legs.map(
                (leg) => Card(
                  child: ListTile(
                    leading: CircleAvatar(child: Text('${leg.order + 1}')),
                    title: Text(leg.name),
                    subtitle: Text(
                      '${leg.baseCity} · ${leg.startDate.split('T').first} – ${leg.endDate.split('T').first}'
                      '${leg.dayTripAreas.isNotEmpty ? '\nDay trips: ${leg.dayTripAreas.join(', ')}' : ''}',
                    ),
                    isThreeLine: true,
                  ),
                ),
              ),
            ],
            if (rentals.isNotEmpty) ...[
              const SizedBox(height: 24),
              Text('Vehicle rentals', style: Theme.of(context).textTheme.titleMedium),
              ...rentals.map(
                (r) => ListTile(
                  leading: const Icon(Icons.directions_car),
                  title: Text(r.name),
                  subtitle: Text([r.address, r.rating != null ? '★ ${r.rating}' : null].whereType<String>().join(' · ')),
                  trailing: r.googleMapsUrl != null ? const Icon(Icons.open_in_new) : null,
                  onTap: () => _openUrl(r.googleMapsUrl),
                ),
              ),
            ],
            const SizedBox(height: 24),
            Text('Members', style: Theme.of(context).textTheme.titleMedium),
            ..._members.map(
              (m) => ListTile(
                dense: true,
                title: Text(m.name),
                subtitle: Text(m.email),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(m.role),
                    if (isOwner && m.id != currentUserId)
                      IconButton(
                        icon: const Icon(Icons.person_remove_outlined, size: 20),
                        onPressed: () => _removeMember(m),
                      ),
                  ],
                ),
              ),
            ),
            if (isOwner)
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _memberEmail,
                      decoration: const InputDecoration(labelText: 'Invite by email', isDense: true),
                      keyboardType: TextInputType.emailAddress,
                    ),
                  ),
                  IconButton(onPressed: _addMember, icon: const Icon(Icons.person_add)),
                ],
              ),
            if (trip.destinationBrief != null) ...[
              const SizedBox(height: 24),
              Text('Destination guide', style: Theme.of(context).textTheme.titleMedium),
              if (trip.destinationBrief!.specialties.isNotEmpty)
                _BriefSection('Specialties', trip.destinationBrief!.specialties),
              if (trip.destinationBrief!.localFood.isNotEmpty)
                _BriefSection('Local food', trip.destinationBrief!.localFood),
              if (trip.destinationBrief!.generalTips.isNotEmpty)
                _BriefSection('Tips', trip.destinationBrief!.generalTips),
            ],
          ],
        ),
      ),
    );
  }
}

class _BriefSection extends StatelessWidget {
  const _BriefSection(this.title, this.items);
  final String title;
  final List<String> items;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleSmall),
          ...items.map((i) => Text('• $i')),
        ],
      ),
    );
  }
}
