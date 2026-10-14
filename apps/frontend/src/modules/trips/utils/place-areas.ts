import { haversineKm } from "@/utils/geo";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";

type Point = { lat: number; lng: number };

/** One part of a city's stay: the city itself ("base") or a day trip from it. */
export interface LegArea {
  /** "base" or the day trip's id. */
  id: string;
  name: string;
  isBase: boolean;
  center?: Point;
}

export const BASE_AREA = "base";

/** Where a place belongs (same rule as the planner): what the traveller picked it for, else the
 * day-trip town it's clearly closer to than the stay, else the city. */
export function areaOfPlace(
  place: { googlePlaceId?: string; coordinates?: Point },
  leg: Pick<TripLeg, "placeAreas">,
  areas: LegArea[],
): string {
  const chosen = place.googlePlaceId ? leg.placeAreas?.[place.googlePlaceId] : undefined;
  if (chosen && areas.some((a) => a.id === chosen)) return chosen;
  const base = areas.find((a) => a.isBase)?.center;
  if (!place.coordinates) return BASE_AREA;
  let best: LegArea | undefined;
  let bestKm = Infinity;
  for (const a of areas) {
    if (a.isBase || !a.center) continue;
    const km = haversineKm(place.coordinates, a.center);
    if (km < bestKm) {
      bestKm = km;
      best = a;
    }
  }
  if (!best?.center) return BASE_AREA;
  const toBase = base ? haversineKm(place.coordinates, base) : Infinity;
  const span = base ? haversineKm(base, best.center) : 60;
  return bestKm < toBase && bestKm <= Math.max(25, span * 0.6) ? best.id : BASE_AREA;
}
