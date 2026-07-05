"use server";

import { getAuthUserId } from "@/lib/api/request-context";
import { getAIProvider } from "@/lib/ai";
import {
  ApiKeyError,
  assertOpenAiKey,
  getOwnerApiKeysForTripDto,
} from "@/lib/services/trip-api-keys.service";
import { PlacesService } from "@/modules/places/services/places.service";
import {
  generateItineraryDays,
  reorderDayStops,
} from "@/modules/itinerary/services/itinerary-engine.service";
import { buildVisitIntelSummary } from "@/modules/itinerary/services/itinerary-enrichment.service";
import type { Itinerary } from "@/modules/itinerary/types";
import type { Place } from "@/modules/places/types/place.types";
import type { Trip } from "@/modules/trips/types/trip.types";
import {
  reorderStopsSchema,
  tripIdSchema,
} from "@/modules/itinerary/validators/itinerary.validator";
import { TripRepository } from "@/repositories/trip.repository";
import { ItineraryRepository } from "@/repositories/itinerary.repository";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import { revalidatePath } from "next/cache";

export type ItineraryActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

async function requireUserId(): Promise<string | null> {
  return getAuthUserId();
}

function actionError<T = void>(err: unknown, fallback: string): ItineraryActionResult<T> {
  if (err instanceof ApiKeyError) {
    return { success: false, error: err.message };
  }
  return {
    success: false,
    error: err instanceof Error ? err.message : fallback,
  };
}

function getStartPointFromTrip(trip: Awaited<ReturnType<typeof TripRepository.findByIdForUser>>) {
  if (!trip) return null;
  if (trip.hotelCoordinates) return trip.hotelCoordinates;
  return null;
}

export async function getItineraryForTripAction(
  tripId: string,
): Promise<ItineraryActionResult<{ itinerary: Itinerary | null }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const itinerary = await ItineraryRepository.findByTripId(tripId);
  return { success: true, data: { itinerary } };
}

export async function generateItineraryAction(
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const parsed = tripIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tripId } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const placeIds = trip.selectedPlaceIds ?? [];
  if (placeIds.length === 0) {
    return {
      success: false,
      error: "Discover places first before generating an itinerary.",
    };
  }

  try {
    const places = await PlacesService.getCachedPlaces(placeIds);
    const withCoords = places.filter((p) => p.coordinates);

    if (withCoords.length === 0) {
      return {
        success: false,
        error: "No cached place coordinates found. Try discovering places again.",
      };
    }

    const allPoolIds = [
      ...(trip.foodPoolIds ?? []),
      ...(trip.marketPoolIds ?? []),
      ...trip.legs.flatMap((leg) => [...leg.foodPoolIds, ...leg.marketPoolIds]),
    ];
    const auxiliaryPlaces =
      allPoolIds.length > 0 ? await PlacesService.getCachedPlaces(allPoolIds) : [];
    const foodPlaces = auxiliaryPlaces.filter((p) =>
      [
        ...(trip.foodPoolIds ?? []),
        ...trip.legs.flatMap((leg) => leg.foodPoolIds),
      ].includes(p.googlePlaceId ?? ""),
    );
    const marketPlaces = auxiliaryPlaces.filter((p) =>
      [
        ...(trip.marketPoolIds ?? []),
        ...trip.legs.flatMap((leg) => leg.marketPoolIds),
      ].includes(p.googlePlaceId ?? ""),
    );

    const days = generateItineraryDays(trip, places, { foodPlaces, marketPlaces });
    const totalStops = days.reduce((sum, d) => sum + d.stops.length, 0);

    if (totalStops === 0) {
      return {
        success: false,
        error: "Could not fit any stops into your daily schedule. Try extending daily hours or reducing trip length.",
      };
    }

    const itinerary = await ItineraryRepository.upsertForTrip(tripId, trip.userId, days);

    revalidatePath(`/trips/${tripId}`);
    revalidatePath(`/trips/${tripId}/itinerary`);

    return {
      success: true,
      data: { itinerary },
      message: `Itinerary generated with ${totalStops} stops across ${days.length} days.`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate itinerary",
    };
  }
}

export async function reorderItineraryStopsAction(
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const parsed = reorderStopsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tripId, dayNumber, stopIds } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const existing = await ItineraryRepository.findByTripId(tripId);
  if (!existing) return { success: false, error: "Itinerary not found" };

  const day = existing.days.find((d) => d.dayNumber === dayNumber);
  if (!day) return { success: false, error: "Day not found" };

  const startPoint = getStartPointFromTrip(trip);
  if (!startPoint) {
    const firstStop = day.stops.find((s) => s.coordinates);
    if (!firstStop?.coordinates) {
      return { success: false, error: "No start point available for routing" };
    }
  }

  const routingStart =
    startPoint ??
    day.stops.find((s) => s.coordinates)!.coordinates!;

  const updatedDay = reorderDayStops(day, stopIds, trip, routingStart);
  const itinerary = await ItineraryRepository.updateDayStops(
    tripId,
    trip.userId,
    dayNumber,
    updatedDay.stops,
  );

  if (!itinerary) return { success: false, error: "Failed to update itinerary" };

  revalidatePath(`/trips/${tripId}/itinerary`);

  return { success: true, data: { itinerary } };
}

export async function getPublicItineraryAction(
  slug: string,
): Promise<ItineraryActionResult<{ itinerary: Itinerary | null }>> {
  const trip = await TripRepository.findByPublicSlug(slug);
  if (!trip) return { success: false, error: "Trip not found" };

  const itinerary = await ItineraryRepository.findByTripIdOnly(trip.id);
  return { success: true, data: { itinerary } };
}

export async function generateItinerarySummaryAction(
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary; summary: string }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const parsed = tripIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tripId } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const existing = await ItineraryRepository.findByTripId(tripId);
  if (!existing || existing.days.every((d) => d.stops.length === 0)) {
    return { success: false, error: "Generate an itinerary first." };
  }

  try {
    const ownerKeys = await getOwnerApiKeysForTripDto(trip);
    assertOpenAiKey(ownerKeys, "trip");

    const summary = await getAIProvider(ownerKeys.openai).generateSummary({
      trip,
      days: existing.days,
    });

    const itinerary = await ItineraryRepository.updateSummary(tripId, trip.userId, summary);
    if (!itinerary) return { success: false, error: "Failed to save summary" };

    revalidatePath(`/trips/${tripId}/itinerary`);
    if (trip.publicSlug) {
      revalidatePath(`/share/${trip.publicSlug}`);
    }

    return {
      success: true,
      data: { itinerary, summary },
      message: "Trip summary generated.",
    };
  } catch (err) {
    return actionError(err, "Failed to generate summary");
  }
}

export async function optimizeItineraryAction(
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const parsed = tripIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tripId } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const existing = await ItineraryRepository.findByTripId(tripId);
  if (!existing || existing.days.every((d) => d.stops.length === 0)) {
    return { success: false, error: "Generate an itinerary first." };
  }

  try {
    const ownerKeys = await getOwnerApiKeysForTripDto(trip);
    assertOpenAiKey(ownerKeys, "trip");

    const optimizedDays = await getAIProvider(ownerKeys.openai).optimizeItinerary({
      trip,
      days: existing.days,
    });

    const itinerary = await ItineraryRepository.upsertDays(tripId, trip.userId, optimizedDays, {
      clearSummary: true,
    });

    revalidatePath(`/trips/${tripId}/itinerary`);
    if (trip.publicSlug) {
      revalidatePath(`/share/${trip.publicSlug}`);
    }

    return {
      success: true,
      data: { itinerary },
      message: "Itinerary optimized for shorter travel times.",
    };
  } catch (err) {
    return actionError(err, "Failed to optimize itinerary");
  }
}

export async function enrichItineraryAction(
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary; trip: Trip }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const parsed = tripIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { tripId } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const existing = await ItineraryRepository.findByTripId(tripId);
  if (!existing || existing.days.every((d) => d.stops.length === 0)) {
    return { success: false, error: "Generate an itinerary first." };
  }

  try {
    const ownerKeys = await getOwnerApiKeysForTripDto(trip);
    assertOpenAiKey(ownerKeys, "trip");

    const poolIds = [
      ...getEffectiveLegs(trip).flatMap((leg) => [
        ...leg.discoveryPoolIds,
        ...leg.foodPoolIds,
        ...leg.marketPoolIds,
      ]),
      ...(trip.discoveryPoolIds ?? []),
      ...(trip.foodPoolIds ?? []),
      ...(trip.marketPoolIds ?? []),
      ...trip.selectedPlaceIds,
    ];
    const uniqueIds = [...new Set(poolIds)];
    const allPlaces = await PlacesService.getCachedPlaces(uniqueIds);
    const placeMap = new Map<string, Place>();
    for (const place of allPlaces) {
      if (place.googlePlaceId) placeMap.set(place.googlePlaceId, place);
    }

    const ai = getAIProvider(ownerKeys.openai);
    const legs = getEffectiveLegs(trip);
    const updatedLegs = trip.legs.length > 0 ? [...trip.legs] : [];
    let updatedTrip = trip;

    if (trip.legs.length > 0) {
      for (const leg of legs) {
        const legPlaces = allPlaces.filter((p) =>
          leg.discoveryPoolIds.includes(p.googlePlaceId ?? ""),
        );
        const foodPlaces = allPlaces.filter((p) =>
          leg.foodPoolIds.includes(p.googlePlaceId ?? ""),
        );
        const marketPlaces = allPlaces.filter((p) =>
          leg.marketPoolIds.includes(p.googlePlaceId ?? ""),
        );
        const brief = await ai.generateLegBrief({
          trip,
          leg,
          places: legPlaces,
          foodPlaces,
          marketPlaces,
        });
        const idx = updatedLegs.findIndex((l) => l.id === leg.id);
        if (idx >= 0) updatedLegs[idx] = { ...updatedLegs[idx], destinationBrief: brief };
      }
      updatedTrip = (await TripRepository.update(tripId, userId, { legs: updatedLegs })) ?? trip;
    } else {
      const legacyLeg = legs[0];
      const brief = await ai.generateLegBrief({
        trip,
        leg: legacyLeg,
        places: allPlaces.filter((p) => trip.discoveryPoolIds.includes(p.googlePlaceId ?? "")),
        foodPlaces: allPlaces.filter((p) => trip.foodPoolIds.includes(p.googlePlaceId ?? "")),
        marketPlaces: allPlaces.filter((p) => trip.marketPoolIds.includes(p.googlePlaceId ?? "")),
      });
      updatedTrip = (await TripRepository.update(tripId, userId, { destinationBrief: brief })) ?? trip;
    }

    const intelMap = await ai.generateVisitIntel({
      trip,
      days: existing.days,
      placeMap,
    });

    const enrichedDays = existing.days.map((day) => ({
      ...day,
      stops: day.stops.map((stop) => {
        const visitIntel = intelMap.get(stop.id);
        if (!visitIntel) return stop;
        return {
          ...stop,
          visitIntel,
          aiNotes: buildVisitIntelSummary(visitIntel),
        };
      }),
    }));

    const itinerary = await ItineraryRepository.upsertDays(tripId, trip.userId, enrichedDays);

    revalidatePath(`/trips/${tripId}`);
    revalidatePath(`/trips/${tripId}/itinerary`);

    return {
      success: true,
      data: { itinerary, trip: updatedTrip },
      message: "Travel guide and visit notes generated.",
    };
  } catch (err) {
    return actionError(err, "Failed to enrich itinerary");
  }
}
