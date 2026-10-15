import 'package:flutter_test/flutter_test.dart';
import 'package:itinerary_planner/core/geo.dart';
import 'package:latlong2/latlong.dart';

void main() {
  const rajwada = LatLng(22.7184, 75.8552);
  const lalBagh = LatLng(22.7001, 75.8471);

  test('distance and bearing', () {
    expect(distanceM(rajwada, lalBagh), closeTo(2200, 150));
    final b = bearingDeg(rajwada, lalBagh);
    expect(compassPoint(b), anyOf('S', 'SW'));
    expect(compassPoint(0), 'N');
    expect(compassPoint(90), 'E');
  });

  test('polyline decode', () {
    // Google's documented example.
    final pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts.length, 3);
    expect(pts.first.latitude, closeTo(38.5, 1e-5));
    expect(pts.last.longitude, closeTo(-126.453, 1e-5));
  });

  test('off-route distance and what is left of the route', () {
    final line = [const LatLng(22.70, 75.85), const LatLng(22.71, 75.85), const LatLng(22.72, 75.85)];
    final onIt = nearestOnLine(const LatLng(22.705, 75.85), line);
    expect(onIt.distanceM, lessThan(1));
    expect(remainingAlong(line, onIt), closeTo(1670, 30));
    final off = nearestOnLine(const LatLng(22.705, 75.855), line);
    expect(off.distanceM, closeTo(513, 20));
  });

  test('route between two stops', () {
    final route = [for (var i = 0; i <= 10; i++) LatLng(22.70 + i * 0.001, 75.85)];
    final leg = routeBetween(route, const LatLng(22.702, 75.85), const LatLng(22.707, 75.85));
    expect(leg.length, 6);
    expect(formatDistance(450), '450 m');
    expect(formatDistance(2400), '2.4 km');
    expect(formatMinutes(95), '1 h 35');
  });
}
