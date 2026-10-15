import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/app_state.dart';
import '../../data/models.dart';
import '../../shared/widgets.dart';

/// The stop to head to now: the first one not done or skipped that you haven't left yet.
Stop? nextStop(Day day, {bool isToday = true}) {
  final now = isToday ? TimeOfDay.now() : null;
  final nowMin = now == null ? -1 : now.hour * 60 + now.minute;
  for (final s in day.stops) {
    if (s.done || s.skipped || s.point == null || s.kind == StopKind.transfer) continue;
    final leave = minutesOf(s.departure) ?? 0;
    if (leave >= nowMin) return s;
  }
  for (final s in day.stops.reversed) {
    if (s.kind == StopKind.ret && s.point != null) return s;
  }
  return null;
}

/// "Today on your trip" — shown on the trips list and the trip page while the trip is on.
class TodayCard extends ConsumerWidget {
  const TodayCard({super.key, required this.tripId});
  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bundle = ref.watch(bundleProvider(tripId)).valueOrNull;
    final day = bundle?.dayOn(todayYmd());
    if (bundle == null || day == null) return const SizedBox.shrink();
    final next = nextStop(day);
    final where = bundle.dayTripName(day);
    final done = day.visits.where((s) => s.done).length;
    final color = TrippinColors.day(day.number);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => context.push('/trip/$tripId/day/${day.number}'),
          child: Container(
            decoration: BoxDecoration(border: Border(left: BorderSide(color: color, width: 5))),
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Pill('Today · Day ${day.number}', bg: color, fg: Colors.white),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(where != null ? 'Day trip to $where' : (day.legName ?? bundle.city),
                      style: TextStyle(color: context.muted, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis),
                ),
                Text('$done/${day.visits.length}', style: TextStyle(color: context.muted, fontWeight: FontWeight.w600)),
              ]),
              const SizedBox(height: 12),
              if (next == null)
                Text('All done for today 🎉', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700))
              else ...[
                Text('Next', style: TextStyle(color: context.muted, fontSize: 12.5, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(next.title, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                Text('${next.arrival} – ${next.departure}${next.hoursToday != null ? ' · open ${next.hoursToday}' : ''}',
                    style: TextStyle(color: context.muted)),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => context.push('/trip/$tripId/navigate?day=${day.number}&stop=${next.id}'),
                      icon: const Icon(Icons.explore_outlined),
                      label: const Text('Take me there'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  OutlinedButton(onPressed: () => context.push('/trip/$tripId/day/${day.number}'), child: const Text('Day plan')),
                ]),
              ],
            ]),
          ),
        ),
      ),
    );
  }
}
