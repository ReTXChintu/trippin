import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/app_state.dart';
import '../../data/models.dart';
import '../../shared/widgets.dart';
import 'today_card.dart';

class TripScreen extends ConsumerWidget {
  const TripScreen({super.key, required this.tripId});
  final String tripId;

  Future<void> _save(BuildContext context, WidgetRef ref) async {
    try {
      await ref.read(tripServiceProvider).save(tripId);
      if (context.mounted) toast(context, 'Saved — this trip now works with no signal');
    } catch (e) {
      if (context.mounted) toast(context, e.toString());
    }
  }

  Future<void> _remove(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Remove from this phone?'),
        content: const Text('The trip stays in your account. You won’t be able to open it offline until you save it again.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Remove')),
        ],
      ),
    );
    if (ok == true) {
      await ref.read(tripServiceProvider).remove(tripId);
      if (context.mounted) toast(context, 'Removed from this phone');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(bundleProvider(tripId));
    final saved = ref.watch(savedTripsProvider).where((t) => t.summary.id == tripId).firstOrNull;
    final busy = ref.watch(saveProgressProvider)[tripId];

    return Scaffold(
      appBar: AppBar(
        title: Text(async.valueOrNull?.title ?? 'Trip'),
        actions: [
          IconButton(
            tooltip: 'Safety & emergency',
            icon: const Icon(Icons.health_and_safety_outlined),
            onPressed: async.hasValue ? () => context.push('/trip/$tripId/safety') : null,
          ),
          if (saved != null)
            PopupMenuButton<String>(
              onSelected: (v) => v == 'update' ? _save(context, ref) : _remove(context, ref),
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'update', child: Text('Update now')),
                PopupMenuItem(value: 'remove', child: Text('Remove from this phone')),
              ],
            ),
        ],
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => EmptyState(
          icon: Icons.cloud_off_outlined,
          title: 'Can’t open this trip',
          text: '$e\n\nTrips you save open with no signal.',
          action: OutlinedButton(onPressed: () => ref.invalidate(bundleProvider(tripId)), child: const Text('Try again')),
        ),
        data: (trip) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
          children: [
            Text('${trip.city} · ${dateRange(trip.startDate, trip.endDate)}', style: TextStyle(color: context.muted, fontSize: 15)),
            const SizedBox(height: 12),
            if (busy != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(busy.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(value: busy.value, borderRadius: BorderRadius.circular(4)),
                  ]),
                ),
              )
            else if (saved == null)
              Notice(
                text: 'Not saved on this phone yet. Save it to open the plan, maps and directions with no signal.',
                icon: Icons.download_for_offline_outlined,
                action: TextButton(onPressed: () => _save(context, ref), child: const Text('Save')),
              )
            else
              Notice(
                text: 'Saved ${ago(saved.savedAt)}${saved.mapsSaved ? ' with maps' : ''} · works offline',
                icon: Icons.offline_pin_outlined,
                tone: 'success',
              ),
            const SizedBox(height: 12),
            TodayCard(tripId: tripId),
            if (trip.days.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 24),
                child: EmptyState(icon: Icons.event_note_outlined, title: 'No plan yet', text: 'Make the day-by-day plan on the Trippin website, then update here.'),
              ),
            if (trip.days.isNotEmpty) const SectionTitle('Days'),
            for (final day in trip.days) ...[_DayTile(trip: trip, day: day), const SizedBox(height: 8)],
            _Stays(trip: trip),
            if (trip.bookings.isNotEmpty) ...[
              const SectionTitle('Bookings'),
              for (final b in trip.bookings) ...[_BookingTile(b), const SizedBox(height: 8)],
            ],
            if (trip.checklist.isNotEmpty) ...[
              const SectionTitle('Checklist'),
              Card(
                child: Column(children: [
                  for (final c in trip.checklist)
                    ListTile(
                      dense: true,
                      leading: Icon(c.done ? Icons.check_box : Icons.check_box_outline_blank, color: c.done ? context.success : context.muted),
                      title: Text(c.text, style: TextStyle(decoration: c.done ? TextDecoration.lineThrough : null)),
                    ),
                ]),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DayTile extends StatelessWidget {
  const _DayTile({required this.trip, required this.day});
  final TripBundle trip;
  final Day day;

  @override
  Widget build(BuildContext context) {
    final where = trip.dayTripName(day);
    final weather = trip.weather[day.date];
    final visits = day.visits;
    final done = visits.where((v) => v.done).length;
    final isToday = day.date == todayYmd();
    final color = TrippinColors.day(day.number);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/trip/${trip.id}/day/${day.number}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            Container(
              width: 44,
              height: 44,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(12)),
              child: Text('${day.number}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Flexible(child: Text(shortDate(day.date), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15.5))),
                  if (isToday) ...[const SizedBox(width: 8), Pill('Today', bg: context.successSoft, fg: context.success)],
                ]),
                const SizedBox(height: 2),
                Text(
                  [
                    where != null ? 'Day trip to $where' : (day.transferLabel ?? day.legName ?? trip.city),
                    if (visits.isNotEmpty) '${visits.length} place${visits.length == 1 ? '' : 's'}',
                    if (done > 0) '$done done',
                  ].join(' · '),
                  style: TextStyle(color: context.muted, fontSize: 13),
                  overflow: TextOverflow.ellipsis,
                ),
              ]),
            ),
            if (weather != null)
              Column(children: [
                Text(weather.icon, style: const TextStyle(fontSize: 20)),
                Text('${weather.max}°', style: TextStyle(color: context.muted, fontSize: 12, fontWeight: FontWeight.w600)),
              ]),
            const SizedBox(width: 4),
            Icon(Icons.chevron_right, color: context.muted),
          ]),
        ),
      ),
    );
  }
}

class _Stays extends StatelessWidget {
  const _Stays({required this.trip});
  final TripBundle trip;

  @override
  Widget build(BuildContext context) {
    final stays = [for (final l in trip.legs) ...l.stays];
    if (stays.isEmpty) return const SizedBox.shrink();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const SectionTitle('Where you stay'),
      for (final s in stays) ...[
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(Icons.hotel_outlined, color: context.accent),
                const SizedBox(width: 10),
                Expanded(child: Text(s.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15.5))),
              ]),
              if (s.address != null) ...[const SizedBox(height: 6), SelectableText(s.address!, style: TextStyle(color: context.muted))],
              if (s.checkInDate != null || s.confirmation != null) ...[
                const SizedBox(height: 8),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  if (s.checkInDate != null) Pill('${shortDate(s.checkInDate!)} → ${s.checkOutDate != null ? shortDate(s.checkOutDate!) : ''}'),
                  if (s.confirmation != null) Pill('Booking ${s.confirmation}', icon: Icons.confirmation_number_outlined),
                ]),
              ],
              if (s.point != null) ...[
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => context.push('/trip/${trip.id}/navigate?lat=${s.point!.latitude}&lng=${s.point!.longitude}&name=${Uri.encodeComponent(s.name)}'),
                      icon: const Icon(Icons.explore_outlined, size: 18),
                      label: const Text('Take me back'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.outlined(
                    tooltip: 'Show to a driver',
                    onPressed: () => context.push('/driver', extra: (name: s.name, address: s.address ?? '')),
                    icon: const Icon(Icons.local_taxi_outlined),
                  ),
                ]),
              ],
            ]),
          ),
        ),
        const SizedBox(height: 8),
      ],
    ]);
  }
}

class _BookingTile extends StatelessWidget {
  const _BookingTile(this.b);
  final Booking b;

  IconData get _icon => switch (b.type) {
        'flight' => Icons.flight_outlined,
        'train' => Icons.train_outlined,
        'bus' => Icons.directions_bus_outlined,
        'hotel' => Icons.hotel_outlined,
        'car' => Icons.directions_car_outlined,
        _ => Icons.confirmation_number_outlined,
      };

  @override
  Widget build(BuildContext context) => Card(
        child: ListTile(
          leading: Icon(_icon, color: context.accent),
          title: Text(b.title, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text([
            if (b.startDate != null) '${shortDate(b.startDate!)}${b.startTime != null ? ' ${b.startTime}' : ''}',
            if (b.fromPlace != null || b.toPlace != null) '${b.fromPlace ?? ''} → ${b.toPlace ?? ''}',
            if (b.provider != null) b.provider!,
            if (b.confirmation != null) 'Ref ${b.confirmation}',
          ].join(' · ')),
        ),
      );
}
