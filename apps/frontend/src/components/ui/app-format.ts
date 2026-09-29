/** Date, route and status labels for trips — shared by the app & public pages. */
import { differenceInCalendarDays, format, isSameMonth, isSameYear, parseISO } from "date-fns";
import type { Tone } from "@/components/ui";
import type { Trip } from "@/modules/trips/types/trip.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";

// ---------------------------------------------------------------------------------------------
// Dates & trip labels

function safeParse(date: string | undefined | null): Date | null {
  if (!date) return null;
  try {
    const d = parseISO(date.slice(0, 10));
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** "5–11 Oct", "28 Sep – 3 Oct", "28 Dec 2026 – 3 Jan 2027" (year only when asked or it changes). */
export function formatDateRange(start: string, end: string, withYear = false): string {
  const s = safeParse(start);
  const e = safeParse(end);
  if (!s || !e) return "";
  const crossYear = !isSameYear(s, e);
  if (crossYear) return `${format(s, "d MMM yyyy")} – ${format(e, "d MMM yyyy")}`;
  const y = withYear ? ` ${format(e, "yyyy")}` : "";
  if (s.getTime() === e.getTime()) return `${format(s, "d MMM")}${y}`;
  if (isSameMonth(s, e)) return `${format(s, "d")}–${format(e, "d MMM")}${y}`;
  return `${format(s, "d MMM")} – ${format(e, "d MMM")}${y}`;
}

export function tripDayCount(trip: Pick<Trip, "startDate" | "endDate">): number {
  const s = safeParse(trip.startDate);
  const e = safeParse(trip.endDate);
  if (!s || !e) return 0;
  return differenceInCalendarDays(e, s) + 1;
}

/** "Jaipur → Udaipur", "Kyoto · Osaka · Nara", or the destination city for single-city trips. */
export function tripRouteLabel(trip: Trip): string {
  const cities = getEffectiveLegs(trip)
    .map((l) => l.baseCity || l.name)
    .filter(Boolean);
  const unique = cities.filter((c, i) => cities.indexOf(c) === i);
  if (unique.length === 0) return trip.destinationCity || trip.destinationCountry || "";
  if (unique.length === 2) return `${unique[0]} → ${unique[1]}`;
  return unique.join(" · ");
}

export interface TripStatusInfo {
  label: string;
  tone: Tone;
  /** 0 = on the trip now, 1 = upcoming, 2 = draft, 3 = finished, 4 = archived. */
  order: number;
}

/** What to call a trip's status on cards: on the trip today, upcoming, draft, completed, archived. */
export function tripStatusInfo(trip: Trip, today = new Date()): TripStatusInfo {
  if (trip.status === "archived") return { label: "Archived", tone: "neutral", order: 4 };
  if (trip.status === "completed") return { label: "Completed", tone: "neutral", order: 3 };
  const s = safeParse(trip.startDate);
  const e = safeParse(trip.endDate);
  const onTrip = s && e && differenceInCalendarDays(today, s) >= 0 && differenceInCalendarDays(e, today) >= 0;
  if (trip.status === "active") return onTrip ? { label: "Active", tone: "success", order: 0 } : { label: "Upcoming", tone: "accent", order: 1 };
  return { label: "Draft", tone: "neutral", order: 2 };
}

/** "Today · day 3 of 6" while travelling, otherwise the date range. */
export function tripWhenLabel(trip: Trip, today = new Date()): string {
  const s = safeParse(trip.startDate);
  const e = safeParse(trip.endDate);
  if (s && e && trip.status !== "archived" && trip.status !== "completed") {
    const day = differenceInCalendarDays(today, s) + 1;
    const total = differenceInCalendarDays(e, s) + 1;
    if (day >= 1 && day <= total) return `Today · day ${day} of ${total}`;
  }
  return formatDateRange(trip.startDate, trip.endDate);
}

/** Initials for an avatar-style circle. */
export function initials(name: string | undefined | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
