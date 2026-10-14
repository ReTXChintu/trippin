import { DIRECTIONS_API_BASE } from "@/constants/google-places";
import { recordGoogleUsage } from "@/modules/profile/services/google-usage.service";
import { RouteCacheRepository, buildRouteCacheKey, type CachedRoute } from "@/repositories/route-cache.repository";
import { hopKey, resolveDayStartPoint } from "@/modules/itinerary/services/itinerary-engine.service";
import type { ItineraryDay } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TransportationMode } from "@/types";

/** Synthetic id for the hotel-as-day-start waypoint — day.stops never contains an explicit
 * "start" entry (the stay is only a routing start POINT), so the stay→first-stop hop is
 * prepended here to route the full loop. */
const HOTEL_START_ID = "hotel-start";

export interface DayRouteHop {
  fromStopId: string;
  toStopId: string;
  distanceKm: number;
  durationMinutes: number;
}

export interface DayRoute {
  dayNumber: number;
  /** Whole-day line. Empty for transit, which is routed hop by hop — see segmentPolylines. */
  overviewPolyline: string;
  segmentPolylines?: string[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  hops: DayRouteHop[];
}

function mapTransportModeToGoogle(mode: TransportationMode): string {
  switch (mode) {
    case "Walking":
      return "walking";
    case "Bike":
      return "bicycling";
    case "Public Transport":
      return "transit";
    case "Cab":
    case "Self Drive":
    default:
      return "driving";
  }
}

interface RoutableStop {
  id: string;
  lat: number;
  lng: number;
}

function getRoutableStops(day: ItineraryDay): RoutableStop[] {
  return day.stops
    .filter((s) => s.coordinates && s.stopType !== "transfer")
    .map((s) => ({ id: s.id, lat: s.coordinates!.lat, lng: s.coordinates!.lng }));
}

function prependStart(stops: RoutableStop[], startPoint: { lat: number; lng: number } | null): RoutableStop[] {
  if (!startPoint) return stops;
  const first = stops[0];
  const alreadyThere =
    first && Math.abs(first.lat - startPoint.lat) < 1e-6 && Math.abs(first.lng - startPoint.lng) < 1e-6;
  if (alreadyThere) return stops;
  return [{ id: HOTEL_START_ID, lat: startPoint.lat, lng: startPoint.lng }, ...stops];
}

/** Collapses consecutive waypoints at the same spot (e.g. an unassigned meal "at" the previous
 * stop, or a stop at the hotel) — Directions would return a zero-length leg for them anyway. */
function dedupeConsecutive(stops: RoutableStop[]): RoutableStop[] {
  return stops.filter(
    (s, i) => i === 0 || Math.abs(s.lat - stops[i - 1].lat) > 1e-6 || Math.abs(s.lng - stops[i - 1].lng) > 1e-6,
  );
}

/** Keys whose Directions call failed recently, and API keys that Google refused outright (API not
 * enabled / billing off) — so one bad config doesn't add a failing network call to every edit. */
const recentFailures = new Map<string, number>();
const deniedApiKeys = new Map<string, number>();
const FAILURE_TTL_MS = 10 * 60 * 1000;

function isRecent(map: Map<string, number>, key: string): boolean {
  const at = map.get(key);
  if (at === undefined) return false;
  if (Date.now() - at > FAILURE_TTL_MS) {
    map.delete(key);
    return false;
  }
  return true;
}

async function fetchDirections(waypoints: RoutableStop[], mode: string, apiKey: string): Promise<CachedRoute | null> {
  if (waypoints.length < 2 || isRecent(deniedApiKeys, apiKey)) return null;

  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const middle = waypoints.slice(1, -1);

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode,
    key: apiKey,
  });
  if (middle.length > 0) {
    // Deliberately no "optimize:true" — the itinerary has already decided stop order.
    params.set("waypoints", middle.map((w) => `${w.lat},${w.lng}`).join("|"));
  }

  let response: Response;
  try {
    response = await fetch(`${DIRECTIONS_API_BASE}?${params.toString()}`);
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const data = (await response.json()) as {
    status: string;
    routes?: Array<{
      overview_polyline?: { points?: string };
      legs?: Array<{ distance?: { value?: number }; duration?: { value?: number } }>;
    }>;
  };

  if (data.status === "REQUEST_DENIED") {
    deniedApiKeys.set(apiKey, Date.now());
    return null;
  }
  // Google bills answered requests only; refusals come back as 200 with an error status.
  if (data.status === "OK" || data.status === "ZERO_RESULTS") recordGoogleUsage(apiKey, "directions");
  if (data.status !== "OK" || !data.routes?.[0]) return null;

  const route = data.routes[0];
  const hops = (route.legs ?? []).map((leg) => ({
    distanceMeters: leg.distance?.value ?? 0,
    durationSeconds: leg.duration?.value ?? 0,
  }));

  if (!route.overview_polyline?.points || hops.length === 0) return null;
  return { overviewPolyline: route.overview_polyline.points, hops };
}

async function getCachedDirections(waypoints: RoutableStop[], mode: string, apiKey: string): Promise<CachedRoute | null> {
  const cacheKey = buildRouteCacheKey(
    waypoints.map((s) => ({ lat: s.lat, lng: s.lng })),
    mode,
  );
  if (isRecent(recentFailures, cacheKey)) return null;

  const cached = await RouteCacheRepository.find(cacheKey);
  if (cached) return cached;

  const fetched = await fetchDirections(waypoints, mode, apiKey);
  if (!fetched) {
    recentFailures.set(cacheKey, Date.now());
    return null;
  }
  await RouteCacheRepository.upsert(cacheKey, fetched);
  return fetched;
}

function toHop(from: RoutableStop, to: RoutableStop, hop: { distanceMeters: number; durationSeconds: number }): DayRouteHop {
  return {
    fromStopId: from.id,
    toStopId: to.id,
    distanceKm: Math.round((hop.distanceMeters / 1000) * 10) / 10,
    durationMinutes: Math.max(1, Math.round(hop.durationSeconds / 60)),
  };
}

/** Real, road-following route (geometry + per-hop distance/duration) for one day, cached by the
 * ordered waypoints + mode. Null when there's nothing to route or Directions fails — callers fall
 * back to estimates, never a hard error. Transit can't take waypoints, so it's fetched per hop. */
export async function getDayRoute(
  trip: Trip,
  day: ItineraryDay,
  apiKey: string,
  startPoint: { lat: number; lng: number } | null = null,
): Promise<DayRoute | null> {
  const stops = dedupeConsecutive(prependStart(getRoutableStops(day), startPoint));
  if (stops.length < 2) return null;

  const mode = mapTransportModeToGoogle(trip.transportationMode);
  let hops: DayRouteHop[] = [];
  let overviewPolyline = "";
  let segmentPolylines: string[] | undefined;

  if (mode === "transit") {
    segmentPolylines = [];
    for (let i = 1; i < stops.length; i++) {
      const segment = await getCachedDirections([stops[i - 1], stops[i]], mode, apiKey);
      if (!segment || segment.hops.length !== 1) continue;
      hops.push(toHop(stops[i - 1], stops[i], segment.hops[0]));
      segmentPolylines.push(segment.overviewPolyline);
    }
    if (hops.length === 0) return null;
  } else {
    const route = await getCachedDirections(stops, mode, apiKey);
    if (!route || route.hops.length !== stops.length - 1) return null;
    hops = route.hops.map((hop, i) => toHop(stops[i], stops[i + 1], hop));
    overviewPolyline = route.overviewPolyline;
  }

  return {
    dayNumber: day.dayNumber,
    overviewPolyline,
    segmentPolylines,
    totalDistanceKm: Math.round(hops.reduce((sum, h) => sum + h.distanceKm, 0) * 10) / 10,
    totalDurationMinutes: Math.round(hops.reduce((sum, h) => sum + h.durationMinutes, 0)),
    hops,
  };
}

export async function getRoutesForDays(trip: Trip, days: ItineraryDay[], apiKey: string): Promise<DayRoute[]> {
  const results: DayRoute[] = [];
  for (const day of days) {
    const route = await getDayRoute(trip, day, apiKey, resolveDayStartPoint(day, trip));
    if (route) results.push(route);
  }
  return results;
}

/** Measured travel for every hop in these days, keyed by `hopKey(from, to)` — fed back into the
 * scheduler so the timeline uses the same minutes the map shows. */
export async function measureDayHops(
  trip: Trip,
  days: ItineraryDay[],
  apiKey: string,
): Promise<Map<string, { minutes: number; km: number }>> {
  const measured = new Map<string, { minutes: number; km: number }>();

  for (const day of days) {
    if (day.dayType === "transfer" || day.dayType === "free") continue;
    const startPoint = resolveDayStartPoint(day, trip);
    const route = await getDayRoute(trip, day, apiKey, startPoint);
    if (!route) continue;

    const coordsById = new Map(day.stops.filter((s) => s.coordinates).map((s) => [s.id, s.coordinates!]));
    if (startPoint) coordsById.set(HOTEL_START_ID, startPoint);

    for (const hop of route.hops) {
      const from = coordsById.get(hop.fromStopId);
      const to = coordsById.get(hop.toStopId);
      if (from && to) measured.set(hopKey(from, to), { minutes: hop.durationMinutes, km: hop.distanceKm });
    }
  }

  return measured;
}
