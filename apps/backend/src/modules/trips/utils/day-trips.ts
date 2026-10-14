import { randomUUID } from "crypto";
import { searchCities } from "@/modules/places/services/city-lookup.service";
import { getDayStartStay } from "@/modules/trips/utils/stay.utils";
import type { TripDayTrip, TripLeg } from "@/modules/trips/types/trip-leg.types";
import { haversineKm } from "@/utils/geo";

/** A day trip further than this from its base isn't a day trip — the lookup found the wrong town. */
const MAX_DAY_TRIP_KM = 300;

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Keeps `dayTrips` and the older `dayTripAreas` (names only) in step. Clients that send only names
 * keep the dates and locations already stored for those names; dates outside the city's dates are
 * cleared (the city moved).
 */
export function normalizeDayTrips(leg: TripLeg, stored?: TripLeg): TripLeg {
  const known = leg.dayTrips?.length ? leg.dayTrips : (stored?.dayTrips ?? []);
  // A non-empty dayTrips list is authoritative; otherwise rebuild it from the names (older clients,
  // and trips saved before day trips had dates), reusing what's stored for the same names.
  const trips: TripDayTrip[] = leg.dayTrips?.length
    ? leg.dayTrips
    : leg.dayTripAreas.map((name) => known.find((d) => sameName(d.name, name)) ?? { id: randomUUID(), name });
  const cleaned = trips
    .filter((d) => d.name.trim())
    .map((d) => {
      // Keep a stored location for the same name; a renamed trip is looked up again.
      const prev = known.find((k) => k.id === d.id || sameName(k.name, d.name));
      const coordinates = d.coordinates ?? (prev && sameName(prev.name, d.name) ? prev.coordinates : undefined);
      const date = d.date && d.date >= leg.startDate && d.date <= leg.endDate ? d.date : undefined;
      return { id: d.id || randomUUID(), name: d.name.trim(), date, coordinates };
    });
  return { ...leg, dayTrips: cleaned, dayTripAreas: cleaned.map((d) => d.name) };
}

async function locate(name: string, country: string, near?: { lat: number; lng: number }) {
  try {
    const matches = await searchCities(name);
    const inCountry = matches.filter((m) => !country || sameName(m.country, country));
    const pool = inCountry.length > 0 ? inCountry : matches;
    if (pool.length === 0) return undefined;
    const best = near ? [...pool].sort((a, b) => haversineKm(near, a) - haversineKm(near, b))[0] : pool[0];
    if (near && haversineKm(near, best) > MAX_DAY_TRIP_KM) return undefined;
    return { lat: best.lat, lng: best.lng };
  } catch {
    return undefined; // lookup unavailable — the planner falls back to grouping by distance only
  }
}

/** The point a city's days start from: the first stay, the old hotel field, or the town itself. */
export async function legBasePoint(leg: TripLeg): Promise<{ lat: number; lng: number } | undefined> {
  return getDayStartStay(leg, leg.startDate)?.coordinates ?? leg.hotelCoordinates ?? (await locate(leg.baseCity, leg.country));
}

/** Fills in missing day-trip locations (the nearest same-named town to the base). */
export async function locateDayTrips(leg: TripLeg): Promise<TripLeg> {
  const trips = leg.dayTrips ?? [];
  if (trips.every((d) => d.coordinates)) return leg;
  const base = await legBasePoint(leg);
  const located = await Promise.all(trips.map(async (d) => (d.coordinates ? d : { ...d, coordinates: await locate(d.name, leg.country, base) })));
  return { ...leg, dayTrips: located };
}
