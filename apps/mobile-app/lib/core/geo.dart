import 'dart:math' as math;

import 'package:latlong2/latlong.dart';

/// Distance in metres.
double distanceM(LatLng a, LatLng b) {
  const r = 6371000.0;
  final dLat = _rad(b.latitude - a.latitude);
  final dLng = _rad(b.longitude - a.longitude);
  final h = math.pow(math.sin(dLat / 2), 2) +
      math.cos(_rad(a.latitude)) * math.cos(_rad(b.latitude)) * math.pow(math.sin(dLng / 2), 2);
  return 2 * r * math.asin(math.sqrt(h));
}

/// Compass bearing from [a] to [b], 0–360° clockwise from north.
double bearingDeg(LatLng a, LatLng b) {
  final lat1 = _rad(a.latitude);
  final lat2 = _rad(b.latitude);
  final dLng = _rad(b.longitude - a.longitude);
  final y = math.sin(dLng) * math.cos(lat2);
  final x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dLng);
  return (_deg(math.atan2(y, x)) + 360) % 360;
}

/// "N", "NE" … for a bearing.
String compassPoint(double bearing) {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[((bearing + 22.5) % 360 ~/ 45)];
}

double _rad(double d) => d * math.pi / 180;
double _deg(double r) => r * 180 / math.pi;

/// Google's encoded polyline format.
List<LatLng> decodePolyline(String encoded) {
  final points = <LatLng>[];
  var index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    var shift = 0, result = 0, b = 0;
    do {
      b = encoded.codeUnitAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < encoded.length);
    lat += (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
    shift = 0;
    result = 0;
    do {
      b = encoded.codeUnitAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < encoded.length);
    lng += (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
    points.add(LatLng(lat / 1e5, lng / 1e5));
  }
  return points;
}

/// Where [p] is relative to a line: the distance to it and the index of the segment it's nearest.
class LineFix {
  const LineFix(this.distanceM, this.segment, this.fraction);
  final double distanceM;
  final int segment;
  final double fraction;
}

/// Closest point on [line] to [p] (flat-earth projection — fine at city scale).
LineFix nearestOnLine(LatLng p, List<LatLng> line) {
  if (line.isEmpty) return const LineFix(double.infinity, 0, 0);
  if (line.length == 1) return LineFix(distanceM(p, line.first), 0, 0);
  final cosLat = math.cos(_rad(p.latitude));
  var best = const LineFix(double.infinity, 0, 0);
  for (var i = 0; i < line.length - 1; i++) {
    final a = line[i], b = line[i + 1];
    final ax = (a.longitude - p.longitude) * cosLat, ay = a.latitude - p.latitude;
    final bx = (b.longitude - p.longitude) * cosLat, by = b.latitude - p.latitude;
    final dx = bx - ax, dy = by - ay;
    final len2 = dx * dx + dy * dy;
    var t = len2 == 0 ? 0.0 : -(ax * dx + ay * dy) / len2;
    t = t.clamp(0.0, 1.0);
    final proj = LatLng(a.latitude + (b.latitude - a.latitude) * t, a.longitude + (b.longitude - a.longitude) * t);
    final d = distanceM(p, proj);
    if (d < best.distanceM) best = LineFix(d, i, t);
  }
  return best;
}

/// Length of [line] from the fix to its end, in metres.
double remainingAlong(List<LatLng> line, LineFix fix) {
  if (line.length < 2) return 0;
  final a = line[fix.segment], b = line[fix.segment + 1];
  var total = distanceM(a, b) * (1 - fix.fraction);
  for (var i = fix.segment + 1; i < line.length - 1; i++) {
    total += distanceM(line[i], line[i + 1]);
  }
  return total;
}

int _nearestIndex(List<LatLng> line, LatLng p, int from) {
  var best = from, bestD = double.infinity;
  for (var i = from; i < line.length; i++) {
    final d = distanceM(line[i], p);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/// The stretch of a day's route between two points on it (the leg into one stop).
List<LatLng> routeBetween(List<LatLng> route, LatLng? from, LatLng to) {
  if (route.length < 2) return const [];
  final start = from == null ? 0 : _nearestIndex(route, from, 0);
  final end = _nearestIndex(route, to, start);
  if (end <= start) return const [];
  return route.sublist(start, end + 1);
}

String formatDistance(double metres) {
  if (metres < 1000) return '${(metres / 10).round() * 10} m';
  if (metres < 10000) return '${(metres / 1000).toStringAsFixed(1)} km';
  return '${(metres / 1000).round()} km';
}

String formatMinutes(int minutes) {
  if (minutes < 60) return '$minutes min';
  final h = minutes ~/ 60, m = minutes % 60;
  return m == 0 ? '$h h' : '$h h ${m.toString().padLeft(2, '0')}';
}
