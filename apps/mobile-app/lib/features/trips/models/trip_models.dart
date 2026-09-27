class Trip {
  Trip({
    required this.id,
    required this.title,
    required this.destinationCity,
    required this.destinationCountry,
    this.destinationState,
    required this.startDate,
    required this.endDate,
    this.arrivalTime,
    this.departureTime,
    this.status = 'draft',
    this.travelStyle = 'Balanced',
    this.transportationMode = 'Walking',
    this.budgetLevel,
    this.dailyStartTime = '09:00',
    this.dailyEndTime = '20:00',
    this.useFlexibleSchedule = false,
    this.interests = const [],
    this.mustVisitPlaces = const [],
    this.excludedPlaces = const [],
    this.notes,
    this.hotelName,
    this.hotelAddress,
    this.hotelCoordinates,
    this.selectedPlaceIds = const [],
    this.userId = '',
    this.publicSlug,
    this.legs = const [],
    this.transfers = const [],
    this.vehicleRentalSuggestions = const [],
    this.destinationBrief,
    this.ownerApiKeys,
  });

  final String id;
  final String title;
  final String destinationCity;
  final String destinationCountry;
  final String? destinationState;
  final String startDate;
  final String endDate;
  final String? arrivalTime;
  final String? departureTime;
  final String status;
  final String travelStyle;
  final String transportationMode;
  final String? budgetLevel;
  final String dailyStartTime;
  final String dailyEndTime;
  final bool useFlexibleSchedule;
  final List<String> interests;
  final List<String> mustVisitPlaces;
  final List<String> excludedPlaces;
  final String? notes;
  final String? hotelName;
  final String? hotelAddress;
  final Map<String, double>? hotelCoordinates;
  final List<String> selectedPlaceIds;
  final String userId;
  final String? publicSlug;
  final List<TripLeg> legs;
  final List<Map<String, dynamic>> transfers;
  final List<VehicleRental> vehicleRentalSuggestions;
  final DestinationBrief? destinationBrief;
  final OwnerApiKeys? ownerApiKeys;

  bool get isMultiLeg => legs.isNotEmpty;

  factory Trip.fromJson(Map<String, dynamic> json) {
    final coords = json['hotelCoordinates'] as Map<String, dynamic>?;
    return Trip(
      id: json['id'] as String? ?? json['_id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      destinationCity: json['destinationCity'] as String? ?? '',
      destinationCountry: json['destinationCountry'] as String? ?? '',
      destinationState: json['destinationState'] as String?,
      startDate: json['startDate']?.toString() ?? '',
      endDate: json['endDate']?.toString() ?? '',
      arrivalTime: json['arrivalTime'] as String?,
      departureTime: json['departureTime'] as String?,
      status: json['status'] as String? ?? 'draft',
      travelStyle: json['travelStyle'] as String? ?? 'Balanced',
      transportationMode: json['transportationMode'] as String? ?? 'Walking',
      budgetLevel: json['budgetLevel'] as String?,
      dailyStartTime: json['dailyStartTime'] as String? ?? '09:00',
      dailyEndTime: json['dailyEndTime'] as String? ?? '20:00',
      useFlexibleSchedule: json['useFlexibleSchedule'] as bool? ?? false,
      interests: (json['interests'] as List<dynamic>?)?.cast<String>() ?? [],
      mustVisitPlaces: (json['mustVisitPlaces'] as List<dynamic>?)?.cast<String>() ?? [],
      excludedPlaces: (json['excludedPlaces'] as List<dynamic>?)?.cast<String>() ?? [],
      notes: json['notes'] as String?,
      hotelName: json['hotelName'] as String?,
      hotelAddress: json['hotelAddress'] as String?,
      hotelCoordinates: coords != null
          ? {'lat': (coords['lat'] as num).toDouble(), 'lng': (coords['lng'] as num).toDouble()}
          : null,
      selectedPlaceIds: (json['selectedPlaceIds'] as List<dynamic>?)?.cast<String>() ?? [],
      userId: json['userId'] as String? ?? '',
      publicSlug: json['publicSlug'] as String?,
      legs: (json['legs'] as List<dynamic>? ?? [])
          .map((l) => TripLeg.fromJson(l as Map<String, dynamic>))
          .toList(),
      transfers: (json['transfers'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [],
      vehicleRentalSuggestions: (json['vehicleRentalSuggestions'] as List<dynamic>? ?? [])
          .map((v) => VehicleRental.fromJson(v as Map<String, dynamic>))
          .toList(),
      destinationBrief: json['destinationBrief'] != null
          ? DestinationBrief.fromJson(json['destinationBrief'] as Map<String, dynamic>)
          : null,
      ownerApiKeys: json['ownerApiKeys'] != null
          ? OwnerApiKeys.fromJson(json['ownerApiKeys'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'destinationCity': destinationCity,
      'destinationState': destinationState,
      'destinationCountry': destinationCountry,
      'startDate': startDate.split('T').first,
      'endDate': endDate.split('T').first,
      'arrivalTime': arrivalTime,
      'departureTime': departureTime,
      'dailyStartTime': dailyStartTime,
      'dailyEndTime': dailyEndTime,
      'useFlexibleSchedule': useFlexibleSchedule,
      'transportationMode': transportationMode,
      'travelStyle': travelStyle,
      if (budgetLevel != null) 'budgetLevel': budgetLevel,
      'interests': interests,
      'mustVisitPlaces': mustVisitPlaces,
      'excludedPlaces': excludedPlaces,
      if (notes != null) 'notes': notes,
      if (hotelName != null) 'hotelName': hotelName,
      if (hotelAddress != null) 'hotelAddress': hotelAddress,
      if (hotelCoordinates != null) 'hotelLat': hotelCoordinates!['lat'].toString(),
      if (hotelCoordinates != null) 'hotelLng': hotelCoordinates!['lng'].toString(),
      'legs': legs.map((l) => l.toJson()).toList(),
      'transfers': transfers,
      'status': status,
    };
  }
}

class TripLeg {
  TripLeg({
    required this.id,
    required this.name,
    required this.baseCity,
    required this.country,
    this.state,
    required this.startDate,
    required this.endDate,
    this.arrivalTime,
    this.departureTime,
    this.dayTripAreas = const [],
    this.hotelName,
    this.hotelAddress,
    this.hotelCoordinates,
    this.order = 0,
    this.vehicleRentalSuggestions = const [],
    this.destinationBrief,
  });

  final String id;
  final String name;
  final String baseCity;
  final String country;
  final String? state;
  final String startDate;
  final String endDate;
  final String? arrivalTime;
  final String? departureTime;
  final List<String> dayTripAreas;
  final String? hotelName;
  final String? hotelAddress;
  final Map<String, double>? hotelCoordinates;
  final int order;
  final List<VehicleRental> vehicleRentalSuggestions;
  final DestinationBrief? destinationBrief;

  factory TripLeg.fromJson(Map<String, dynamic> json) {
    final coords = json['hotelCoordinates'] as Map<String, dynamic>?;
    return TripLeg(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      baseCity: json['baseCity'] as String? ?? '',
      country: json['country'] as String? ?? '',
      state: json['state'] as String?,
      startDate: json['startDate']?.toString() ?? '',
      endDate: json['endDate']?.toString() ?? '',
      arrivalTime: json['arrivalTime'] as String?,
      departureTime: json['departureTime'] as String?,
      dayTripAreas: (json['dayTripAreas'] as List<dynamic>?)?.cast<String>() ?? [],
      hotelName: json['hotelName'] as String?,
      hotelAddress: json['hotelAddress'] as String?,
      hotelCoordinates: coords != null
          ? {'lat': (coords['lat'] as num).toDouble(), 'lng': (coords['lng'] as num).toDouble()}
          : null,
      order: json['order'] as int? ?? 0,
      vehicleRentalSuggestions: (json['vehicleRentalSuggestions'] as List<dynamic>? ?? [])
          .map((v) => VehicleRental.fromJson(v as Map<String, dynamic>))
          .toList(),
      destinationBrief: json['destinationBrief'] != null
          ? DestinationBrief.fromJson(json['destinationBrief'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'baseCity': baseCity,
        'country': country,
        if (state != null) 'state': state,
        'startDate': startDate.split('T').first,
        'endDate': endDate.split('T').first,
        if (arrivalTime != null) 'arrivalTime': arrivalTime,
        if (departureTime != null) 'departureTime': departureTime,
        'dayTripAreas': dayTripAreas,
        if (hotelName != null) 'hotelName': hotelName,
        if (hotelAddress != null) 'hotelAddress': hotelAddress,
        if (hotelCoordinates != null) 'hotelCoordinates': hotelCoordinates,
        'order': order,
        'discoveryPoolIds': [],
        'foodPoolIds': [],
        'marketPoolIds': [],
        'vehicleRentalSuggestions': [],
      };
}

class VehicleRental {
  VehicleRental({
    required this.name,
    this.googlePlaceId,
    this.address,
    this.rating,
    this.distanceKm,
    this.googleMapsUrl,
  });

  final String name;
  final String? googlePlaceId;
  final String? address;
  final double? rating;
  final double? distanceKm;
  final String? googleMapsUrl;

  factory VehicleRental.fromJson(Map<String, dynamic> json) => VehicleRental(
        name: json['name'] as String? ?? '',
        googlePlaceId: json['googlePlaceId'] as String?,
        address: json['address'] as String?,
        rating: (json['rating'] as num?)?.toDouble(),
        distanceKm: (json['distanceKm'] as num?)?.toDouble(),
        googleMapsUrl: json['googleMapsUrl'] as String?,
      );
}

class DestinationBrief {
  DestinationBrief({
    this.specialties = const [],
    this.localFood = const [],
    this.generalTips = const [],
  });

  final List<String> specialties;
  final List<String> localFood;
  final List<String> generalTips;

  factory DestinationBrief.fromJson(Map<String, dynamic> json) => DestinationBrief(
        specialties: (json['specialties'] as List<dynamic>?)?.cast<String>() ?? [],
        localFood: (json['localFood'] as List<dynamic>?)?.cast<String>() ?? [],
        generalTips: (json['generalTips'] as List<dynamic>?)?.cast<String>() ?? [],
      );
}

class OwnerApiKeys {
  OwnerApiKeys({required this.hasOpenaiKey, required this.hasGoogleMapsKey});
  final bool hasOpenaiKey;
  final bool hasGoogleMapsKey;
  factory OwnerApiKeys.fromJson(Map<String, dynamic> json) => OwnerApiKeys(
        hasOpenaiKey: json['hasOpenaiKey'] as bool? ?? false,
        hasGoogleMapsKey: json['hasGoogleMapsKey'] as bool? ?? false,
      );
}

class Place {
  Place({
    required this.name,
    this.googlePlaceId,
    this.city,
    this.state,
    this.country,
    this.category,
    this.subCategory,
    this.rating,
    this.userRatingCount,
    this.coordinates,
    this.description,
    this.formattedAddress,
    this.openingTime,
    this.closingTime,
    this.photoUrls,
    this.photoNames,
    this.websiteUri,
    this.googleMapsUri,
    this.weekdayDescriptions,
  });

  final String name;
  final String? googlePlaceId;
  final String? city;
  final String? state;
  final String? country;
  final String? category;
  final String? subCategory;
  final double? rating;
  final int? userRatingCount;
  final Map<String, double>? coordinates;
  final String? description;
  final String? formattedAddress;
  final String? openingTime;
  final String? closingTime;
  final List<String>? photoUrls;
  final List<String>? photoNames;
  final String? websiteUri;
  final String? googleMapsUri;
  final List<String>? weekdayDescriptions;

  factory Place.fromJson(Map<String, dynamic> json) {
    final coords = json['coordinates'] as Map<String, dynamic>?;
    return Place(
      name: json['name'] as String? ?? '',
      googlePlaceId: json['googlePlaceId'] as String?,
      city: json['city'] as String?,
      state: json['state'] as String?,
      country: json['country'] as String?,
      category: json['category'] as String?,
      subCategory: json['subCategory'] as String?,
      rating: (json['rating'] as num?)?.toDouble(),
      userRatingCount: json['userRatingCount'] as int?,
      coordinates: coords != null
          ? {'lat': (coords['lat'] as num).toDouble(), 'lng': (coords['lng'] as num).toDouble()}
          : null,
      description: json['description'] as String?,
      formattedAddress: json['formattedAddress'] as String?,
      openingTime: json['openingTime'] as String?,
      closingTime: json['closingTime'] as String?,
      photoUrls: (json['photoUrls'] as List<dynamic>?)?.cast<String>(),
      photoNames: (json['photoNames'] as List<dynamic>?)?.cast<String>(),
      websiteUri: json['websiteUri'] as String?,
      googleMapsUri: json['googleMapsUri'] as String?,
      weekdayDescriptions: (json['weekdayDescriptions'] as List<dynamic>?)?.cast<String>(),
    );
  }

  bool get isFood => category?.toLowerCase() == 'food' || (category?.toLowerCase().contains('food') ?? false);
  bool get isMarket => category?.toLowerCase() == 'shopping' || subCategory?.toLowerCase().contains('market') == true;
}

class PlaceSearchResult {
  PlaceSearchResult({
    required this.googlePlaceId,
    required this.name,
    this.address,
    this.rating,
  });

  final String googlePlaceId;
  final String name;
  final String? address;
  final double? rating;

  factory PlaceSearchResult.fromJson(Map<String, dynamic> json) => PlaceSearchResult(
        googlePlaceId: json['googlePlaceId'] as String,
        name: json['name'] as String,
        address: json['address'] as String?,
        rating: (json['rating'] as num?)?.toDouble(),
      );
}

class TripMember {
  TripMember({required this.id, required this.name, required this.email, required this.role});
  final String id;
  final String name;
  final String email;
  final String role;
  factory TripMember.fromJson(Map<String, dynamic> json) => TripMember(
        id: json['id'] as String,
        name: json['name'] as String,
        email: json['email'] as String,
        role: json['role'] as String,
      );
}

class VisitIntel {
  VisitIntel({this.hypeLevel, this.bestTimeToVisit, this.summary});
  final String? hypeLevel;
  final String? bestTimeToVisit;
  final String? summary;
  factory VisitIntel.fromJson(Map<String, dynamic>? json) {
    if (json == null) return VisitIntel();
    return VisitIntel(
      hypeLevel: json['hypeLevel'] as String?,
      bestTimeToVisit: json['bestTimeToVisit'] as String?,
      summary: json['summary'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'hypeLevel': hypeLevel,
        'bestTimeToVisit': bestTimeToVisit,
        'summary': summary,
      };
}

class ItineraryDay {
  ItineraryDay({required this.dayNumber, required this.stops, this.date});
  final int dayNumber;
  final List<ItineraryStop> stops;
  final String? date;
  factory ItineraryDay.fromJson(Map<String, dynamic> json) {
    final stops = (json['stops'] as List<dynamic>? ?? [])
        .map((s) => ItineraryStop.fromJson(s as Map<String, dynamic>))
        .toList();
    return ItineraryDay(
      dayNumber: json['dayNumber'] as int? ?? 0,
      stops: stops,
      date: json['date'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'dayNumber': dayNumber,
        'stops': stops.map((s) => s.toJson()).toList(),
        'date': date,
      };
}

class ItineraryStop {
  ItineraryStop({
    required this.id,
    required this.name,
    this.startTime,
    this.endTime,
    this.coordinates,
    this.category,
    this.stopType,
    this.aiNotes,
    this.visitIntel,
    this.travelMinutesFromPrevious,
  });

  final String id;
  final String name;
  final String? startTime;
  final String? endTime;
  final Map<String, double>? coordinates;
  final String? category;
  final String? stopType;
  final String? aiNotes;
  final VisitIntel? visitIntel;
  final int? travelMinutesFromPrevious;

  bool get isFood => stopType == 'food' || category?.toLowerCase() == 'food';
  bool get isMarket => stopType == 'market' || category?.toLowerCase() == 'shopping';

  factory ItineraryStop.fromJson(Map<String, dynamic> json) {
    final coords = json['coordinates'] as Map<String, dynamic>?;
    return ItineraryStop(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      startTime: json['startTime'] as String?,
      endTime: json['endTime'] as String?,
      coordinates: coords != null
          ? {'lat': (coords['lat'] as num).toDouble(), 'lng': (coords['lng'] as num).toDouble()}
          : null,
      category: json['category'] as String?,
      stopType: json['stopType'] as String?,
      aiNotes: json['aiNotes'] as String?,
      visitIntel: json['visitIntel'] != null
          ? VisitIntel.fromJson(json['visitIntel'] as Map<String, dynamic>)
          : null,
      travelMinutesFromPrevious: json['travelMinutesFromPrevious'] as int?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'startTime': startTime,
        'endTime': endTime,
        'coordinates': coordinates != null ? {'lat': coordinates!['lat'], 'lng': coordinates!['lng']} : null,
        'category': category,
        'stopType': stopType,
        'aiNotes': aiNotes,
        'visitIntel': visitIntel?.toJson(),
        'travelMinutesFromPrevious': travelMinutesFromPrevious,
      };
}

class Itinerary {
  Itinerary({required this.days, this.summary});
  final List<ItineraryDay> days;
  final String? summary;
  factory Itinerary.fromJson(Map<String, dynamic> json) {
    final days = (json['days'] as List<dynamic>? ?? [])
        .map((d) => ItineraryDay.fromJson(d as Map<String, dynamic>))
        .toList();
    return Itinerary(days: days, summary: json['summary'] as String?);
  }

  Map<String, dynamic> toJson() => {
        'days': days.map((d) => d.toJson()).toList(),
        'summary': summary,
      };
}

class AppNotification {
  AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.read,
    this.tripId,
  });
  final String id;
  final String title;
  final String message;
  final bool read;
  final String? tripId;
  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: json['id'] as String,
        title: json['title'] as String,
        message: json['message'] as String,
        read: json['read'] as bool? ?? false,
        tripId: json['tripId'] as String?,
      );
}

class TripStats {
  TripStats({
    required this.totalTrips,
    required this.upcomingTrips,
    required this.completedTrips,
    required this.archivedTrips,
  });
  final int totalTrips;
  final int upcomingTrips;
  final int completedTrips;
  final int archivedTrips;

  static TripStats fromTrips(List<Trip> trips) {
    final now = DateTime.now();
    var upcoming = 0, completed = 0, archived = 0;
    for (final t in trips) {
      if (t.status == 'archived') {
        archived++;
        continue;
      }
      if (t.status == 'completed') {
        completed++;
        continue;
      }
      final end = DateTime.tryParse(t.endDate.split('T').first);
      if (end != null && end.isBefore(now)) {
        completed++;
      } else {
        upcoming++;
      }
    }
    return TripStats(
      totalTrips: trips.length,
      upcomingTrips: upcoming,
      completedTrips: completed,
      archivedTrips: archived,
    );
  }
}
