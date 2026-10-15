import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/geo.dart';
import '../../core/theme.dart';
import '../../data/app_state.dart';
import '../../data/models.dart';
import '../../shared/widgets.dart';
import '../navigate/location.dart';

/// Emergency numbers, where you're staying, and the nearest hospitals, police and pharmacies —
/// all saved with the trip, so it works with no signal.
class SafetyScreen extends ConsumerWidget {
  const SafetyScreen({super.key, required this.tripId});
  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trip = ref.watch(bundleProvider(tripId)).valueOrNull;
    final fix = ref.watch(locationProvider).valueOrNull;
    if (trip == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    List<SafetyPlace> nearest(String kind) {
      final list = trip.safety.where((s) => s.kind == kind).toList();
      if (fix != null) list.sort((a, b) => distanceM(fix.point, a.point).compareTo(distanceM(fix.point, b.point)));
      // Same place listed near two stays: keep one.
      final seen = <String>{};
      return list.where((s) => seen.add(s.name)).take(5).toList();
    }

    final stays = [for (final l in trip.legs) ...l.stays];

    Widget placeTile(SafetyPlace s, IconData icon, Color color) => Card(
          child: ListTile(
            leading: CircleAvatar(backgroundColor: color.withValues(alpha: 0.12), child: Icon(icon, color: color)),
            title: Text(s.name, style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(fix != null ? '${formatDistance(distanceM(fix.point, s.point))} from you' : 'Near ${s.near}'),
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              if (s.phone != null) IconButton(tooltip: 'Call', icon: const Icon(Icons.call_outlined), onPressed: () => callNumber(context, s.phone!)),
              IconButton(
                tooltip: 'Take me there',
                icon: const Icon(Icons.explore_outlined),
                onPressed: () => context.push('/trip/$tripId/navigate?lat=${s.point.latitude}&lng=${s.point.longitude}&name=${Uri.encodeComponent(s.name)}'),
              ),
            ]),
          ),
        );

    return Scaffold(
      appBar: AppBar(title: const Text('Safety & help')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          Text('Saved with the trip — works with no signal. Calls need mobile coverage, not data.', style: TextStyle(color: context.muted)),
          const SectionTitle('Emergency numbers'),
          Card(
            child: Column(children: [
              for (final e in trip.emergency)
                ListTile(
                  leading: Icon(Icons.emergency_outlined, color: context.danger),
                  title: Text(e.label),
                  trailing: FilledButton.tonalIcon(
                    onPressed: () => callNumber(context, e.number),
                    icon: const Icon(Icons.call, size: 18),
                    label: Text(e.number),
                  ),
                ),
            ]),
          ),
          if (stays.isNotEmpty) ...[
            const SectionTitle('Where you’re staying'),
            for (final s in stays)
              Card(
                child: ListTile(
                  leading: Icon(Icons.hotel_outlined, color: context.accent),
                  title: Text(s.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: s.address != null ? Text(s.address!) : null,
                  trailing: s.point == null
                      ? null
                      : IconButton(
                          tooltip: 'Take me back',
                          icon: const Icon(Icons.explore_outlined),
                          onPressed: () => context.push('/trip/$tripId/navigate?lat=${s.point!.latitude}&lng=${s.point!.longitude}&name=${Uri.encodeComponent(s.name)}'),
                        ),
                ),
              ),
          ],
          if (trip.safety.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 16),
              child: Notice(text: 'No hospitals or police were found when this trip was saved. Update the trip while online to try again.', tone: 'warn'),
            ),
          if (nearest('hospital').isNotEmpty) ...[
            const SectionTitle('Hospitals'),
            for (final s in nearest('hospital')) placeTile(s, Icons.local_hospital_outlined, context.danger),
          ],
          if (nearest('police').isNotEmpty) ...[
            const SectionTitle('Police'),
            for (final s in nearest('police')) placeTile(s, Icons.local_police_outlined, const Color(0xFF1D4ED8)),
          ],
          if (nearest('pharmacy').isNotEmpty) ...[
            const SectionTitle('Pharmacies'),
            for (final s in nearest('pharmacy')) placeTile(s, Icons.medication_outlined, context.success),
          ],
        ],
      ),
    );
  }
}
