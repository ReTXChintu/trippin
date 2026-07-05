import {
  ApiKeyError,
  assertGoogleMapsKey,
  getOwnerApiKeysForTripDto,
  getUserApiKeys,
} from "@/lib/services/trip-api-keys.service";
import { PlacesService } from "@/modules/places/services/places.service";
import { TripRepository } from "@/repositories/trip.repository";
import { PlaceCacheRepository } from "@/repositories/place-cache.repository";
import { getAggregatedDiscoveryPoolIds, getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import {
  bulkAddPlacesSchema,
  bulkRemovePlacesSchema,
  discoverTripPlacesSchema,
  geocodeSchema,
  placeIdSchema,
  searchQuerySchema,
  tripPlaceSchema,
} from "@/modules/places/validators/places.validator";
import type { Place, PlaceDetail, PlaceSearchResult } from "@/modules/places/types/place.types";
import { checkAndIncrementDetailLimit, checkAndIncrementSearchLimit } from "@/utils/rate-limit";
import { MAX_DISCOVERY_POOL_SIZE } from "@/constants/google-places";
import type { Trip } from "@/modules/trips/types/trip.types";

export type PlacesActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

async function enforceRateLimit(userId: string): Promise<{ success: false; error: string } | null> {
  const allowed = await checkAndIncrementSearchLimit(userId);
  if (!allowed) {
    return { success: false, error: "Daily search limit reached. Try again tomorrow." };
  }
  return null;
}

async function enforceDetailLimit(userId: string): Promise<{ success: false; error: string } | null> {
  const allowed = await checkAndIncrementDetailLimit(userId);
  if (!allowed) {
    return { success: false, error: "Daily place detail limit reached. Try again tomorrow." };
  }
  return null;
}

function parseLocation(lat?: number, lng?: number) {
  if (lat !== undefined && lng !== undefined && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return { lat, lng };
  }
  return undefined;
}

function tripContext(trip: NonNullable<Awaited<ReturnType<typeof TripRepository.findByIdForUser>>>) {
  return {
    city: trip.destinationCity,
    state: trip.destinationState,
    country: trip.destinationCountry,
  };
}

function actionError<T = void>(err: unknown, fallback: string): PlacesActionResult<T> {
  if (err instanceof ApiKeyError) {
    return { success: false, error: err.message };
  }
  return { success: false, error: err instanceof Error ? err.message : fallback };
}

async function discoverAuxiliaryPools(
  trip: Trip,
  leg: {
    baseCity: string;
    state?: string;
    country: string;
    dayTripAreas: string[];
    hotelCoordinates?: { lat: number; lng: number };
  },
  googleMapsApiKey: string,
) {
  const baseParams = {
    city: leg.baseCity,
    state: leg.state ?? trip.destinationState,
    country: leg.country,
    searchAreas: leg.dayTripAreas,
    interests: trip.interests,
    travelStyle: trip.travelStyle,
    hotelCoordinates: leg.hotelCoordinates ?? trip.hotelCoordinates,
    googleMapsApiKey,
  };

  const [food, markets, rentals] = await Promise.all([
    PlacesService.discoverFoodPlaces(baseParams),
    PlacesService.discoverMarketPlaces(baseParams),
    PlacesService.discoverVehicleRentalsNearStay(baseParams),
  ]);

  return {
    foodPoolIds: food.map((p) => p.googlePlaceId).filter((id): id is string => !!id),
    marketPoolIds: markets.map((p) => p.googlePlaceId).filter((id): id is string => !!id),
    vehicleRentalSuggestions: rentals,
  };
}

export async function searchPlaces(
  userId: string,
  input: unknown,
): Promise<PlacesActionResult<{ results: PlaceSearchResult[] }>> {
  const rateLimit = await enforceRateLimit(userId);
  if (rateLimit) return rateLimit;

  const parsed = searchQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const keys = await getUserApiKeys(userId);
    assertGoogleMapsKey(keys, "profile");

    const { query, city, country, sessionToken, lat, lng } = parsed.data;
    const results = await PlacesService.autocomplete({
      query,
      city,
      country,
      sessionToken,
      location: parseLocation(lat, lng),
      googleMapsApiKey: keys.googleMaps,
    });

    if (results.length === 0) {
      const textResults = await PlacesService.searchPlaces({
        query,
        city,
        country,
        location: parseLocation(lat, lng),
        googleMapsApiKey: keys.googleMaps,
      });
      return { success: true, data: { results: textResults } };
    }

    return { success: true, data: { results } };
  } catch (err) {
    return actionError(err, "Search failed");
  }
}

export async function searchHotels(
  userId: string,
  input: unknown,
): Promise<PlacesActionResult<{ results: PlaceSearchResult[] }>> {
  const rateLimit = await enforceRateLimit(userId);
  if (rateLimit) return rateLimit;

  const parsed = searchQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const keys = await getUserApiKeys(userId);
    assertGoogleMapsKey(keys, "profile");

    const { query, city, country, sessionToken, lat, lng } = parsed.data;
    const results = await PlacesService.searchHotels({
      query,
      city,
      country,
      sessionToken,
      location: parseLocation(lat, lng),
      googleMapsApiKey: keys.googleMaps,
    });
    return { success: true, data: { results } };
  } catch (err) {
    return actionError(err, "Hotel search failed");
  }
}

export async function getPlaceDetails(
  userId: string,
  input: unknown,
): Promise<PlacesActionResult<{ place: Place }>> {
  const rateLimit = await enforceRateLimit(userId);
  if (rateLimit) return rateLimit;

  const parsed = placeIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const keys = await getUserApiKeys(userId);
    assertGoogleMapsKey(keys, "profile");

    const place = await PlacesService.getPlaceDetails(parsed.data.placeId, keys.googleMaps, {
      city: parsed.data.city,
      state: parsed.data.state,
      country: parsed.data.country,
    });
    return { success: true, data: { place } };
  } catch (err) {
    return actionError(err, "Failed to fetch place details");
  }
}

export async function getPlaceDetailRich(
  userId: string,
  tripId: string,
  placeId: string,
): Promise<PlacesActionResult<{ place: PlaceDetail }>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  try {
    const cached = await PlaceCacheRepository.findDetailByGoogleId(placeId);
    if (cached) {
      return { success: true, data: { place: cached } };
    }

    const detailLimit = await enforceDetailLimit(userId);
    if (detailLimit) return detailLimit;

    const ownerKeys = await getOwnerApiKeysForTripDto(trip);
    assertGoogleMapsKey(ownerKeys, "trip");

    const { place } = await PlacesService.getPlaceDetailsRich(placeId, ownerKeys.googleMaps, tripContext(trip));
    return { success: true, data: { place } };
  } catch (err) {
    return actionError(err, "Failed to fetch place details");
  }
}

export async function geocodeHotel(
  userId: string,
  input: unknown,
): Promise<PlacesActionResult<{ coordinates: { lat: number; lng: number } }>> {
  const rateLimit = await enforceRateLimit(userId);
  if (rateLimit) return rateLimit;

  const parsed = geocodeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const keys = await getUserApiKeys(userId);
    assertGoogleMapsKey(keys, "profile");

    const coordinates = await PlacesService.geocodeAddress(parsed.data.address, keys.googleMaps);
    return { success: true, data: { coordinates } };
  } catch (err) {
    return actionError(err, "Geocoding failed");
  }
}

export async function discoverPlacesForTrip(
  userId: string,
  input: { tripId: string; forceRefresh?: boolean; legId?: string },
): Promise<PlacesActionResult<{ places: Place[]; legs?: TripLeg[] }>> {
  const { tripId, forceRefresh = false, legId: targetLegId } = input;

  const parsed = discoverTripPlacesSchema.safeParse({ tripId, forceRefresh, legId: targetLegId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid trip" };
  }

  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  try {
    const legs = getEffectiveLegs(trip);
    const isMultiLeg = trip.legs.length > 0;

    if (!forceRefresh) {
      const hasCachedPool = isMultiLeg
        ? legs.some((leg) => leg.discoveryPoolIds.length > 0)
        : (trip.discoveryPoolIds?.length ?? 0) > 0;

      if (hasCachedPool) {
        const poolIds = isMultiLeg ? getAggregatedDiscoveryPoolIds(trip) : (trip.discoveryPoolIds ?? []);
        const places = await PlacesService.getCachedPlaces(poolIds);
        return {
          success: true,
          data: { places, legs: isMultiLeg ? legs : undefined },
          message: `Loaded ${places.length} cached places`,
        };
      }
    }

    const ownerKeys = await getOwnerApiKeysForTripDto(trip);
    assertGoogleMapsKey(ownerKeys, "trip");

    const rateLimit = await enforceRateLimit(userId);
    if (rateLimit) return rateLimit;

    if (isMultiLeg) {
      const legsToDiscover = targetLegId ? legs.filter((leg) => leg.id === targetLegId) : legs;

      if (targetLegId && legsToDiscover.length === 0) {
        return { success: false, error: "Trip leg not found" };
      }

      const updatedLegs = [...trip.legs];

      for (const leg of legsToDiscover) {
        const places = await PlacesService.discoverPlacesForTrip({
          city: leg.baseCity,
          state: leg.state ?? trip.destinationState,
          country: leg.country,
          searchAreas: leg.dayTripAreas,
          interests: trip.interests,
          travelStyle: trip.travelStyle,
          mustVisitPlaces: trip.mustVisitPlaces,
          excludedPlaces: trip.excludedPlaces,
          hotelCoordinates: leg.hotelCoordinates ?? trip.hotelCoordinates,
          limit: Math.ceil(MAX_DISCOVERY_POOL_SIZE / Math.max(legs.length, 1)),
          googleMapsApiKey: ownerKeys.googleMaps,
        });

        const auxiliary = await discoverAuxiliaryPools(trip, leg, ownerKeys.googleMaps);

        const placeIds = places.map((p) => p.googlePlaceId).filter((id): id is string => !!id);
        const idx = updatedLegs.findIndex((l) => l.id === leg.id);
        if (idx >= 0) {
          updatedLegs[idx] = {
            ...updatedLegs[idx],
            discoveryPoolIds: placeIds,
            foodPoolIds: auxiliary.foodPoolIds,
            marketPoolIds: auxiliary.marketPoolIds,
            vehicleRentalSuggestions: auxiliary.vehicleRentalSuggestions,
          };
        }
      }

      const allIds = updatedLegs.flatMap((leg) => leg.discoveryPoolIds);
      await TripRepository.update(tripId, userId, {
        legs: updatedLegs,
        discoveryPoolIds: allIds,
      });

      const places = await PlacesService.getCachedPlaces(allIds);
      return {
        success: true,
        data: { places, legs: updatedLegs },
        message: `Discovered ${places.length} places across ${legsToDiscover.length} leg(s)`,
      };
    }

    const places = await PlacesService.discoverPlacesForTrip({
      city: trip.destinationCity,
      state: trip.destinationState,
      country: trip.destinationCountry,
      interests: trip.interests,
      travelStyle: trip.travelStyle,
      mustVisitPlaces: trip.mustVisitPlaces,
      excludedPlaces: trip.excludedPlaces,
      hotelCoordinates: trip.hotelCoordinates,
      googleMapsApiKey: ownerKeys.googleMaps,
    });

    const auxiliary = await discoverAuxiliaryPools(
      trip,
      {
        baseCity: trip.destinationCity,
        state: trip.destinationState,
        country: trip.destinationCountry,
        dayTripAreas: [],
        hotelCoordinates: trip.hotelCoordinates,
      },
      ownerKeys.googleMaps,
    );

    const placeIds = places.map((p) => p.googlePlaceId).filter((id): id is string => !!id);

    await TripRepository.update(tripId, userId, {
      discoveryPoolIds: placeIds,
      foodPoolIds: auxiliary.foodPoolIds,
      marketPoolIds: auxiliary.marketPoolIds,
      vehicleRentalSuggestions: auxiliary.vehicleRentalSuggestions,
    });

    return { success: true, data: { places }, message: `Discovered ${places.length} places` };
  } catch (err) {
    return actionError(err, "Discovery failed");
  }
}

export async function getTripDiscoveryPool(
  userId: string,
  tripId: string,
): Promise<PlacesActionResult<{ places: Place[] }>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const poolIds = getAggregatedDiscoveryPoolIds(trip);
  const places = await PlacesService.getCachedPlaces(poolIds);
  return { success: true, data: { places } };
}

export async function getTripSelectedPlaces(
  userId: string,
  tripId: string,
): Promise<PlacesActionResult<{ places: Place[] }>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const places = await PlacesService.getCachedPlaces(trip.selectedPlaceIds ?? []);
  return { success: true, data: { places } };
}

export async function addPlaceToTrip(
  userId: string,
  input: unknown,
): Promise<PlacesActionResult<{ places: Place[] }>> {
  const parsed = tripPlaceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tripId, placeId } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  if (trip.selectedPlaceIds.includes(placeId)) {
    const places = await PlacesService.getCachedPlaces(trip.selectedPlaceIds);
    return { success: true, data: { places }, message: "Place already in trip" };
  }

  try {
    const ownerKeys = await getOwnerApiKeysForTripDto(trip);
    assertGoogleMapsKey(ownerKeys, "trip");
    await PlacesService.getPlaceDetails(placeId, ownerKeys.googleMaps, tripContext(trip));
  } catch (err) {
    return actionError(err, "Failed to add place");
  }

  const updatedIds = [...trip.selectedPlaceIds, placeId];
  await TripRepository.update(tripId, userId, { selectedPlaceIds: updatedIds });

  const places = await PlacesService.getCachedPlaces(updatedIds);
  return { success: true, data: { places }, message: "Place added to trip" };
}

export async function removePlaceFromTrip(
  userId: string,
  input: unknown,
): Promise<PlacesActionResult<{ places: Place[] }>> {
  const parsed = tripPlaceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tripId, placeId } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const updatedIds = trip.selectedPlaceIds.filter((id) => id !== placeId);
  await TripRepository.update(tripId, userId, { selectedPlaceIds: updatedIds });

  const places = await PlacesService.getCachedPlaces(updatedIds);
  return { success: true, data: { places }, message: "Place removed from trip" };
}

export async function bulkAddPlacesToTrip(
  userId: string,
  input: unknown,
): Promise<PlacesActionResult<{ places: Place[] }>> {
  const parsed = bulkAddPlacesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tripId, placeIds } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const ctx = tripContext(trip);
  const merged = new Set(trip.selectedPlaceIds);

  try {
    const ownerKeys = await getOwnerApiKeysForTripDto(trip);
    assertGoogleMapsKey(ownerKeys, "trip");

    for (const placeId of placeIds) {
      if (!merged.has(placeId)) {
        await PlacesService.getPlaceDetails(placeId, ownerKeys.googleMaps, ctx);
        merged.add(placeId);
      }
    }
  } catch (err) {
    return actionError(err, "Failed to add places");
  }

  const updatedIds = Array.from(merged);
  await TripRepository.update(tripId, userId, { selectedPlaceIds: updatedIds });

  const places = await PlacesService.getCachedPlaces(updatedIds);
  return { success: true, data: { places }, message: `Added ${placeIds.length} place(s) to trip` };
}

export async function bulkRemovePlacesFromTrip(
  userId: string,
  input: unknown,
): Promise<PlacesActionResult<{ places: Place[] }>> {
  const parsed = bulkRemovePlacesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tripId, placeIds } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const removeSet = new Set(placeIds);
  const updatedIds = trip.selectedPlaceIds.filter((id) => !removeSet.has(id));
  await TripRepository.update(tripId, userId, { selectedPlaceIds: updatedIds });

  const places = await PlacesService.getCachedPlaces(updatedIds);
  return { success: true, data: { places }, message: `Removed ${placeIds.length} place(s) from trip` };
}

export async function addPlaceFromSearch(
  userId: string,
  input: unknown,
): Promise<PlacesActionResult<{ places: Place[]; place: Place }>> {
  const parsed = tripPlaceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tripId, placeId } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  try {
    const ownerKeys = await getOwnerApiKeysForTripDto(trip);
    assertGoogleMapsKey(ownerKeys, "trip");
    const place = await PlacesService.getPlaceDetails(placeId, ownerKeys.googleMaps, tripContext(trip));

    const merged = new Set(trip.selectedPlaceIds);
    merged.add(placeId);

    const updatedIds = Array.from(merged);
    await TripRepository.update(tripId, userId, { selectedPlaceIds: updatedIds });

    const places = await PlacesService.getCachedPlaces(updatedIds);
    return { success: true, data: { places, place }, message: "Place added to trip" };
  } catch (err) {
    return actionError(err, "Failed to add place");
  }
}
