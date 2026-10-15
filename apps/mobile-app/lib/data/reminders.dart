import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../core/geo.dart';
import 'models.dart';
import 'offline_store.dart';

/// "Leave now for …" and morning-plan notifications, scheduled on the phone so they fire offline.
class Reminders {
  final _plugin = FlutterLocalNotificationsPlugin();
  bool _ready = false;

  static const _channel = AndroidNotificationDetails(
    'trippin_plan',
    'Trip plan',
    channelDescription: 'When to leave for the next stop, and the day’s plan each morning',
    importance: Importance.high,
    priority: Priority.high,
  );

  Future<void> init() async {
    if (_ready) return;
    tzdata.initializeTimeZones();
    try {
      final local = await FlutterTimezone.getLocalTimezone();
      tz.setLocalLocation(tz.getLocation(local.identifier));
    } catch (_) {
      // Fall back to UTC; times may then be off, but nothing crashes.
    }
    await _plugin.initialize(
      settings: const InitializationSettings(android: AndroidInitializationSettings('ic_stat_trippin')),
    );
    _ready = true;
  }

  Future<bool> requestPermission() async {
    await init();
    final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    return await android?.requestNotificationsPermission() ?? true;
  }

  tz.TZDateTime? _at(String date, String hhmm) {
    final d = DateTime.tryParse(date);
    final parts = hhmm.split(':');
    if (d == null || parts.length != 2) return null;
    final h = int.tryParse(parts[0]), m = int.tryParse(parts[1]);
    if (h == null || m == null) return null;
    return tz.TZDateTime(tz.local, d.year, d.month, d.day, h, m);
  }

  /// Replaces every scheduled reminder with ones for the saved trips' coming days.
  Future<void> reschedule(List<TripBundle> trips, AppSettings settings) async {
    await init();
    await _plugin.cancelAll();
    if (!settings.reminders && !settings.morningBrief) return;
    final now = tz.TZDateTime.now(tz.local);
    final horizon = now.add(const Duration(days: 10));
    var id = 1;
    final jobs = <Future<void>>[];

    void schedule(tz.TZDateTime when, String title, String body) {
      if (when.isBefore(now) || when.isAfter(horizon) || id > 400) return;
      jobs.add(_plugin
          .zonedSchedule(
            id: id++,
            scheduledDate: when,
            notificationDetails: const NotificationDetails(android: _channel),
            // Inexact: no special alarm permission, may fire a few minutes late.
            androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
            title: title,
            body: body,
          )
          .catchError((Object e) => debugPrint('reminder failed: $e')));
    }

    for (final trip in trips) {
      for (final day in trip.days) {
        final visits = day.visits;
        if (settings.morningBrief && day.stops.isNotEmpty) {
          final first = day.stops.first;
          final start = _at(day.date, first.arrival);
          if (start != null) {
            final where = trip.dayTripName(day);
            schedule(
              start.subtract(Duration(minutes: 45 + first.travelMinutes)),
              'Today: ${where != null ? 'day trip to $where' : (day.legName ?? trip.city)}',
              '${visits.length} place${visits.length == 1 ? '' : 's'} · first stop ${first.title} at ${first.arrival}',
            );
          }
        }
        if (!settings.reminders) continue;
        for (final stop in day.stops) {
          if (stop.travelMinutes < 5 || stop.kind == StopKind.transfer || stop.done || stop.skipped) continue;
          final arrive = _at(day.date, stop.arrival);
          if (arrive == null) continue;
          final leave = arrive.subtract(Duration(minutes: stop.travelMinutes));
          schedule(
            leave.subtract(Duration(minutes: settings.leadMinutes)),
            'Leave in ${settings.leadMinutes} min for ${stop.title}',
            '${formatMinutes(stop.travelMinutes)} away${stop.travelKm != null ? ' · ${stop.travelKm!.toStringAsFixed(1)} km' : ''} · arrive ${stop.arrival}',
          );
        }
      }
    }
    await Future.wait(jobs);
  }

  Future<void> cancelAll() async {
    await init();
    await _plugin.cancelAll();
  }
}
