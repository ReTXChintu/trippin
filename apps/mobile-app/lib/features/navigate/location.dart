import 'dart:async';

import 'package:flutter_compass/flutter_compass.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

/// Where the phone is. GPS needs no internet — it works in the middle of nowhere.
class Fix {
  const Fix(this.point, this.accuracy, this.heading, this.speed);
  final LatLng point;
  final double accuracy;
  final double heading;
  final double speed;
}

enum LocationIssue { serviceOff, denied, deniedForever }

class LocationError implements Exception {
  LocationError(this.issue);
  final LocationIssue issue;
  String get message => switch (issue) {
        LocationIssue.serviceOff => 'Location is off. Turn it on to see where you are.',
        LocationIssue.denied => 'Trippin needs your location to point you to the next stop.',
        LocationIssue.deniedForever => 'Location is blocked for Trippin. Allow it in the phone’s settings.',
      };
}

Future<void> ensureLocation() async {
  if (!await Geolocator.isLocationServiceEnabled()) throw LocationError(LocationIssue.serviceOff);
  var p = await Geolocator.checkPermission();
  if (p == LocationPermission.denied) p = await Geolocator.requestPermission();
  if (p == LocationPermission.denied) throw LocationError(LocationIssue.denied);
  if (p == LocationPermission.deniedForever) throw LocationError(LocationIssue.deniedForever);
}

final locationProvider = StreamProvider.autoDispose<Fix>((ref) async* {
  await ensureLocation();
  final last = await Geolocator.getLastKnownPosition();
  if (last != null) yield Fix(LatLng(last.latitude, last.longitude), last.accuracy, last.heading, last.speed);
  yield* Geolocator.getPositionStream(
    locationSettings: const LocationSettings(accuracy: LocationAccuracy.best, distanceFilter: 3),
  ).map((p) => Fix(LatLng(p.latitude, p.longitude), p.accuracy, p.heading, p.speed));
});

/// Which way the top of the phone points, 0–360° from north (null when the phone has no compass).
final headingProvider = StreamProvider.autoDispose<double?>((ref) {
  final events = FlutterCompass.events;
  if (events == null) return Stream.value(null);
  return events.map((e) => e.heading == null ? null : (e.heading! + 360) % 360);
});

Future<void> openLocationSettings(LocationIssue issue) async {
  if (issue == LocationIssue.serviceOff) {
    await Geolocator.openLocationSettings();
  } else {
    await Geolocator.openAppSettings();
  }
}
