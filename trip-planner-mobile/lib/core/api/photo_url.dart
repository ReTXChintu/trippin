import 'package:itinerary_planner/core/config/api_config.dart';

String placePhotoUrl(String photoName, {String? tripId, int maxHeightPx = 400}) {
  final base = ApiConfig.baseUrl.replaceAll('/api/v1', '');
  final params = 'name=${Uri.encodeComponent(photoName)}&maxHeightPx=$maxHeightPx';
  final trip = tripId != null ? '&tripId=${Uri.encodeComponent(tripId)}' : '';
  return '$base/api/v1/places/photo?$params$trip';
}
