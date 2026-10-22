import type { ItineraryStopType } from "@/modules/itinerary/types";
import type { Place } from "@/modules/places/types/place.types";
import { estimateVisitDuration } from "@/modules/ai/services/place-ranking.service";
import type { TravelStyle } from "@/types";
import { parseTimeToMinutes } from "@/utils/geo";

const TEMPLE_CATEGORIES = new Set(["Temples", "Spiritual"]);
const MARKET_CATEGORIES = new Set(["Shopping"]);
const FOOD_CATEGORIES = new Set(["Food", "Cafes"]);

export function parseClockTime(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    return parseTimeToMinutes(trimmed);
  }

  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match) {
    let hours = Number(match[1]);
    const minutes = Number(match[2] ?? 0);
    const period = match[3].toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  return undefined;
}

function inferTargetArrivalFromCategory(
  category: string,
  stopType?: ItineraryStopType,
): number {
  if (TEMPLE_CATEGORIES.has(category)) return 7 * 60;
  if (MARKET_CATEGORIES.has(category) || stopType === "market") return 16 * 60 + 30;
  if (FOOD_CATEGORIES.has(category) || stopType === "food") return 12 * 60 + 30;
  if (category === "Forts" || category === "History") return 6 * 60 + 30;
  return 8 * 60 + 30;
}

export function getPlaceTargetArrivalMinutes(
  place: Place,
  stopType?: ItineraryStopType,
): number {
  if (place.openingTime) {
    const fromHours = parseClockTime(place.openingTime);
    if (fromHours !== undefined) return fromHours;
  }

  if (place.recommendedVisitTime) {
    const lower = place.recommendedVisitTime.toLowerCase();
    if (lower.includes("morning") || lower.includes("sunrise")) return 7 * 60;
    if (lower.includes("evening") || lower.includes("sunset")) return 17 * 60;
    if (lower.includes("night")) return 19 * 60;
  }

  return inferTargetArrivalFromCategory(place.category, stopType);
}

export function getPlaceVisitDurationMinutes(
  place: Place,
  stopType: ItineraryStopType | undefined,
  travelStyle: TravelStyle,
): number {
  if (stopType === "food") return 60;
  if (stopType === "market") return 90;
  return estimateVisitDuration(place, travelStyle);
}
