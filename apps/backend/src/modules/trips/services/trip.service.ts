import { TripRepository } from "@/repositories/trip.repository";
import { ItineraryRepository } from "@/repositories/itinerary.repository";
import { parseTripPrompt } from "@/services/nlp-trip-parser.service";
import {
  buildTripInputFromRaw,
  createTripSchema,
  generateTripPromptSchema,
  updateTripSchema,
} from "@/modules/trips/validators/trip.validator";
import type { Trip, TripStats } from "@/modules/trips/types/trip.types";
import type { TripStatus } from "@/types";
import { syncTripDatesFromLegs } from "@/modules/trips/utils/trip-leg.utils";

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
    legs: data.legs,
    transfers: data.transfers,
    dailyStartTime: data.dailyStartTime,
    dailyEndTime: data.dailyEndTime,
    useFlexibleSchedule: data.useFlexibleSchedule,
    transportationMode: data.transportationMode,
    travelStyle: data.travelStyle,
    budgetLevel: data.budgetLevel,
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

  return { success: true, message: "Trip deleted" };
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
): Promise<ActionResult<{ trip: Trip; confidence: number }>> {
  const parsed = generateTripPromptSchema.safeParse({ prompt });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid prompt" };
  }

  const { draft, confidence, companions } = parseTripPrompt(parsed.data.prompt);

  if (!draft.destinationCity) {
    return {
      success: false,
      error: "Could not detect a destination. Try mentioning a city like Ajmer or Jaipur.",
    };
  }

  const notesParts: string[] = [];
  if (companions.length > 0) {
    notesParts.push(`Traveling with: ${companions.join(", ")}`);
  }
  notesParts.push(`Generated from: "${parsed.data.prompt.slice(0, 200)}"`);

  const trip = await TripRepository.create({
    userId,
    title: draft.title ?? `${draft.destinationCity} Trip`,
    destinationCity: draft.destinationCity,
    destinationState: draft.destinationState,
    destinationCountry: draft.destinationCountry ?? "India",
    startDate: new Date(draft.startDate ?? new Date()),
    endDate: new Date(draft.endDate ?? new Date()),
    hotelName: draft.hotelName,
    hotelAddress: draft.hotelAddress,
    travelStyle: draft.travelStyle ?? "Balanced",
    interests: draft.interests ?? [],
    notes: notesParts.join("\n"),
    status: "draft",
    transportationMode: companions.includes("parents") ? "Cab" : "Walking",
  });

  return {
    success: true,
    data: { trip, confidence },
    message: `Trip draft created (${Math.round(confidence * 100)}% confidence)`,
  };
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
