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

    Widget placeTile(SafetyPlace s, IconData icon, DsTone tone) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Card(
          child: ListTile(
            contentPadding: const EdgeInsets.fromLTRB(16, 0, 8, 0),
            leading: DsIconTile(icon, tone: tone),
            title: Text(s.name, style: Theme.of(context).textTheme.titleSmall),
            subtitle: Text(fix != null ? '${formatDistance(distanceM(fix.point, s.point))} from you' : 'Near ${s.near}',
                style: const TextStyle(fontFeatures: Ds.tabular)),
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              if (s.phone != null) IconButton(tooltip: 'Call', icon: const Icon(Icons.call_outlined), onPressed: () => callNumber(context, s.phone!)),
              IconButton(
                tooltip: 'Take me there',
                icon: const Icon(Icons.explore_outlined),
                onPressed: () => context.push('/trip/$tripId/navigate?lat=${s.point.latitude}&lng=${s.point.longitude}&name=${Uri.encodeComponent(s.name)}'),
              ),
            ]),
          ),
        ),
        );

    return Scaffold(
      appBar: AppBar(title: const Text('Safety & help')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Notice(text: 'Saved with the trip — works with no signal. Calls need mobile coverage, not data.', icon: Icons.offline_pin_outlined, tone: 'neutral'),
          ),
          const SectionTitle('Emergency numbers'),
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(children: [
              for (final (i, e) in trip.emergency.indexed) ...[
                if (i > 0) const Divider(),
                ListTile(
                  contentPadding: const EdgeInsets.fromLTRB(16, 0, 12, 0),
                  leading: const DsIconTile(Icons.emergency_outlined, tone: DsTone.crit),
                  title: Text(e.label),
                  trailing: FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: context.ds.critSoft,
                      foregroundColor: context.ds.crit,
                      minimumSize: const Size(64, 40),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      textStyle: const TextStyle(fontFamily: Ds.sans, fontSize: 14, fontWeight: FontWeight.w600, fontFeatures: Ds.tabular),
                    ),
                    onPressed: () => callNumber(context, e.number),
                    icon: const Icon(Icons.call, size: 18),
                    label: Text(e.number),
                  ),
                ),
              ],
            ]),
          ),
          if (stays.isNotEmpty) ...[
            const SectionTitle('Where you’re staying'),
            for (final s in stays)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.fromLTRB(16, 0, 8, 0),
                  leading: const DsIconTile(Icons.hotel_outlined),
                  title: Text(s.name, style: Theme.of(context).textTheme.titleSmall),
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
              ),
          ],
          if (trip.safety.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 16),
              child: Notice(text: 'No hospitals or police were found when this trip was saved. Update the trip while online to try again.', tone: 'warn'),
            ),
          if (nearest('hospital').isNotEmpty) ...[
            const SectionTitle('Hospitals'),
            for (final s in nearest('hospital')) placeTile(s, Icons.local_hospital_outlined, DsTone.crit),
          ],
          if (nearest('police').isNotEmpty) ...[
            const SectionTitle('Police'),
            for (final s in nearest('police')) placeTile(s, Icons.local_police_outlined, DsTone.accent),
          ],
          if (nearest('pharmacy').isNotEmpty) ...[
            const SectionTitle('Pharmacies'),
            for (final s in nearest('pharmacy')) placeTile(s, Icons.medication_outlined, DsTone.good),
          ],
        ],
      ),
    );
  }
}
