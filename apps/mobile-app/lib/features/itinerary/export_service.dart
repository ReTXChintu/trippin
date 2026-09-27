import 'package:share_plus/share_plus.dart';
import 'package:itinerary_planner/features/trips/models/trip_models.dart';

class ItineraryExportService {
  static String toMarkdown(Trip trip, Itinerary itinerary) {
    final buf = StringBuffer('# ${trip.title}\n\n');
    if (itinerary.summary != null) {
      buf.writeln('${itinerary.summary}\n');
    }
    buf.writeln('${trip.destinationCity}, ${trip.destinationCountry}');
    buf.writeln('${trip.startDate.split('T').first} – ${trip.endDate.split('T').first}\n');
    for (final day in itinerary.days) {
      if (day.stops.isEmpty) continue;
      buf.writeln('## Day ${day.dayNumber}');
      for (final stop in day.stops) {
        final time = stop.startTime != null ? ' (${stop.startTime})' : '';
        buf.writeln('- ${stop.name}$time');
        if (stop.aiNotes != null) buf.writeln('  ${stop.aiNotes}');
      }
      buf.writeln();
    }
    return buf.toString();
  }

  static String toPlainText(Trip trip, Itinerary itinerary) =>
      toMarkdown(trip, itinerary).replaceAll('#', '').replaceAll('*', '');

  static Future<void> share(Trip trip, Itinerary itinerary) async {
    await SharePlus.instance.share(
      ShareParams(text: toMarkdown(trip, itinerary), subject: trip.title),
    );
  }
}
