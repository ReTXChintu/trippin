import type { Itinerary } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";

/** RFC 5545 text escaping: backslash, semicolon, comma and newlines. */
function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds lines longer than 75 octets (continuation lines start with a space). */
function icsFold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 73) parts.push((i === 0 ? "" : " ") + line.slice(i, i + 73));
  return parts.join("\r\n");
}

/** "Floating" local time — shows at that wall-clock time wherever the phone is, which matches a
 * trip planned in the destination's local time. */
function icsDateTime(date: string, time: string): string {
  return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
}

function addMinutes(date: string, time: string, minutes: number): { date: string; time: string } {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.floor(total / 1440));
  const mins = ((total % 1440) + 1440) % 1440;
  return {
    date: d.toISOString().slice(0, 10),
    time: `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`,
  };
}

/** Every planned stop, chosen meal and timed booking as calendar events. */
export function formatItineraryAsIcs(trip: Trip, itinerary: Itinerary): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Trippin//Itinerary//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${icsEscape(trip.title)}`,
  ];

  const event = (uid: string, title: string, date: string, start: string, end: { date: string; time: string }, extra: string[] = []) => {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}@trippin`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDateTime(date, start)}`,
      `DTEND:${icsDateTime(end.date, end.time)}`,
      icsFold(`SUMMARY:${icsEscape(title)}`),
      ...extra.map(icsFold),
      "END:VEVENT",
    );
  };

  for (const day of itinerary.days) {
    for (const stop of day.stops) {
      if (stop.stopType === "return" || stop.status === "skipped") continue;
      if (stop.stopType === "meal" && !stop.placeId && !stop.fixedStartTime) continue; // empty meal slots
      const extra: string[] = [];
      if (stop.coordinates) {
        extra.push(`LOCATION:${icsEscape(stop.placeName)}`);
        extra.push(`GEO:${stop.coordinates.lat};${stop.coordinates.lng}`);
        extra.push(`URL:https://www.google.com/maps/search/?api=1&query=${stop.coordinates.lat},${stop.coordinates.lng}`);
      }
      const notes = [stop.notes, stop.aiNotes, stop.openingHoursToday && `Open ${stop.openingHoursToday}`].filter(Boolean).join("\n");
      if (notes) extra.push(`DESCRIPTION:${icsEscape(notes)}`);
      const end = addMinutes(day.date, stop.arrivalTime, Math.max(stop.visitDurationMinutes, 15));
      event(`${itinerary.id}-${stop.id}`, stop.placeName, day.date, stop.arrivalTime, end, extra);
    }
  }

  const inPlan = new Set(itinerary.days.flatMap((d) => d.stops.map((s) => s.placeName)));
  for (const booking of trip.bookings ?? []) {
    if (!booking.startTime || booking.transferId || inPlan.has(booking.title)) continue;
    const end = booking.endTime
      ? { date: booking.endDate ?? booking.startDate, time: booking.endTime }
      : addMinutes(booking.startDate, booking.startTime, 60);
    const details = [booking.provider, booking.confirmationNumber && `Confirmation: ${booking.confirmationNumber}`, booking.notes]
      .filter(Boolean)
      .join("\n");
    event(
      `${trip.id}-booking-${booking.id}`,
      booking.title,
      booking.startDate,
      booking.startTime,
      end,
      details ? [`DESCRIPTION:${icsEscape(details)}`] : [],
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
