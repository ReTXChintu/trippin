import 'package:itinerary_planner/features/trips/models/trip_models.dart';

enum PlaceSort { rating, name, distance }

class PlaceFilterState {
  PlaceFilterState({
    this.minRating = 0,
    this.sort = PlaceSort.rating,
    this.nameQuery = '',
    this.categories = const {},
  });

  final double minRating;
  final PlaceSort sort;
  final String nameQuery;
  final Set<String> categories;

  PlaceFilterState copyWith({
    double? minRating,
    PlaceSort? sort,
    String? nameQuery,
    Set<String>? categories,
  }) =>
      PlaceFilterState(
        minRating: minRating ?? this.minRating,
        sort: sort ?? this.sort,
        nameQuery: nameQuery ?? this.nameQuery,
        categories: categories ?? this.categories,
      );
}

List<Place> filterPlaces(
  List<Place> places, {
  required PlaceFilterState filter,
  Map<String, double>? hotelCoordinates,
}) {
  var result = places.where((p) {
    if (filter.minRating > 0 && (p.rating ?? 0) < filter.minRating) return false;
    if (filter.nameQuery.isNotEmpty &&
        !p.name.toLowerCase().contains(filter.nameQuery.toLowerCase())) {
      return false;
    }
    if (filter.categories.isNotEmpty &&
        !filter.categories.contains(p.category ?? 'Other')) {
      return false;
    }
    return true;
  }).toList();

  switch (filter.sort) {
    case PlaceSort.rating:
      result.sort((a, b) => (b.rating ?? 0).compareTo(a.rating ?? 0));
    case PlaceSort.name:
      result.sort((a, b) => a.name.compareTo(b.name));
    case PlaceSort.distance:
      if (hotelCoordinates != null) {
        result.sort((a, b) {
          final da = _dist(hotelCoordinates, a.coordinates);
          final db = _dist(hotelCoordinates, b.coordinates);
          return da.compareTo(db);
        });
      }
  }
  return result;
}

double _dist(Map<String, double> from, Map<String, double>? to) {
  if (to == null) return double.infinity;
  final dlat = from['lat']! - to['lat']!;
  final dlng = from['lng']! - to['lng']!;
  return dlat * dlat + dlng * dlng;
}

Set<String> extractCategories(List<Place> places) {
  return places.map((p) => p.category ?? 'Other').toSet();
}
