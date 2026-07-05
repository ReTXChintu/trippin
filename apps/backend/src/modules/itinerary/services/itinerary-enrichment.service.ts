import type { ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";
import type { VisitIntel, HypeLevel } from "@/modules/itinerary/types/visit-intel.types";
import type { Place } from "@/modules/places/types/place.types";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import type { LegDestinationBrief } from "@/modules/trips/types/trip-enrichment.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";

const TEMPLE_CATEGORIES = new Set(["Temples", "Spiritual"]);
const MARKET_CATEGORIES = new Set(["Shopping"]);
const FOOD_CATEGORIES = new Set(["Food", "Cafes"]);

function inferHypeLevel(place?: Place): HypeLevel {
  const rating = place?.rating ?? 0;
  const count = place?.userRatingCount ?? 0;
  if (count > 5000 && rating < 4.2) return "overhyped";
  if (count < 500 && rating >= 4.3) return "hidden-gem";
  return "worth-it";
}

function ruleBasedVisitIntel(stop: ItineraryStop, place?: Place): VisitIntel {
  const category = stop.category ?? place?.category ?? "";
  const hypeLevel = inferHypeLevel(place);

  let bestTime = "Morning, 8–10 AM";
  let avoidTime: string | undefined;
  let why: string | undefined;

  if (TEMPLE_CATEGORIES.has(category)) {
    bestTime = "Early morning before 9 AM";
    avoidTime = "Midday and festival weekends — very crowded";
    why =
      hypeLevel === "overhyped"
        ? "Popular pilgrimage spot — long queues at peak hours"
        : "Spiritual sites are calmer at dawn";
  } else if (MARKET_CATEGORIES.has(category) || stop.stopType === "market") {
    bestTime = "Late afternoon, 4–7 PM";
    avoidTime = "Early morning when many stalls are closed";
    why = "Markets come alive in the evening with local shoppers";
  } else if (FOOD_CATEGORIES.has(category) || stop.stopType === "food") {
    bestTime = "Lunch 12:30–2 PM or dinner 7–9 PM";
    why = "Local eateries are best when freshly prepared for meal times";
  } else if (category === "Forts" || category === "History") {
    bestTime = "Sunrise or 4–6 PM for softer light and fewer crowds";
    avoidTime = "Afternoon 12–3 PM — hot and exposed";
  } else {
    avoidTime = "Peak afternoon 12–3 PM if outdoors";
  }

  if (hypeLevel === "overhyped") {
    why = why ?? "Very popular on social media — expect crowds at midday";
  } else if (hypeLevel === "hidden-gem") {
    why = why ?? "Highly rated but less crowded — worth prioritizing";
  }

  const tips: string[] = [];
  if (place?.entryFee) tips.push(`Entry: ${place.entryFee}`);
  if (place?.openingTime && place?.closingTime) {
    tips.push(`Hours: ${place.openingTime} – ${place.closingTime}`);
  }

  return { bestTime, avoidTime, hypeLevel, why, tips: tips.length ? tips : undefined };
}

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
    generalTips: [
      `Base yourself in ${city}${leg.dayTripAreas.length ? ` — day trips to ${leg.dayTripAreas.join(", ")}` : ""}`,
      places.length > 0 ? `${places.length} sights discovered in this leg` : "Discover places to build your route",
      leg.hotelName ? `Stay: ${leg.hotelName}` : "Add your hotel for better routing and rental suggestions",
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function enrichStopsWithRuleBasedIntel(
  days: ItineraryDay[],
  placeMap: Map<string, Place>,
): ItineraryDay[] {
  return days.map((day) => ({
    ...day,
    stops: day.stops.map((stop) => {
      if (stop.stopType === "transfer") return stop;
      const place = placeMap.get(stop.placeId);
      const visitIntel = ruleBasedVisitIntel(stop, place);
      const aiNotes = [visitIntel.why, visitIntel.avoidTime ? `Avoid: ${visitIntel.avoidTime}` : null]
        .filter(Boolean)
        .join(" · ");
      return { ...stop, visitIntel, aiNotes: aiNotes || undefined };
    }),
  }));
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

export type { VisitIntel, HypeLevel, LegDestinationBrief };
