import { format, parseISO } from "date-fns";
import type { ItineraryDay } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";

function formatDayDate(date: string): string {
  try {
    return format(parseISO(date), "EEEE, MMM d");
  } catch {
    return date;
  }
}

export function generateRuleBasedSummary(trip: Trip, days: ItineraryDay[]): string {
  const totalStops = days.reduce((sum, d) => sum + d.stops.length, 0);
  const destination = [
    trip.destinationCity,
    trip.destinationState,
    trip.destinationCountry,
  ]
    .filter(Boolean)
    .join(", ");

  const intro = `Your ${days.length}-day ${trip.travelStyle.toLowerCase()} trip to ${destination} covers ${totalStops} attraction${totalStops !== 1 ? "s" : ""}.`;

  const interestNote =
    trip.interests.length > 0
      ? ` The itinerary focuses on ${trip.interests.slice(0, 3).join(", ")}${trip.interests.length > 3 ? ", and more" : ""}.`
      : "";

  const dayHighlights = days
    .filter((d) => d.stops.length > 0)
    .map((day) => {
      const names = day.stops.map((s) => s.placeName);
      const preview =
        names.length <= 3
          ? names.join(", ")
          : `${names.slice(0, 2).join(", ")}, and ${names.length - 2} more`;
      return `On ${formatDayDate(day.date)}, you'll visit ${preview}.`;
    })
    .join(" ");

  const transportNote = `Travel between stops is estimated for ${trip.transportationMode.toLowerCase()}, with daily hours from ${trip.dailyStartTime} to ${trip.dailyEndTime}.`;

  return [intro + interestNote, dayHighlights, transportNote].filter(Boolean).join("\n\n");
}
