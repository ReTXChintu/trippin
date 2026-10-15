import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/app_state.dart';
import '../../data/models.dart';
import '../../shared/widgets.dart';

/// The place's hours that day: the planner's value, else Google's weekly line for that weekday.
String? hoursOn(Stop stop, Place? place, String date) {
  if (stop.hoursToday != null) return stop.hoursToday == 'Closed' ? 'Closed this day' : stop.hoursToday;
  final d = DateTime.tryParse(date);
  if (d == null || place == null) return null;
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  final day = names[d.weekday - 1];
  for (final line in place.weekdayHours) {
    if (line.startsWith(day)) return line.substring(day.length + 1).trim();
  }
  return null;
}

/// The AI's fee estimate, Google's, or a careful guess for places that are free by custom.
String entryFeeFor(Stop stop, Place? place) {
  if (stop.intel?.entryFee != null) return stop.intel!.entryFee!;
  final t = '${stop.category ?? ''} ${place?.category ?? ''} ${stop.name}'.toLowerCase();
  if (RegExp(r'temple|mandir|church|mosque|masjid|gurudwara|dargah|worship').hasMatch(t)) return 'Usually free (special darshan may be paid)';
  if (place?.entryFee != null) return place!.entryFee!;
  if (RegExp(r'ghat|sangam|river|market|bazaar|bazar|street|dukan|chowk|square').hasMatch(t)) return 'Free';
  return 'Not listed — check at the gate';
}

Future<void> showStopSheet(BuildContext context, WidgetRef ref, {required TripBundle trip, required Day day, required Stop stop}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => _StopSheet(trip: trip, day: day, stop: stop),
  );
}

class _StopSheet extends ConsumerWidget {
  const _StopSheet({required this.trip, required this.day, required this.stop});
  final TripBundle trip;
  final Day day;
  final Stop stop;

  Future<void> _set(BuildContext context, WidgetRef ref, String? status) async {
    try {
      await ref.read(tripServiceProvider).setStatus(trip.id, day.number, stop.id, status);
      if (context.mounted) Navigator.pop(context);
    } catch (e) {
      if (context.mounted) toast(context, e.toString());
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final place = trip.places[stop.placeId];
    final hours = hoursOn(stop, place, day.date);
    final intel = stop.intel;
    final address = place?.address;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.62,
      minChildSize: 0.35,
      maxChildSize: 0.95,
      builder: (context, scroll) => ListView(
        controller: scroll,
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
        children: [
          Text(stop.title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(
            [
              if (!stop.isMealSlot) '${stop.arrival} – ${stop.departure}',
              if (stop.visitMinutes > 0 && stop.kind == StopKind.visit) '${stop.visitMinutes} min here',
              if (stop.category != null && stop.kind == StopKind.visit) stop.category!,
            ].join(' · '),
            style: TextStyle(color: context.muted, fontSize: 15),
          ),
          if (place?.rating != null) ...[
            const SizedBox(height: 6),
            Text('★ ${place!.rating!.toStringAsFixed(1)}${place.ratingCount != null ? '  (${place.ratingCount} reviews)' : ''}',
                style: TextStyle(color: context.warn, fontWeight: FontWeight.w600)),
          ],
          const SizedBox(height: 12),
          if (stop.kind == StopKind.visit || (stop.kind == StopKind.meal && !stop.isMealSlot)) ...[
            InfoRow(icon: Icons.schedule, label: 'Open', value: hours ?? 'Hours not listed', valueColor: hours == 'Closed this day' ? context.danger : null),
            if (stop.kind == StopKind.visit) InfoRow(icon: Icons.confirmation_number_outlined, label: 'Entry', value: entryFeeFor(stop, place)),
            if (stop.kind == StopKind.meal && place?.priceLevel != null) InfoRow(icon: Icons.payments_outlined, label: 'Price', value: place!.priceLevel!),
          ],
          if (address != null) InfoRow(icon: Icons.place_outlined, label: 'Address', value: address),
          if (intel?.bestTime != null) InfoRow(icon: Icons.wb_sunny_outlined, label: 'Best', value: intel!.bestTime!),
          if (intel?.avoidTime != null) InfoRow(icon: Icons.do_not_disturb_on_outlined, label: 'Avoid', value: intel!.avoidTime!),
          if (stop.isMealSlot)
            const Padding(
              padding: EdgeInsets.only(top: 4),
              child: Notice(text: 'No restaurant picked for this meal — eat wherever is close. You can pick one on the website.', icon: Icons.restaurant_outlined),
            ),
          if (intel?.why != null) ...[
            const SizedBox(height: 10),
            Text(intel!.why!, style: const TextStyle(fontStyle: FontStyle.italic, height: 1.4)),
          ],
          if (intel?.tips.isNotEmpty == true) ...[
            const SizedBox(height: 10),
            for (final tip in intel!.tips)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('•  ', style: TextStyle(color: context.accent, fontWeight: FontWeight.w800)),
                  Expanded(child: Text(tip, style: const TextStyle(height: 1.35))),
                ]),
              ),
          ],
          if (stop.notes != null) ...[const SizedBox(height: 10), Notice(text: stop.notes!, icon: Icons.sticky_note_2_outlined)],
          if (stop.warnings.isNotEmpty) ...[
            const SizedBox(height: 10),
            Notice(text: stop.warnings.join('\n'), icon: Icons.warning_amber_rounded, tone: 'warn'),
          ],
          const SizedBox(height: 18),
          if (stop.point != null) ...[
            FilledButton.icon(
              onPressed: () {
                Navigator.pop(context);
                context.push('/trip/${trip.id}/navigate?day=${day.number}&stop=${stop.id}');
              },
              icon: const Icon(Icons.explore_outlined),
              label: const Text('Take me there'),
            ),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => openDirections(context, stop.point!, label: stop.name),
                  icon: const Icon(Icons.directions_outlined, size: 18),
                  label: const Text('Google Maps'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => context.push('/driver', extra: (name: stop.title, address: address ?? '')),
                  icon: const Icon(Icons.local_taxi_outlined, size: 18),
                  label: const Text('Show driver'),
                ),
              ),
            ]),
          ],
          if (stop.kind == StopKind.visit) ...[
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: stop.done
                    ? OutlinedButton.icon(onPressed: () => _set(context, ref, null), icon: const Icon(Icons.undo), label: const Text('Not done'))
                    : FilledButton.tonalIcon(
                        onPressed: () => _set(context, ref, 'done'),
                        icon: const Icon(Icons.check_circle_outline),
                        label: const Text('Visited'),
                      ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: stop.skipped
                    ? OutlinedButton.icon(onPressed: () => _set(context, ref, null), icon: const Icon(Icons.undo), label: const Text('Unskip'))
                    : OutlinedButton.icon(onPressed: () => _set(context, ref, 'skipped'), icon: const Icon(Icons.skip_next_outlined), label: const Text('Skip')),
              ),
            ]),
          ],
        ],
      ),
    );
  }
}
