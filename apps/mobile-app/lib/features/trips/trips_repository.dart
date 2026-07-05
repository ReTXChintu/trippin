import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:itinerary_planner/core/api/api_client.dart';
import 'package:itinerary_planner/features/auth/auth_provider.dart';
import 'package:itinerary_planner/features/auth/models/auth_models.dart';
import 'package:itinerary_planner/features/trips/models/trip_models.dart';

class TripsRepository {
  TripsRepository(this._api);
  final ApiClient _api;

  Future<List<Trip>> listTrips({String? status}) async {
    final json = await _api.getJson('/trips', query: status != null ? {'status': status} : null);
    return _api.unwrapList(json, 'trips', Trip.fromJson);
  }

  Future<Trip> getTrip(String id) async {
    final json = await _api.getJson('/trips/$id');
    return _api.unwrapData(json, (data) => Trip.fromJson(data['trip'] as Map<String, dynamic>));
  }

  Future<Trip> createTrip(Map<String, dynamic> body) async {
    final json = await _api.postJson('/trips', body: body);
    return _api.unwrapData(json, (data) => Trip.fromJson(data['trip'] as Map<String, dynamic>));
  }

  Future<Trip> updateTrip(String id, Map<String, dynamic> body) async {
    final json = await _api.patchJson('/trips/$id', body: body);
    return _api.unwrapData(json, (data) => Trip.fromJson(data['trip'] as Map<String, dynamic>));
  }

  Future<void> deleteTrip(String id) async {
    final json = await _api.deleteJson('/trips/$id');
    if (json['success'] != true) throw ApiException(json['error']?.toString() ?? 'Delete failed');
  }

  Future<Trip> duplicateTrip(String id) async {
    final json = await _api.postJson('/trips/$id/duplicate');
    return _api.unwrapData(json, (data) => Trip.fromJson(data['trip'] as Map<String, dynamic>));
  }

  Future<Trip> archiveTrip(String id) async {
    final json = await _api.postJson('/trips/$id/archive');
    return _api.unwrapData(json, (data) => Trip.fromJson(data['trip'] as Map<String, dynamic>));
  }

  Future<({Trip trip, double confidence})> generateFromPrompt(String prompt) async {
    final json = await _api.postJson('/trips/generate-from-prompt', body: {'prompt': prompt});
    return _api.unwrapData(json, (data) => (
          trip: Trip.fromJson(data['trip'] as Map<String, dynamic>),
          confidence: (data['confidence'] as num?)?.toDouble() ?? 0,
        ));
  }

  Future<List<Place>> discoverPlaces(String tripId, {bool forceRefresh = false, String? legId}) async {
    final json = await _api.postJson('/trips/$tripId/places/discover', body: {
      'forceRefresh': forceRefresh,
      if (legId != null) 'legId': legId,
    });
    return _api.unwrapList(json, 'places', Place.fromJson);
  }

  Future<List<Place>> getSelectedPlaces(String tripId) async {
    final json = await _api.getJson('/trips/$tripId/places');
    return _api.unwrapList(json, 'places', Place.fromJson);
  }

  Future<List<Place>> getDiscoveryPool(String tripId) async {
    final json = await _api.getJson('/trips/$tripId/places', query: {'view': 'pool'});
    return _api.unwrapList(json, 'places', Place.fromJson);
  }

  Future<void> addPlace(String tripId, String placeId) async {
    final json = await _api.postJson('/trips/$tripId/places', body: {'placeId': placeId});
    if (json['success'] != true) throw ApiException(json['error']?.toString() ?? 'Failed to add place');
  }

  Future<void> bulkAddPlaces(String tripId, List<String> placeIds) async {
    final json = await _api.postJson('/trips/$tripId/places', body: {'action': 'bulkAdd', 'placeIds': placeIds});
    if (json['success'] != true) throw ApiException(json['error']?.toString() ?? 'Failed');
  }

  Future<void> removePlace(String tripId, String placeId) async {
    final json = await _api.deleteJson('/trips/$tripId/places', query: {'placeId': placeId});
    if (json['success'] != true) throw ApiException(json['error']?.toString() ?? 'Failed to remove place');
  }

  Future<void> bulkRemovePlaces(String tripId, List<String> placeIds) async {
    final json = await _api.deleteJson('/trips/$tripId/places', query: {'placeIds': placeIds.join(',')});
    if (json['success'] != true) throw ApiException(json['error']?.toString() ?? 'Failed');
  }

  Future<List<PlaceSearchResult>> searchPlaces(String query, {String? city, String? country, String type = 'places'}) async {
    final json = await _api.getJson('/places/search', query: {
      'query': query,
      if (city != null) 'city': city,
      if (country != null) 'country': country,
      'type': type,
    });
    return _api.unwrapList(json, 'results', PlaceSearchResult.fromJson);
  }

  Future<Place> getPlaceDetailRich(String tripId, String placeId) async {
    final json = await _api.postJson('/places/search', body: {'tripId': tripId, 'placeId': placeId});
    return _api.unwrapData(json, (data) => Place.fromJson(data['place'] as Map<String, dynamic>));
  }

  Future<Itinerary?> getItinerary(String tripId) async {
    final json = await _api.getJson('/trips/$tripId/itinerary');
    if (json['success'] != true) return null;
    final data = json['data'] as Map<String, dynamic>?;
    final itineraryJson = data?['itinerary'] as Map<String, dynamic>?;
    return itineraryJson != null ? Itinerary.fromJson(itineraryJson) : null;
  }

  Future<Itinerary> _itineraryAction(String tripId, String action, [Map<String, dynamic>? extra]) async {
    final json = await _api.postJson('/trips/$tripId/itinerary', body: {'action': action, ...?extra});
    return _api.unwrapData(json, (data) => Itinerary.fromJson(data['itinerary'] as Map<String, dynamic>));
  }

  Future<Itinerary> generateItinerary(String tripId) => _itineraryAction(tripId, 'generate');
  Future<Itinerary> summarizeItinerary(String tripId) => _itineraryAction(tripId, 'summarize');
  Future<Itinerary> optimizeItinerary(String tripId) => _itineraryAction(tripId, 'optimize');
  Future<Itinerary> enrichItinerary(String tripId) => _itineraryAction(tripId, 'enrich');
  Future<Itinerary> reorderStops(String tripId, int dayNumber, List<String> stopIds) =>
      _itineraryAction(tripId, 'reorder', {'dayNumber': dayNumber, 'stopIds': stopIds});

  Future<List<TripMember>> getMembers(String tripId) async {
    final json = await _api.getJson('/trips/$tripId/members');
    return _api.unwrapList(json, 'members', TripMember.fromJson);
  }

  Future<List<TripMember>> addMember(String tripId, String email) async {
    final json = await _api.postJson('/trips/$tripId/members', body: {'email': email});
    return _api.unwrapList(json, 'members', TripMember.fromJson);
  }

  Future<List<TripMember>> removeMember(String tripId, String memberUserId) async {
    final json = await _api.deleteJson('/trips/$tripId/members', query: {'memberUserId': memberUserId});
    return _api.unwrapList(json, 'members', TripMember.fromJson);
  }

  Future<void> leaveTrip(String tripId) async {
    final json = await _api.postJson('/trips/$tripId/leave');
    if (json['success'] != true) throw ApiException(json['error']?.toString() ?? 'Failed to leave trip');
  }

  Future<String> shareTrip(String tripId) async {
    final json = await _api.postJson('/trips/$tripId/share');
    return _api.unwrapData(json, (data) => data['shareUrl'] as String);
  }

  Future<Trip> unshareTrip(String tripId) async {
    final json = await _api.deleteJson('/trips/$tripId/share');
    return _api.unwrapData(json, (data) => Trip.fromJson(data['trip'] as Map<String, dynamic>));
  }

  Future<({Trip trip, Itinerary? itinerary})> getPublicShare(String slug) async {
    final json = await _api.getJson('/share/$slug');
    return _api.unwrapData(json, (data) => (
          trip: Trip.fromJson(data['trip'] as Map<String, dynamic>),
          itinerary: data['itinerary'] != null
              ? Itinerary.fromJson(data['itinerary'] as Map<String, dynamic>)
              : null,
        ));
  }
}

class ProfileRepository {
  ProfileRepository(this._api);
  final ApiClient _api;

  Future<UserProfile> getProfile() async {
    final json = await _api.getJson('/profile');
    return _api.unwrapData(json, (data) => UserProfile.fromJson(data['profile'] as Map<String, dynamic>));
  }

  Future<UserProfile> updateProfile({required String name, String? avatar}) async {
    final json = await _api.patchJson('/profile', body: {
      'name': name,
      if (avatar != null && avatar.isNotEmpty) 'avatar': avatar,
    });
    return _api.unwrapData(json, (data) => UserProfile.fromJson(data['profile'] as Map<String, dynamic>));
  }

  Future<UserProfile> updateApiKeys({
    String? openaiApiKey,
    String? googleMapsApiKey,
    bool clearOpenai = false,
    bool clearGoogleMaps = false,
  }) async {
    final json = await _api.putJson('/profile/api-keys', body: {
      if (openaiApiKey != null) 'openaiApiKey': openaiApiKey,
      if (googleMapsApiKey != null) 'googleMapsApiKey': googleMapsApiKey,
      'clearOpenai': clearOpenai,
      'clearGoogleMaps': clearGoogleMaps,
    });
    return _api.unwrapData(json, (data) => UserProfile.fromJson(data['profile'] as Map<String, dynamic>));
  }
}

class NotificationsRepository {
  NotificationsRepository(this._api);
  final ApiClient _api;

  Future<({List<AppNotification> notifications, int unreadCount})> list() async {
    final json = await _api.getJson('/notifications');
    if (json['success'] != true) throw ApiException(json['error']?.toString() ?? 'Failed');
    final data = json['data'] as Map<String, dynamic>;
    final list = (data['notifications'] as List<dynamic>)
        .map((n) => AppNotification.fromJson(n as Map<String, dynamic>))
        .toList();
    return (notifications: list, unreadCount: data['unreadCount'] as int? ?? 0);
  }

  Future<void> markRead(String id) async {
    final json = await _api.postJson('/notifications/$id/read');
    if (json['success'] != true) throw ApiException(json['error']?.toString() ?? 'Failed');
  }

  Future<void> markAllRead() async {
    final json = await _api.postJson('/notifications');
    if (json['success'] != true) throw ApiException(json['error']?.toString() ?? 'Failed');
  }
}

final tripsRepositoryProvider = Provider((ref) => TripsRepository(ref.watch(apiClientProvider)));
final profileRepositoryProvider = Provider((ref) => ProfileRepository(ref.watch(apiClientProvider)));
final notificationsRepositoryProvider = Provider((ref) => NotificationsRepository(ref.watch(apiClientProvider)));

class UnreadNotificationsNotifier extends StateNotifier<int> {
  UnreadNotificationsNotifier(this._repo) : super(0) {
    refresh();
  }
  final NotificationsRepository _repo;

  Future<void> refresh() async {
    try {
      final result = await _repo.list();
      state = result.unreadCount;
    } catch (_) {}
  }
}

final unreadNotificationsProvider =
    StateNotifierProvider<UnreadNotificationsNotifier, int>((ref) {
  return UnreadNotificationsNotifier(ref.watch(notificationsRepositoryProvider));
});
