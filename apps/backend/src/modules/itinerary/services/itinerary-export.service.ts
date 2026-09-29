import { format, parseISO } from "date-fns";
import type { Itinerary, ItineraryDay } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";

function formatTripDate(date: string): string {
  try {
    return format(parseISO(date), "MMM d, yyyy");
  } catch {
    return date;
  }
}

function formatDayDate(date: string): string {
  try {
    return format(parseISO(date), "EEEE, MMM d, yyyy");
  } catch {
    return date;
  }
}

function formatDaySection(day: ItineraryDay, style: "markdown" | "text"): string {
  const header =
    style === "markdown"
      ? `## Day ${day.dayNumber} — ${formatDayDate(day.date)}\n`
      : `Day ${day.dayNumber} — ${formatDayDate(day.date)}\n${"=".repeat(40)}\n`;

  if (day.stops.length === 0) {
    return header + (style === "markdown" ? "*No stops scheduled*\n" : "No stops scheduled\n");
  }

  const lines = day.stops.map((stop, index) => {
    const travel =
      stop.travelDurationMinutes > 0 ? ` (${stop.travelDurationMinutes} min travel)` : "";
    if (style === "markdown") {
      return `${index + 1}. **${stop.placeName}** — ${stop.arrivalTime}–${stop.departureTime} (${stop.visitDurationMinutes} min)${travel}`;
    }
    return `${index + 1}. ${stop.placeName}\n   ${stop.arrivalTime} – ${stop.departureTime} | ${stop.visitDurationMinutes} min visit${travel}`;
  });

  return header + lines.join("\n") + "\n";
}

export function formatItineraryAsMarkdown(trip: Trip, itinerary: Itinerary): string {
  const destination = [
    trip.destinationCity,
    trip.destinationState,
    trip.destinationCountry,
  ]
    .filter(Boolean)
    .join(", ");

  const lines = [
    `# ${trip.title}`,
    "",
    `**Destination:** ${destination}`,
    `**Dates:** ${formatTripDate(trip.startDate)} – ${formatTripDate(trip.endDate)}`,
    `**Style:** ${trip.travelStyle} · **Transport:** ${trip.transportationMode}`,
    `**Daily hours:** ${trip.dailyStartTime} – ${trip.dailyEndTime}`,
  ];

  if (trip.hotelName) {
    lines.push(`**Stay:** ${trip.hotelName}`);
  }

  if (itinerary.summary) {
    lines.push("", "## Trip Summary", "", itinerary.summary);
  }

  lines.push("", "## Daily Itinerary", "");

  for (const day of itinerary.days) {
    lines.push(formatDaySection(day, "markdown"));
  }

  lines.push(
    "",
    "---",
    `_Generated ${formatTripDate(itinerary.generatedAt)} · Trippin_`,
  );

  return lines.join("\n");
}

export function formatItineraryAsText(trip: Trip, itinerary: Itinerary): string {
  const destination = [
    trip.destinationCity,
    trip.destinationState,
    trip.destinationCountry,
  ]
    .filter(Boolean)
    .join(", ");

  const lines = [
    trip.title.toUpperCase(),
    "=".repeat(trip.title.length),
    "",
    `Destination: ${destination}`,
    `Dates: ${formatTripDate(trip.startDate)} – ${formatTripDate(trip.endDate)}`,
    `Style: ${trip.travelStyle} | Transport: ${trip.transportationMode}`,
    `Daily hours: ${trip.dailyStartTime} – ${trip.dailyEndTime}`,
  ];

  if (trip.hotelName) {
    lines.push(`Stay: ${trip.hotelName}`);
  }

  if (itinerary.summary) {
    lines.push("", "TRIP SUMMARY", "-".repeat(12), itinerary.summary);
  }

  lines.push("", "DAILY ITINERARY", "");

  for (const day of itinerary.days) {
    lines.push(formatDaySection(day, "text"));
  }

  return lines.join("\n");
}

export function getItineraryExportFilename(trip: Trip, extension: "md" | "txt"): string {
  const slug = trip.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${slug || "itinerary"}.${extension}`;
}
