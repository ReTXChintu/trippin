import {
  ApiKeyError,
  assertGoogleMapsKey,
  getOwnerApiKeysForTripDto,
} from "@/lib/services/trip-api-keys.service";
import {
  MAX_MEAL_SUGGESTIONS,
  MEAL_SUGGESTION_RADIUS_METERS,
  RESTAURANT_TYPES,
} from "@/constants/google-places";
import { PlacesService } from "@/modules/places/services/places.service";
import { PlaceCacheRepository } from "@/repositories/place-cache.repository";
import { ItineraryRepository } from "@/repositories/itinerary.repository";
import { TripRepository } from "@/repositories/trip.repository";
import { mapSearchResultToPlace } from "@/modules/places/utils/google-places.mapper";
import { buildPlacePhotoProxyUrl } from "@/modules/places/utils/photo.utils";
import {
  fitVisitToHours,
  formatWindows,
  getOpenWindowsOnDate,
} from "@/modules/places/utils/opening-hours.utils";
import { resolveDayStartPoint } from "@/modules/itinerary/services/itinerary-engine.service";
import { mealSuggestionsSchema } from "@/modules/itinerary/validators/itinerary.validator";
import { getAggregatedFoodPoolIds } from "@/modules/trips/utils/trip-leg.utils";
import type { MealType } from "@/modules/itinerary/types";
import type { Place, PlaceSearchResult } from "@/modules/places/types/place.types";
import { checkAndIncrementSearchLimit } from "@/utils/rate-limit";
import { type Coordinates, estimateRoadKm, estimateTravelMinutes, parseTimeToMinutes } from "@/utils/geo";

export interface MealSuggestion {
  googlePlaceId: string;
  name: string;
  address?: string;
  coordinates?: Coordinates;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  cuisine?: string;
  distanceKm?: number;
  walkMinutes?: number;
  /** null = hours unknown */
  openAtMealTime: boolean | null;
  hoursToday?: string;
  photoUrl?: string;
  /** "nearby" = live search around this slot; "saved" = from the trip's discovered food list. */
  source: "nearby" | "saved";
}

export interface MealSuggestionsResult {
  mealType?: MealType;
  time: string;
  anchorLabel: string;
  suggestions: MealSuggestion[];
}

type Result<T> = { success: true; data: T } | { success: false; error: string };

const TYPES_BY_MEAL: Record<MealType, string[]> = {
  breakfast: ["cafe", "bakery", "breakfast_restaurant", "restaurant"],
  lunch: RESTAURANT_TYPES,
  tiffin: ["cafe", "bakery", "coffee_shop", "dessert_shop", "restaurant"],
  dinner: ["restaurant", "bar", "meal_takeaway"],
};

/** Places tagged with these aren't somewhere you'd go for a meal, even if Google also calls them a "restaurant". */
const EXCLUDED_PRIMARY_TYPES = new Set(["lodging", "hotel", "gas_station", "grocery_store", "supermarket"]);

const CUISINE_LABELS: Record<string, string> = {
  cafe: "Café",
  coffee_shop: "Coffee",
  bakery: "Bakery",
  bar: "Bar",
  meal_takeaway: "Takeaway",
  fast_food_restaurant: "Fast food",
  dessert_shop: "Desserts",
  breakfast_restaurant: "Breakfast",
  fine_dining_restaurant: "Fine dining",
  vegetarian_restaurant: "Vegetarian",
  vegan_restaurant: "Vegan",
  restaurant: "Restaurant",
};

export function cuisineFromType(primaryType?: string): string | undefined {
  if (!primaryType) return undefined;
  if (CUISINE_LABELS[primaryType]) return CUISINE_LABELS[primaryType];
  if (primaryType.endsWith("_restaurant")) {
    const word = primaryType.replace(/_restaurant$/, "").replace(/_/g, " ");
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
  return undefined;
}

/** Rating matters most, backed by review volume; distance is a gentle tie-breaker. */
function score(s: MealSuggestion): number {
  const rating = s.rating ?? 3.8;
  const volume = Math.log10((s.userRatingCount ?? 10) + 1);
  const distancePenalty = (s.distanceKm ?? 1) * 0.35;
  const openPenalty = s.openAtMealTime === false ? 5 : 0;
  return rating * 2 + volume - distancePenalty - openPenalty;
}

function toSuggestion(
  place: Pick<Place, "name" | "formattedAddress" | "coordinates" | "rating" | "userRatingCount" | "priceLevel" | "openingPeriods" | "weekdayDescriptions" | "subCategory">,
  googlePlaceId: string,
  anchor: Coordinates,
  date: string,
  startMin: number,
  durationMin: number,
  source: MealSuggestion["source"],
  tripId: string,
  photoName?: string,
): MealSuggestion {
  const windows = getOpenWindowsOnDate(place, date);
  const fit = fitVisitToHours(windows, startMin, Math.min(durationMin, 45), date);
  const km = place.coordinates ? Math.round(estimateRoadKm(anchor, place.coordinates) * 10) / 10 : undefined;

  return {
    googlePlaceId,
    name: place.name,
    address: place.formattedAddress,
    coordinates: place.coordinates,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    priceLevel: place.priceLevel,
    cuisine: cuisineFromType(place.subCategory),
    distanceKm: km,
    walkMinutes: place.coordinates ? estimateTravelMinutes(anchor, place.coordinates, "Walking") : undefined,
    openAtMealTime: windows === null ? null : !fit.unavailable && fit.start - startMin <= 30,
    hoursToday: formatWindows(windows),
    photoUrl: photoName ? `${buildPlacePhotoProxyUrl(photoName, 240)}&tripId=${tripId}` : undefined,
    source,
  };
}

/** Restaurants for one meal slot, searched around where you'll actually be at that time (the stop
 * before the meal, else the one after, else your stay), filtered to places open then. */
export async function getMealSuggestions(userId: string, input: unknown): Promise<Result<MealSuggestionsResult>> {
  const parsed = mealSuggestionsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { tripId, dayNumber, stopId } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const itinerary = await ItineraryRepository.findByTripId(tripId);
  const day = itinerary?.days.find((d) => d.dayNumber === dayNumber);
  const index = day?.stops.findIndex((s) => s.id === stopId) ?? -1;
  if (!day || index === -1) return { success: false, error: "Meal slot not found" };
  const stop = day.stops[index];

  const before = [...day.stops.slice(0, index)].reverse().find((s) => s.coordinates && s.stopType !== "transfer");
  const after = day.stops.slice(index + 1).find((s) => s.coordinates && s.stopType !== "return");
  const stayStart = resolveDayStartPoint(day, trip);
  const anchorStop = before ?? after;
  const anchor = anchorStop?.coordinates ?? stayStart;
  if (!anchor) return { success: false, error: "Add a stay or some stops to this day first" };

  const anchorLabel = anchorStop
    ? `near ${anchorStop.placeName}`
    : "near your stay";
  const startMin = parseTimeToMinutes(stop.arrivalTime);
  const durationMin = stop.visitDurationMinutes || 60;

  try {
    const ownerKeys = await getOwnerApiKeysForTripDto(trip);
    assertGoogleMapsKey(ownerKeys, "trip");

    const allowed = await checkAndIncrementSearchLimit(userId);
    if (!allowed) return { success: false, error: "Daily search limit reached. Try again tomorrow." };

    const includedTypes = TYPES_BY_MEAL[stop.mealType ?? "lunch"];
    let results: PlaceSearchResult[] = await PlacesService.searchNearby({
      location: anchor,
      radiusMeters: MEAL_SUGGESTION_RADIUS_METERS,
      includedTypes,
      googleMapsApiKey: ownerKeys.googleMaps,
    });
    if (results.length < 5) {
      results = await PlacesService.searchNearby({
        location: anchor,
        radiusMeters: MEAL_SUGGESTION_RADIUS_METERS * 3,
        includedTypes,
        googleMapsApiKey: ownerKeys.googleMaps,
      });
    }
    results = results.filter((r) => !EXCLUDED_PRIMARY_TYPES.has(r.primaryType ?? ""));

    // Cache what we found so picking one doesn't cost another lookup, and hours travel with it.
    const context = { city: day.legName ?? trip.destinationCity, country: trip.destinationCountry };
    await PlaceCacheRepository.upsertMany(results.map((r) => mapSearchResultToPlace(r, context)));

    const nearby = results.map((r) =>
      toSuggestion(
        mapSearchResultToPlace(r, context),
        r.googlePlaceId,
        anchor,
        day.date,
        startMin,
        durationMin,
        "nearby",
        trip.id,
        r.photoName,
      ),
    );

    // Restaurants already discovered for this trip that happen to be close — no extra API cost.
    const seen = new Set(nearby.map((s) => s.googlePlaceId));
    const saved = (await PlacesService.getCachedPlaces(getAggregatedFoodPoolIds(trip)))
      .filter((p) => p.googlePlaceId && p.coordinates && !seen.has(p.googlePlaceId))
      .map((p) => toSuggestion(p, p.googlePlaceId!, anchor, day.date, startMin, durationMin, "saved", trip.id))
      .filter((s) => (s.distanceKm ?? Infinity) <= 4);

    const suggestions = [...nearby, ...saved]
      .filter((s) => s.openAtMealTime !== false)
      .sort((a, b) => score(b) - score(a))
      .slice(0, MAX_MEAL_SUGGESTIONS);

    return {
      success: true,
      data: { mealType: stop.mealType, time: stop.arrivalTime, anchorLabel, suggestions },
    };
  } catch (err) {
    if (err instanceof ApiKeyError) return { success: false, error: err.message };
    return { success: false, error: err instanceof Error ? err.message : "Couldn't load restaurant suggestions" };
  }
}
