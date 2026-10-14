import { useQueries } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { searchCities, type CityMatch } from "@/modules/places/api/places.api";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import { getDayStartStay } from "@/modules/trips/utils/stay.utils";
import { BASE_AREA, type LegArea } from "@/modules/trips/utils/place-areas";
import { haversineKm } from "@/utils/geo";

/** Search radius around the area you're picking places for. */
export const AREA_SEARCH_RADIUS_KM = 40;

/** The area the Places tab is picking for — add-place calls record it, search stays inside it. */
export interface PlaceAreaScope {
  legId: string;
  areaId: string;
  center?: { lat: number; lng: number };
  radiusKm: number;
}
export const PlaceAreaContext = createContext<PlaceAreaScope | null>(null);

/** The area id to record for an add in this city (undefined outside the Places tab). */
export function usePlaceAreaFor(legId: string): string | undefined {
  const scope = useContext(PlaceAreaContext);
  return scope && scope.legId === legId ? scope.areaId : undefined;
}

export function usePlaceAreaScope(): PlaceAreaScope | null {
  return useContext(PlaceAreaContext);
}

function pick(matches: CityMatch[] | undefined, country: string, near?: { lat: number; lng: number }) {
  if (!matches?.length) return undefined;
  const same = matches.filter((m) => !country || m.country.toLowerCase() === country.toLowerCase());
  const pool = same.length ? same : matches;
  const best = near ? [...pool].sort((a, b) => haversineKm(near, a) - haversineKm(near, b))[0] : pool[0];
  return { lat: best.lat, lng: best.lng };
}

/** The city plus its day trips, each with a centre (stored, or looked up by name — no key needed). */
export function useLegAreas(leg: TripLeg): LegArea[] {
  const stay = getDayStartStay(leg, leg.startDate)?.coordinates ?? leg.hotelCoordinates;
  const trips = leg.dayTrips?.length ? leg.dayTrips : leg.dayTripAreas.map((name, i) => ({ id: `area-${i}`, name }) as NonNullable<TripLeg["dayTrips"]>[number]);
  const lookups = [
    ...(stay ? [] : [leg.baseCity]),
    ...trips.filter((d) => !d.coordinates && d.name).map((d) => d.name),
  ];
  const results = useQueries({
    queries: lookups.map((name) => ({
      queryKey: ["city-lookup", name],
      queryFn: () => searchCities(name),
      staleTime: Infinity,
      retry: false,
    })),
  });
  const found = new Map(lookups.map((name, i) => [name, results[i]?.data?.cities]));
  const baseCenter = stay ?? pick(found.get(leg.baseCity), leg.country);

  return [
    { id: BASE_AREA, name: leg.name || leg.baseCity, isBase: true, center: baseCenter },
    ...trips
      .filter((d) => d.name)
      .map((d) => ({ id: d.id, name: d.name, isBase: false, center: d.coordinates ?? pick(found.get(d.name), leg.country, baseCenter) })),
  ];
}
