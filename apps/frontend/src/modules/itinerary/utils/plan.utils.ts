import { format, parseISO } from "date-fns";
import type { IconType } from "react-icons";
import { FiNavigation } from "react-icons/fi";
import { MdDirectionsBike, MdDirectionsBus, MdDirectionsCar, MdDirectionsWalk, MdLocalTaxi } from "react-icons/md";
import type { ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";
import type { TransportationMode } from "@/types";

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatDayDate(date: string, pattern = "EEE, d MMM"): string {
  try {
    return format(parseISO(date), pattern);
  } catch {
    return date;
  }
}

export const TRANSPORT_ICONS: Record<TransportationMode, IconType> = {
  Walking: MdDirectionsWalk,
  Cab: MdLocalTaxi,
  "Self Drive": MdDirectionsCar,
  Bike: MdDirectionsBike,
  "Public Transport": MdDirectionsBus,
};

export function transportIcon(mode: TransportationMode | undefined): IconType {
  return (mode && TRANSPORT_ICONS[mode]) || FiNavigation;
}

const GOOGLE_TRAVEL_MODE: Record<TransportationMode, string> = {
  Walking: "walking",
  Cab: "driving",
  "Self Drive": "driving",
  Bike: "bicycling",
  "Public Transport": "transit",
};

/** A Google Maps directions link for the whole day (stay → stops → stay), to open on the phone. */
export function dayGoogleMapsUrl(
  day: ItineraryDay,
  start: { lat: number; lng: number } | undefined,
  mode: TransportationMode,
): string | null {
  const points = day.stops
    .filter((s) => s.coordinates && s.stopType !== "transfer")
    .map((s) => `${s.coordinates!.lat},${s.coordinates!.lng}`);
  if (start) points.unshift(`${start.lat},${start.lng}`);
  const unique = points.filter((p, i) => i === 0 || p !== points[i - 1]);
  if (unique.length < 2) return null;

  const params = new URLSearchParams({
    api: "1",
    origin: unique[0],
    destination: unique[unique.length - 1],
    travelmode: GOOGLE_TRAVEL_MODE[mode] ?? "driving",
  });
  // Google Maps URLs accept up to 9 waypoints.
  const waypoints = unique.slice(1, -1).slice(0, 9);
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function isVisit(stop: ItineraryStop): boolean {
  return stop.stopType !== "meal" && stop.stopType !== "transfer" && stop.stopType !== "return";
}

export interface DaySummary {
  visits: number;
  travelMinutes: number;
  travelKm: number;
  start?: string;
  end?: string;
  warnings: number;
  usesEstimates: boolean;
}

export function summarizeDay(day: ItineraryDay): DaySummary {
  const timed = day.stops.filter((s) => s.stopType !== "transfer");
  return {
    visits: day.stops.filter(isVisit).length,
    travelMinutes: day.stops.reduce((sum, s) => sum + (s.stopType === "transfer" ? 0 : s.travelDurationMinutes), 0),
    travelKm: Math.round(day.stops.reduce((sum, s) => sum + (s.travelDistanceKm ?? 0), 0) * 10) / 10,
    start: timed[0]?.arrivalTime,
    end: timed[timed.length - 1]?.departureTime,
    warnings: day.stops.reduce((sum, s) => sum + (s.warnings?.length ?? 0), 0),
    usesEstimates: day.stops.some((s) => s.travelSource === "estimate"),
  };
}

/** Minutes of unplanned time between the previous stop and this one (after travel). */
export function gapBefore(prev: ItineraryStop | undefined, stop: ItineraryStop): number {
  if (!prev || stop.stopType === "return") return 0;
  const gap = toMinutes(stop.arrivalTime) - (toMinutes(prev.departureTime) + stop.travelDurationMinutes);
  return gap > 0 ? gap : 0;
}
