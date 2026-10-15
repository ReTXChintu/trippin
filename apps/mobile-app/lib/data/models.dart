import 'package:latlong2/latlong.dart';

import '../core/geo.dart';

typedef Json = Map<String, dynamic>;

LatLng? _point(dynamic v) {
  if (v is! Map) return null;
  final lat = (v['lat'] as num?)?.toDouble();
  final lng = (v['lng'] as num?)?.toDouble();
  return lat == null || lng == null ? null : LatLng(lat, lng);
}

String? _str(dynamic v) {
  final s = v?.toString().trim();
  return s == null || s.isEmpty ? null : s;
}

List<Json> _list(dynamic v) => (v as List?)?.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList() ?? const [];

/// A trip as the trips list shows it.
class TripSummary {
  TripSummary({required this.id, required this.title, required this.city, required this.startDate, required this.endDate, this.status});

  factory TripSummary.fromJson(Json j) => TripSummary(
        id: j['id'] as String,
        title: _str(j['title']) ?? 'Trip',
        city: _str(j['destinationCity']) ?? '',
        startDate: (j['startDate'] as String? ?? '').split('T').first,
        endDate: (j['endDate'] as String? ?? '').split('T').first,
        status: _str(j['status']),
      );

  final String id, title, city, startDate, endDate;
  final String? status;

  Json toJson() => {'id': id, 'title': title, 'destinationCity': city, 'startDate': startDate, 'endDate': endDate, 'status': status};
}

class Stay {
  Stay({required this.name, this.address, this.point, this.checkInDate, this.checkOutDate, this.checkInTime, this.confirmation, this.notes});
  factory Stay.fromJson(Json j) => Stay(
        name: _str(j['name']) ?? 'Stay',
        address: _str(j['address']),
        point: _point(j['coordinates']),
        checkInDate: _str(j['checkInDate']),
        checkOutDate: _str(j['checkOutDate']),
        checkInTime: _str(j['checkInTime']),
        confirmation: _str(j['confirmationNumber']),
        notes: _str(j['notes']),
      );
  final String name;
  final String? address, checkInDate, checkOutDate, checkInTime, confirmation, notes;
  final LatLng? point;

  /// The stay you sleep at on [date] (check-in ≤ date < check-out).
  bool covers(String date) =>
      (checkInDate == null || checkInDate!.compareTo(date) <= 0) && (checkOutDate == null || date.compareTo(checkOutDate!) < 0);
}

class DayTrip {
  DayTrip({required this.name, this.date, this.point});
  factory DayTrip.fromJson(Json j) => DayTrip(name: _str(j['name']) ?? '', date: _str(j['date']), point: _point(j['coordinates']));
  final String name;
  final String? date;
  final LatLng? point;
}

class Leg {
  Leg({required this.id, required this.name, required this.baseCity, required this.startDate, required this.endDate, required this.stays, required this.dayTrips});
  factory Leg.fromJson(Json j) {
    final stays = _list(j['stays']).map(Stay.fromJson).toList();
    // Older trips keep a single hotel on the city instead of a stays list.
    if (stays.isEmpty && _str(j['hotelName']) != null) {
      stays.add(Stay(name: j['hotelName'] as String, address: _str(j['hotelAddress']), point: _point(j['hotelCoordinates'])));
    }
    return Leg(
      id: j['id'] as String? ?? '',
      name: _str(j['name']) ?? _str(j['baseCity']) ?? '',
      baseCity: _str(j['baseCity']) ?? '',
      startDate: _str(j['startDate']) ?? '',
      endDate: _str(j['endDate']) ?? '',
      stays: stays,
      dayTrips: _list(j['dayTrips']).map(DayTrip.fromJson).where((d) => d.name.isNotEmpty).toList(),
    );
  }
  final String id, name, baseCity, startDate, endDate;
  final List<Stay> stays;
  final List<DayTrip> dayTrips;

  Stay? stayOn(String date) {
    for (final s in stays) {
      if (s.covers(date)) return s;
    }
    return stays.isEmpty ? null : stays.first;
  }
}

class Booking {
  Booking({required this.type, required this.title, this.provider, this.confirmation, this.startDate, this.startTime, this.fromPlace, this.toPlace, this.notes});
  factory Booking.fromJson(Json j) => Booking(
        type: _str(j['type']) ?? 'other',
        title: _str(j['title']) ?? 'Booking',
        provider: _str(j['provider']),
        confirmation: _str(j['confirmationNumber']),
        startDate: _str(j['startDate']),
        startTime: _str(j['startTime']),
        fromPlace: _str(j['fromPlace']),
        toPlace: _str(j['toPlace']),
        notes: _str(j['notes']),
      );
  final String type, title;
  final String? provider, confirmation, startDate, startTime, fromPlace, toPlace, notes;
}

class ChecklistItem {
  ChecklistItem({required this.text, required this.done, required this.category});
  factory ChecklistItem.fromJson(Json j) =>
      ChecklistItem(text: _str(j['text']) ?? _str(j['title']) ?? '', done: j['done'] == true, category: _str(j['category']) ?? 'todo');
  final String text, category;
  final bool done;
}

class VisitIntel {
  VisitIntel({this.bestTime, this.avoidTime, this.why, this.tips = const [], this.entryFee, this.hype});
  factory VisitIntel.fromJson(Json j) => VisitIntel(
        bestTime: _str(j['bestTime']),
        avoidTime: _str(j['avoidTime']),
        why: _str(j['why']),
        tips: (j['tips'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        entryFee: _str(j['entryFee']),
        hype: _str(j['hypeLevel']),
      );
  final String? bestTime, avoidTime, why, entryFee, hype;
  final List<String> tips;
}

enum StopKind { visit, meal, ret, transfer }

class Stop {
  Stop({
    required this.id,
    required this.placeId,
    required this.name,
    required this.arrival,
    required this.departure,
    required this.visitMinutes,
    required this.travelMinutes,
    required this.kind,
    this.point,
    this.category,
    this.mealType,
    this.notes,
    this.intel,
    this.hoursToday,
    this.travelKm,
    this.status,
    this.warnings = const [],
  });

  factory Stop.fromJson(Json j) {
    final type = j['stopType'] as String?;
    return Stop(
      id: j['id'] as String,
      placeId: j['placeId'] as String? ?? '',
      name: _str(j['placeName']) ?? 'Stop',
      arrival: j['arrivalTime'] as String? ?? '',
      departure: j['departureTime'] as String? ?? '',
      visitMinutes: (j['visitDurationMinutes'] as num?)?.round() ?? 0,
      travelMinutes: (j['travelDurationMinutes'] as num?)?.round() ?? 0,
      kind: switch (type) { 'meal' => StopKind.meal, 'return' => StopKind.ret, 'transfer' => StopKind.transfer, _ => StopKind.visit },
      point: _point(j['coordinates']),
      category: _str(j['category']),
      mealType: _str(j['mealType']),
      notes: _str(j['notes']),
      intel: j['visitIntel'] is Map ? VisitIntel.fromJson((j['visitIntel'] as Map).cast<String, dynamic>()) : null,
      hoursToday: _str(j['openingHoursToday']),
      travelKm: (j['travelDistanceKm'] as num?)?.toDouble(),
      status: _str(j['status']),
      warnings: (j['warnings'] as List?)?.map((e) => e.toString()).toList() ?? const [],
    );
  }

  final String id, placeId, name, arrival, departure;
  final int visitMinutes, travelMinutes;
  final StopKind kind;
  final LatLng? point;
  final String? category, mealType, notes, hoursToday, status;
  final VisitIntel? intel;
  final double? travelKm;
  final List<String> warnings;

  bool get isMealSlot => kind == StopKind.meal && placeId.isEmpty;
  bool get done => status == 'done';
  bool get skipped => status == 'skipped';

  /// "Breakfast", "Lunch" … for meal stops.
  String get mealLabel => switch (mealType) { 'breakfast' => 'Breakfast', 'tiffin' => 'Snacks', 'dinner' => 'Dinner', _ => 'Lunch' };

  String get title => switch (kind) {
        StopKind.meal => placeId.isEmpty ? mealLabel : '$mealLabel · $name',
        StopKind.ret => name.replaceFirst(RegExp(r'^Return to\s+', caseSensitive: false), 'Back to '),
        _ => name,
      };
}

class Day {
  Day({required this.number, required this.date, required this.stops, this.legId, this.legName, this.dressCode, this.transferLabel});
  factory Day.fromJson(Json j) => Day(
        number: (j['dayNumber'] as num).toInt(),
        date: (j['date'] as String? ?? '').split('T').first,
        stops: _list(j['stops']).map(Stop.fromJson).toList(),
        legId: _str(j['legId']),
        legName: _str(j['legName']),
        dressCode: _str(j['dressCode']),
        transferLabel: _str(j['transferLabel']),
      );
  final int number;
  final String date;
  final List<Stop> stops;
  final String? legId, legName, dressCode, transferLabel;

  List<Stop> get visits => stops.where((s) => s.kind == StopKind.visit).toList();
}

class Place {
  Place({required this.id, required this.name, this.address, this.point, this.category, this.rating, this.ratingCount, this.weekdayHours = const [], this.entryFee, this.priceLevel, this.description});
  factory Place.fromJson(Json j) => Place(
        id: j['googlePlaceId'] as String,
        name: _str(j['name']) ?? '',
        address: _str(j['address']),
        point: _point(j['coordinates']),
        category: _str(j['category']),
        rating: (j['rating'] as num?)?.toDouble(),
        ratingCount: (j['userRatingCount'] as num?)?.toInt(),
        weekdayHours: (j['weekdayDescriptions'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        entryFee: _str(j['entryFee']),
        priceLevel: _str(j['priceLevel']),
        description: _str(j['description']),
      );
  final String id, name;
  final String? address, category, entryFee, priceLevel, description;
  final LatLng? point;
  final double? rating;
  final int? ratingCount;
  final List<String> weekdayHours;
}

class DayRoute {
  DayRoute({required this.dayNumber, required this.points, required this.km, required this.minutes});
  factory DayRoute.fromJson(Json j) {
    final overview = j['overviewPolyline'] as String? ?? '';
    final segments = (j['segmentPolylines'] as List?)?.map((e) => e.toString()).toList() ?? const [];
    final points = overview.isNotEmpty ? decodePolyline(overview) : segments.expand(decodePolyline).toList();
    return DayRoute(
      dayNumber: (j['dayNumber'] as num).toInt(),
      points: points,
      km: (j['totalDistanceKm'] as num?)?.toDouble() ?? 0,
      minutes: (j['totalDurationMinutes'] as num?)?.round() ?? 0,
    );
  }
  final int dayNumber;
  final List<LatLng> points;
  final double km;
  final int minutes;
}

class DayWeather {
  DayWeather({required this.date, required this.icon, required this.summary, required this.max, required this.min, this.rainChance, required this.forecast});
  factory DayWeather.fromJson(Json j) => DayWeather(
        date: j['date'] as String,
        icon: j['icon'] as String? ?? '',
        summary: j['summary'] as String? ?? '',
        max: (j['tempMaxC'] as num?)?.round() ?? 0,
        min: (j['tempMinC'] as num?)?.round() ?? 0,
        rainChance: (j['rainChance'] as num?)?.round(),
        forecast: j['kind'] == 'forecast',
      );
  final String date, icon, summary;
  final int max, min;
  final int? rainChance;
  final bool forecast;
}

class SafetyPlace {
  SafetyPlace({required this.kind, required this.name, required this.point, required this.near, this.phone});
  factory SafetyPlace.fromJson(Json j) => SafetyPlace(
        kind: j['kind'] as String? ?? 'hospital',
        name: _str(j['name']) ?? '',
        point: _point(j['coordinates']) ?? const LatLng(0, 0),
        near: _str(j['near']) ?? '',
        phone: _str(j['phone']),
      );
  final String kind, name, near;
  final LatLng point;
  final String? phone;
}

class EmergencyNumber {
  EmergencyNumber(this.label, this.number);
  final String label, number;
}

/// Everything about one trip, as saved on the phone.
class TripBundle {
  TripBundle({
    required this.raw,
    required this.version,
    required this.id,
    required this.title,
    required this.city,
    required this.country,
    required this.startDate,
    required this.endDate,
    required this.transport,
    required this.legs,
    required this.bookings,
    required this.checklist,
    required this.days,
    required this.places,
    required this.routes,
    required this.weather,
    required this.safety,
    required this.emergency,
    required this.generatedAt,
  });

  factory TripBundle.fromJson(Json j) {
    final trip = (j['trip'] as Map).cast<String, dynamic>();
    final itinerary = j['itinerary'] is Map ? (j['itinerary'] as Map).cast<String, dynamic>() : null;
    final legs = _list(trip['legs']).map(Leg.fromJson).toList();
    if (legs.isEmpty) {
      // Single-city trips from before legs existed.
      legs.add(Leg.fromJson({
        'id': '',
        'name': trip['destinationCity'],
        'baseCity': trip['destinationCity'],
        'startDate': trip['startDate'],
        'endDate': trip['endDate'],
        'hotelName': trip['hotelName'],
        'hotelAddress': trip['hotelAddress'],
        'hotelCoordinates': trip['hotelCoordinates'],
      }));
    }
    return TripBundle(
      raw: j,
      version: j['version'] as String? ?? '',
      id: trip['id'] as String,
      title: _str(trip['title']) ?? 'Trip',
      city: _str(trip['destinationCity']) ?? '',
      country: _str(trip['destinationCountry']) ?? '',
      startDate: (trip['startDate'] as String? ?? '').split('T').first,
      endDate: (trip['endDate'] as String? ?? '').split('T').first,
      transport: _str(trip['transportationMode']) ?? '',
      legs: legs,
      bookings: _list(trip['bookings']).map(Booking.fromJson).toList(),
      checklist: _list(trip['checklist']).map(ChecklistItem.fromJson).where((c) => c.text.isNotEmpty).toList(),
      days: _list(itinerary?['days']).map(Day.fromJson).toList(),
      places: {for (final p in _list(j['places']).map(Place.fromJson)) p.id: p},
      routes: {for (final r in _list(j['routes']).map(DayRoute.fromJson)) r.dayNumber: r},
      weather: {for (final w in _list(j['weather']).map(DayWeather.fromJson)) w.date: w},
      safety: _list(j['safety']).map(SafetyPlace.fromJson).toList(),
      emergency: _list(j['emergencyNumbers']).map((e) => EmergencyNumber(e['label'] as String, e['number'] as String)).toList(),
      generatedAt: DateTime.tryParse(j['generatedAt'] as String? ?? '') ?? DateTime.now(),
    );
  }

  final Json raw;
  final String version, id, title, city, country, startDate, endDate, transport;
  final List<Leg> legs;
  final List<Booking> bookings;
  final List<ChecklistItem> checklist;
  final List<Day> days;
  final Map<String, Place> places;
  final Map<int, DayRoute> routes;
  final Map<String, DayWeather> weather;
  final List<SafetyPlace> safety;
  final List<EmergencyNumber> emergency;
  final DateTime generatedAt;

  TripSummary get summary => TripSummary(id: id, title: title, city: city, startDate: startDate, endDate: endDate);

  Leg legFor(Day day) => legs.firstWhere((l) => l.id == day.legId, orElse: () => legs.first);

  /// Where you sleep the night of [day] — where "take me back" goes.
  Stay? stayFor(Day day) => legFor(day).stayOn(day.date);

  /// "Day trip to Ujjain" when the day is one of the city's fixed day trips.
  String? dayTripName(Day day) {
    for (final d in legFor(day).dayTrips) {
      if (d.date == day.date) return d.name;
    }
    return null;
  }

  Day? dayOn(String date) {
    for (final d in days) {
      if (d.date == date) return d;
    }
    return null;
  }

  /// Every point worth having map tiles for.
  List<LatLng> get allPoints => [
        for (final d in days) ...d.stops.map((s) => s.point).whereType<LatLng>(),
        for (final l in legs) ...l.stays.map((s) => s.point).whereType<LatLng>(),
      ];
}
