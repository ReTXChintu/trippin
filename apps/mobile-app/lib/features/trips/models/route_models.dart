/// Real, road-following route data for one itinerary day — mirrors the backend's
/// `GET /trips/:id/itinerary/routes` response (apps/backend/.../itinerary-routing.service.ts).
class RouteHop {
  RouteHop({
    required this.fromStopId,
    required this.toStopId,
    required this.distanceKm,
    required this.durationMinutes,
  });

  final String fromStopId;
  final String toStopId;
  final double distanceKm;
  final int durationMinutes;

  factory RouteHop.fromJson(Map<String, dynamic> json) => RouteHop(
        fromStopId: json['fromStopId'] as String? ?? '',
        toStopId: json['toStopId'] as String? ?? '',
        distanceKm: (json['distanceKm'] as num?)?.toDouble() ?? 0,
        durationMinutes: json['durationMinutes'] as int? ?? 0,
      );

  Map<String, dynamic> toJson() => {
        'fromStopId': fromStopId,
        'toStopId': toStopId,
        'distanceKm': distanceKm,
        'durationMinutes': durationMinutes,
      };
}

class DayRoute {
  DayRoute({
    required this.dayNumber,
    required this.overviewPolyline,
    required this.totalDistanceKm,
    required this.totalDurationMinutes,
    required this.hops,
  });

  final int dayNumber;
  final String overviewPolyline;
  final double totalDistanceKm;
  final int totalDurationMinutes;
  final List<RouteHop> hops;

  factory DayRoute.fromJson(Map<String, dynamic> json) => DayRoute(
        dayNumber: json['dayNumber'] as int? ?? 0,
        overviewPolyline: json['overviewPolyline'] as String? ?? '',
        totalDistanceKm: (json['totalDistanceKm'] as num?)?.toDouble() ?? 0,
        totalDurationMinutes: json['totalDurationMinutes'] as int? ?? 0,
        hops: (json['hops'] as List<dynamic>? ?? [])
            .map((h) => RouteHop.fromJson(h as Map<String, dynamic>))
            .toList(),
      );

  Map<String, dynamic> toJson() => {
        'dayNumber': dayNumber,
        'overviewPolyline': overviewPolyline,
        'totalDistanceKm': totalDistanceKm,
        'totalDurationMinutes': totalDurationMinutes,
        'hops': hops.map((h) => h.toJson()).toList(),
      };
}
