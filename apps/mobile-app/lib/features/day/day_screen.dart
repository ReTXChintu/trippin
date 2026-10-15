import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/geo.dart';
import '../../core/theme.dart';
import '../../data/app_state.dart';
import '../../data/models.dart';
import '../../shared/widgets.dart';
import '../trip/today_card.dart';
import 'stop_sheet.dart';

class DayScreen extends ConsumerWidget {
  const DayScreen({super.key, required this.tripId, required this.dayNumber});
  final String tripId;
  final int dayNumber;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(bundleProvider(tripId));
    return async.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (e, _) => Scaffold(appBar: AppBar(), body: EmptyState(icon: Icons.error_outline, title: 'Can’t open this day', text: '$e')),
      data: (trip) {
        final day = trip.days.where((d) => d.number == dayNumber).firstOrNull;
        if (day == null) return Scaffold(appBar: AppBar(), body: const EmptyState(icon: Icons.event_busy, title: 'Day not found', text: 'The plan changed — go back and pick a day.'));
        final where = trip.dayTripName(day);
        final weather = trip.weather[day.date];
        final route = trip.routes[day.number];
        final isToday = day.date == todayYmd();
        final next = nextStop(day, isToday: isToday);
        final color = TrippinColors.day(day.number);
        var n = 0;

        return Scaffold(
          appBar: AppBar(title: Text('Day ${day.number} · ${shortDate(day.date)}')),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
            children: [
              Text(
                where != null ? 'Day trip to $where from ${trip.legFor(day).baseCity}' : (day.transferLabel ?? day.legName ?? trip.city),
                style: TextStyle(color: context.muted, fontSize: 15),
              ),
              const SizedBox(height: 10),
              Wrap(spacing: 6, runSpacing: 6, children: [
                if (weather != null)
                  Pill('${weather.icon} ${weather.max}° / ${weather.min}° · ${weather.summary}${weather.forecast && weather.rainChance != null ? ' · ${weather.rainChance}% rain' : ''}'),
                Pill('${day.visits.length} place${day.visits.length == 1 ? '' : 's'}', icon: Icons.place_outlined),
                if (route != null) Pill('${route.km.round()} km · ${formatMinutes(route.minutes)} on the road', icon: Icons.route_outlined),
              ]),
              if (day.dressCode != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: context.accentSoft, borderRadius: BorderRadius.circular(12)),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Icon(Icons.checkroom_outlined, color: context.accentText, size: 20),
                    const SizedBox(width: 10),
                    Expanded(child: Text(day.dressCode!, style: TextStyle(color: context.accentText, height: 1.35))),
                  ]),
                ),
              ],
              const SizedBox(height: 14),
              Row(children: [
                if (next != null)
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => context.push('/trip/$tripId/navigate?day=${day.number}&stop=${next.id}'),
                      icon: const Icon(Icons.explore_outlined),
                      label: Text(isToday ? 'Go to next stop' : 'Navigate'),
                    ),
                  ),
                if (next != null) const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => context.push('/trip/$tripId/day/${day.number}/map'),
                    icon: const Icon(Icons.map_outlined),
                    label: const Text('Map'),
                  ),
                ),
              ]),
              const SizedBox(height: 18),
              for (var i = 0; i < day.stops.length; i++) ...[
                if (i > 0 && day.stops[i].travelMinutes > 0) _Travel(stop: day.stops[i], mode: trip.transport),
                _StopRow(
                  stop: day.stops[i],
                  number: day.stops[i].kind == StopKind.visit ? ++n : null,
                  color: color,
                  isNext: isToday && next?.id == day.stops[i].id,
                  onTap: () => showStopSheet(context, ref, trip: trip, day: day, stop: day.stops[i]),
                ),
              ],
              if (day.stops.isEmpty)
                const EmptyState(icon: Icons.self_improvement, title: 'Free day', text: 'Nothing planned — enjoy it.'),
            ],
          ),
        );
      },
    );
  }
}

class _Travel extends StatelessWidget {
  const _Travel({required this.stop, required this.mode});
  final Stop stop;
  final String mode;
  @override
  Widget build(BuildContext context) {
    final how = switch (mode) { 'Walking' => 'walk', 'Cab' => 'by taxi', 'Self Drive' => 'drive', 'Bike' => 'by bike', 'Public Transport' => 'by transit', _ => '' };
    return Padding(
      padding: const EdgeInsets.only(left: 64, top: 2, bottom: 2),
      child: Row(children: [
        Container(width: 2, height: 22, color: context.line),
        const SizedBox(width: 12),
        Text(
          '${formatMinutes(stop.travelMinutes)} $how${stop.travelKm != null ? ' · ${stop.travelKm! < 10 ? stop.travelKm!.toStringAsFixed(1) : stop.travelKm!.round()} km' : ''}',
          style: TextStyle(color: context.muted, fontSize: 12.5),
        ),
      ]),
    );
  }
}

class _StopRow extends StatelessWidget {
  const _StopRow({required this.stop, required this.number, required this.color, required this.isNext, required this.onTap});
  final Stop stop;
  final int? number;
  final Color color;
  final bool isNext;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final faded = stop.done || stop.skipped;
    final marker = switch (stop.kind) {
      StopKind.visit => CircleAvatar(
          radius: 15,
          backgroundColor: faded ? context.line : color,
          child: stop.done
              ? const Icon(Icons.check, size: 16, color: Colors.white)
              : Text('$number', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
        ),
      StopKind.meal => _ring(context, Icons.restaurant_outlined),
      StopKind.ret => _ring(context, Icons.hotel_outlined),
      StopKind.transfer => _ring(context, Icons.directions_car_outlined),
    };
    final subtitle = <String>[
      if (stop.kind == StopKind.visit || (stop.kind == StopKind.meal && !stop.isMealSlot)) '${stop.arrival} – ${stop.departure}',
      if (stop.isMealSlot) 'Not picked — eat nearby',
      if (stop.category != null && stop.kind == StopKind.visit) stop.category!,
      if (stop.hoursToday != null && stop.kind != StopKind.ret) stop.hoursToday == 'Closed' ? 'Closed today' : 'Open ${stop.hoursToday}',
      if (stop.skipped) 'Skipped',
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
            width: 48,
            child: Padding(
              padding: const EdgeInsets.only(top: 14),
              child: Text(stop.arrival, textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: faded ? context.muted : null)),
            ),
          ),
          const SizedBox(width: 8),
          Padding(padding: const EdgeInsets.only(top: 9), child: marker),
          const SizedBox(width: 10),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: stop.isMealSlot ? Colors.transparent : Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: isNext ? color : context.line, width: isNext ? 2 : 1),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (isNext) Padding(padding: const EdgeInsets.only(bottom: 4), child: Text('NEXT', style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 0.8))),
                Text(
                  stop.title,
                  style: TextStyle(
                    fontWeight: stop.kind == StopKind.visit ? FontWeight.w700 : FontWeight.w600,
                    fontSize: 15,
                    decoration: stop.skipped ? TextDecoration.lineThrough : null,
                    color: faded ? context.muted : null,
                  ),
                ),
                if (subtitle.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(subtitle.join(' · '), style: TextStyle(color: stop.hoursToday == 'Closed' ? context.danger : context.muted, fontSize: 12.5)),
                ],
                if (stop.warnings.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text('⚠ ${stop.warnings.first}', style: TextStyle(color: context.warn, fontSize: 12.5)),
                ],
              ]),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _ring(BuildContext context, IconData icon) => Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: context.line, width: 2), color: Theme.of(context).colorScheme.surface),
        child: Icon(icon, size: 15, color: context.muted),
      );
}
