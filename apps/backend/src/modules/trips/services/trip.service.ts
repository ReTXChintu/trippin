import { TripRepository } from "@/repositories/trip.repository";
import { ItineraryRepository } from "@/repositories/itinerary.repository";
import { createTripFromPrompt } from "@/modules/trips/services/trip-prompt.service";
import {
  buildTripInputFromRaw,
  createTripSchema,
  generateTripPromptSchema,
  updateTripSchema,
} from "@/modules/trips/validators/trip.validator";
import type { Trip, TripStats } from "@/modules/trips/types/trip.types";
import type { TripStatus } from "@/types";
import {
  buildTripDayPlans,
  isDayOwnedByLeg,
  syncTripDatesFromLegs,
} from "@/modules/trips/utils/trip-leg.utils";
import { syncLegacyHotelFields } from "@/modules/trips/utils/stay.utils";
import { locateDayTrips, normalizeDayTrips } from "@/modules/trips/utils/day-trips";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import { defaultCurrencyFor } from "@/utils/currency";
import { deleteExpensesForTrip } from "@/modules/trips/services/trip-budget.service";
import { deleteCollabDataForTrip } from "@/modules/trips/services/trip-collab.service";

export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

function parseCoordinates(data: { hotelLat?: string; hotelLng?: string }) {
  const lat = data.hotelLat ? Number(data.hotelLat) : undefined;
  const lng = data.hotelLng ? Number(data.hotelLng) : undefined;
  if (lat !== undefined && !Number.isNaN(lat) && lng !== undefined && !Number.isNaN(lng)) {
    return { lat, lng };
  }
  return undefined;
}

function toTripPayload(data: ReturnType<typeof createTripSchema.parse>) {
  const synced = data.legs.length > 0 ? syncTripDatesFromLegs(data.legs, data.transfers) : null;

  return {
    title: data.title,
    destinationCity: synced?.destinationCity ?? data.destinationCity,
    destinationState: data.destinationState,
    destinationCountry: data.destinationCountry,
    startDate: new Date(synced?.startDate ?? data.startDate),
    endDate: new Date(synced?.endDate ?? data.endDate),
    arrivalTime: data.legs.length > 0 ? undefined : data.arrivalTime,
    departureTime: data.legs.length > 0 ? undefined : data.departureTime,
    hotelName: data.hotelName,
    hotelAddress: data.hotelAddress,
    hotelCoordinates: parseCoordinates(data),
    // Legs with stays mirror their first stay into the legacy hotel* fields older readers use.
    legs: data.legs.map((leg) => (leg.stays.length > 0 ? syncLegacyHotelFields(leg) : leg)),
    transfers: data.transfers,
    dailyStartTime: data.dailyStartTime,
    dailyEndTime: data.dailyEndTime,
    useFlexibleSchedule: data.useFlexibleSchedule,
    transportationMode: data.transportationMode,
    travelStyle: data.travelStyle,
    budgetLevel: data.budgetLevel,
    currency: data.currency ?? defaultCurrencyFor(data.destinationCountry),
    budgetAmount: data.budgetAmount,
    interests: data.interests,
    mustVisitPlaces: data.mustVisitPlaces,
    excludedPlaces: data.excludedPlaces,
    notes: data.notes,
    status: data.status,
  };
}

export async function createTripFromRaw(
  userId: string,
  raw: Record<string, unknown>,
): Promise<ActionResult<{ trip: Trip }>> {
  const parsed = createTripSchema.safeParse(buildTripInputFromRaw(raw));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  parsed.data.legs = (await Promise.all(
    parsed.data.legs.map((leg) => locateDayTrips(normalizeDayTrips(leg as TripLeg))),
  )) as typeof parsed.data.legs;
  const trip = await TripRepository.create({ userId, ...toTripPayload(parsed.data) });
  return { success: true, data: { trip }, message: "Trip created successfully" };
}

export async function updateTripFromRaw(
  tripId: string,
  userId: string,
  raw: Record<string, unknown>,
): Promise<ActionResult<{ trip: Trip }>> {
  const parsed = updateTripSchema.safeParse(buildTripInputFromRaw(raw));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Clients that predate stays (e.g. the mobile app) send legs without the field — keep what's
  // stored instead of letting the schema default wipe it to [].
  const rawLegs = buildTripInputFromRaw(raw).legs as Array<Record<string, unknown>>;
  const legsWithoutStays = new Set(rawLegs.filter((l) => !("stays" in l)).map((l) => String(l.id)));
  const existing = await TripRepository.findByIdForUser(tripId, userId);
  if (legsWithoutStays.size > 0) {
    const storedStays = new Map((existing?.legs ?? []).map((l) => [l.id, l.stays]));
    parsed.data.legs = parsed.data.legs.map((leg) =>
      legsWithoutStays.has(leg.id) ? { ...leg, stays: storedStays.get(leg.id) ?? [] } : leg,
    );
  }
  // Day trips: keep dates/locations for clients that only send names, locate new ones.
  const storedLegs = new Map((existing?.legs ?? []).map((l) => [l.id, l]));
  parsed.data.legs = parsed.data.legs.map((leg) =>
    leg.placeAreas ? leg : { ...leg, placeAreas: storedLegs.get(leg.id)?.placeAreas ?? {} },
  );
  parsed.data.legs = (await Promise.all(
    parsed.data.legs.map((leg) => locateDayTrips(normalizeDayTrips(leg as TripLeg, storedLegs.get(leg.id)))),
  )) as typeof parsed.data.legs;

  const trip = await TripRepository.update(tripId, userId, toTripPayload(parsed.data));
  if (!trip) return { success: false, error: "Trip not found" };

  return { success: true, data: { trip }, message: "Trip updated successfully" };
}

export async function deleteTrip(tripId: string, userId: string): Promise<ActionResult> {
  const trip = await TripRepository.findByIdForOwner(tripId, userId);
  if (!trip) return { success: false, error: "Only the trip owner can delete this trip" };

  const deleted = await TripRepository.delete(tripId, userId);
  if (!deleted) return { success: false, error: "Trip not found" };

  await ItineraryRepository.deleteByTripId(tripId);
  await deleteExpensesForTrip(tripId);
  await deleteCollabDataForTrip(tripId);

  return { success: true, message: "Trip deleted" };
}

export async function removeLegFromTrip(
  tripId: string,
  userId: string,
  legId: string,
): Promise<ActionResult<{ trip: Trip }>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  if (trip.legs.length <= 1) {
    return {
      success: false,
      error: "Can't delete the only leg. Add another leg first, or delete the whole trip.",
    };
  }

  if (!trip.legs.some((l) => l.id === legId)) {
    return { success: false, error: "Trip leg not found" };
  }

  const nextLegs = trip.legs
    .filter((l) => l.id !== legId)
    .sort((a, b) => a.order - b.order)
    .map((l, i) => ({ ...l, order: i }));

  const nextTransfers = trip.transfers.filter((t) => t.fromLegId !== legId && t.toLegId !== legId);

  const synced = syncTripDatesFromLegs(nextLegs, nextTransfers);

  const updated = await TripRepository.update(tripId, userId, {
    legs: nextLegs,
    transfers: nextTransfers,
    discoveryPoolIds: Array.from(new Set(nextLegs.flatMap((l) => l.discoveryPoolIds))),
    foodPoolIds: Array.from(new Set(nextLegs.flatMap((l) => l.foodPoolIds))),
    marketPoolIds: Array.from(new Set(nextLegs.flatMap((l) => l.marketPoolIds))),
    ...(synced
      ? {
          startDate: new Date(synced.startDate),
          endDate: new Date(synced.endDate),
          destinationCity: synced.destinationCity,
        }
      : {}),
  });

  if (!updated) return { success: false, error: "Failed to update trip" };

  const existingItinerary = await ItineraryRepository.findByTripId(tripId);
  if (existingItinerary) {
    const dayPlans = buildTripDayPlans(trip);
    const remainingDays = existingItinerary.days
      .filter((d) => !isDayOwnedByLeg(d.date, dayPlans, legId))
      .map((d, i) => ({ ...d, dayNumber: i + 1 }));

    if (remainingDays.length === 0) {
      await ItineraryRepository.deleteByTripId(tripId);
    } else {
      await ItineraryRepository.upsertDays(tripId, userId, remainingDays);
    }
  }

  return { success: true, data: { trip: updated }, message: "Leg deleted" };
}

export async function duplicateTrip(tripId: string, userId: string): Promise<ActionResult<{ trip: Trip }>> {
  const trip = await TripRepository.duplicate(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };
  return { success: true, data: { trip }, message: "Trip duplicated" };
}

export async function archiveTrip(tripId: string, userId: string): Promise<ActionResult<{ trip: Trip }>> {
  const trip = await TripRepository.archive(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };
  return { success: true, data: { trip }, message: "Trip archived" };
}

export async function shareTrip(
  tripId: string,
  userId: string,
): Promise<ActionResult<{ trip: Trip; shareUrl: string }>> {
  const trip = await TripRepository.enableSharing(tripId, userId);
  if (!trip?.publicSlug) return { success: false, error: "Trip not found" };

  const baseUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
  const shareUrl = `${baseUrl}/share/${trip.publicSlug}`;

  return { success: true, data: { trip, shareUrl }, message: "Sharing enabled" };
}

export async function unshareTrip(tripId: string, userId: string): Promise<ActionResult<{ trip: Trip }>> {
  const trip = await TripRepository.disableSharing(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };
  return { success: true, data: { trip }, message: "Sharing disabled" };
}

export async function generateTripFromPrompt(
  userId: string,
  prompt: string,
): Promise<ActionResult<{ trip: Trip; confidence: number; usedAi: boolean }>> {
  const parsed = generateTripPromptSchema.safeParse({ prompt });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid prompt" };
  }
  return createTripFromPrompt(userId, parsed.data.prompt);
}

export async function getTrips(userId: string, status?: TripStatus): Promise<Trip[]> {
  return TripRepository.findByUser(userId, status ? { status } : undefined);
}

export async function getTripById(tripId: string, userId: string): Promise<Trip | null> {
  return TripRepository.findByIdForUser(tripId, userId);
}

export async function getTripStats(userId: string): Promise<TripStats> {
  return TripRepository.getStats(userId);
}

export async function getUpcomingTrips(userId: string): Promise<Trip[]> {
  return TripRepository.findUpcoming(userId);
}

export async function getRecentTrips(userId: string): Promise<Trip[]> {
  return TripRepository.findRecent(userId);
}

export async function getPublicTrip(slug: string): Promise<Trip | null> {
  return TripRepository.findByPublicSlug(slug);
}
