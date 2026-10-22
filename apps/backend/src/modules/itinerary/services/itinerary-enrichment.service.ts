import type { VisitIntel } from "@/modules/itinerary/types/visit-intel.types";
import type { Place } from "@/modules/places/types/place.types";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import type { LegDestinationBrief } from "@/modules/trips/types/trip-enrichment.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";

export function buildRuleBasedLegBrief(
  leg: TripLeg,
  places: Place[],
  foodPlaces: Place[],
  marketPlaces: Place[],
): LegDestinationBrief {
  const city = leg.baseCity;
  const areas = [city, ...leg.dayTripAreas].filter(Boolean);

  return {
    specialties: areas.map((a) => `Explore ${a}'s local culture and landmarks`),
    localFood: foodPlaces.slice(0, 5).map((p) => p.name),
    markets: marketPlaces.slice(0, 4).map((p) => ({
      placeId: p.googlePlaceId,
      name: p.name,
      whatToBuy: [`Local crafts from ${p.city || city}`, "Souvenirs", "Regional specialties"],
    })),
    festivals: [],
    generalTips: [
      `Base yourself in ${city}${leg.dayTripAreas.length ? ` — day trips to ${leg.dayTripAreas.join(", ")}` : ""}`,
      places.length > 0 ? `${places.length} sights discovered in this leg` : "Discover places to build your route",
      leg.hotelName ? `Stay: ${leg.hotelName}` : "Add your hotel for better routing and rental suggestions",
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function buildVisitIntelSummary(intel: VisitIntel): string {
  const parts: string[] = [];
  if (intel.bestTime) parts.push(`Best: ${intel.bestTime}`);
  if (intel.avoidTime) parts.push(`Avoid: ${intel.avoidTime}`);
  if (intel.why) parts.push(intel.why);
  return parts.join(" · ");
}

export function groupPlacesByLeg(
  trip: Trip,
  places: Place[],
): Map<string, Place[]> {
  const legs = getEffectiveLegs(trip);
  const byLeg = new Map<string, Place[]>();
  for (const leg of legs) byLeg.set(leg.id, []);

  for (const place of places) {
    if (!place.googlePlaceId) continue;
    for (const leg of legs) {
      const pools = [
        ...leg.discoveryPoolIds,
        ...leg.foodPoolIds,
        ...leg.marketPoolIds,
      ];
      if (pools.includes(place.googlePlaceId)) {
        byLeg.get(leg.id)?.push(place);
        break;
      }
    }
  }
  return byLeg;
}

export type { VisitIntel, LegDestinationBrief };
