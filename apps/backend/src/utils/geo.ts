import type { TransportationMode, TravelStyle } from "@/types";

export interface Coordinates {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Average speed km/h by transportation mode (urban estimate). */
const MODE_SPEED_KMH: Record<TransportationMode, number> = {
  Walking: 4.5,
  Cab: 25,
  "Self Drive": 30,
  Bike: 12,
  "Public Transport": 20,
};

/** Average speed km/h once a hop leaves the city (highway / intercity bus or train). Walking
 * and cycling that far isn't realistic, so those fall back to a bus-like speed. */
const INTERCITY_SPEED_KMH: Record<TransportationMode, number> = {
  Walking: 45,
  Cab: 55,
  "Self Drive": 60,
  Bike: 45,
  "Public Transport": 50,
};

const INTERCITY_THRESHOLD_KM = 30;

/** Roads are never straight lines — scale great-circle distance to a typical road distance. */
const ROAD_DETOUR_FACTOR = 1.3;

export function estimateRoadKm(from: Coordinates, to: Coordinates): number {
  return haversineKm(from, to) * ROAD_DETOUR_FACTOR;
}

export function estimateTravelMinutes(
  from: Coordinates,
  to: Coordinates,
  mode: TransportationMode,
): number {
  const km = estimateRoadKm(from, to);
  const speed = km > INTERCITY_THRESHOLD_KM ? INTERCITY_SPEED_KMH[mode] : MODE_SPEED_KMH[mode];
  const minutes = (km / speed) * 60;
  return Math.max(5, Math.round(minutes));
}

export function getMaxPlacesPerDay(travelStyle: TravelStyle): number {
  switch (travelStyle) {
    case "Relaxed":
      return 4;
    case "Fast Paced":
      return 8;
    default:
      return 6;
  }
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(parseTimeToMinutes(time) + minutes);
}

export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates.length > 0 ? dates : [startDate.slice(0, 10)];
}
