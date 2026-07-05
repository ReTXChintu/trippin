"use server";

import { getAuthUserId } from "@/lib/api/request-context";
import { TripRepository } from "@/repositories/trip.repository";
import { parseTripPrompt } from "@/services/nlp-trip-parser.service";
import {
  buildTripInputFromRaw,
  createTripSchema,
  generateTripPromptSchema,
  updateTripSchema,
} from "@/modules/trips/validators/trip.validator";
import type { Trip, TripStats } from "@/modules/trips/types/trip.types";
import type { TripStatus } from "@/types";
import { parseStringArrayFromForm } from "@/utils/trip.utils";
import { revalidatePath } from "next/cache";

export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

async function requireUserId(): Promise<string | null> {
  return getAuthUserId();
}

function formDataToRaw(formData: FormData): Record<string, unknown> {
  return {
    title: formData.get("title"),
    destinationCity: formData.get("destinationCity"),
    destinationState: formData.get("destinationState") || undefined,
    destinationCountry: formData.get("destinationCountry"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    arrivalTime: formData.get("arrivalTime") || undefined,
    departureTime: formData.get("departureTime") || undefined,
    hotelName: formData.get("hotelName") || undefined,
    hotelAddress: formData.get("hotelAddress") || undefined,
    hotelLat: formData.get("hotelLat"),
    hotelLng: formData.get("hotelLng"),
    legs: formData.get("legs") || "[]",
    transfers: formData.get("transfers") || "[]",
    useFlexibleSchedule: formData.get("useFlexibleSchedule") === "true" || formData.get("useFlexibleSchedule") === "on",
    dailyStartTime: formData.get("dailyStartTime") || "09:00",
    dailyEndTime: formData.get("dailyEndTime") || "20:00",
    transportationMode: formData.get("transportationMode") || "Walking",
    travelStyle: formData.get("travelStyle") || "Balanced",
    budgetLevel: formData.get("budgetLevel") || undefined,
    interests: parseStringArrayFromForm(formData, "interests"),
    mustVisitPlaces: parseStringArrayFromForm(formData, "mustVisitPlaces"),
    excludedPlaces: parseStringArrayFromForm(formData, "excludedPlaces"),
    notes: formData.get("notes") || undefined,
    status: formData.get("status") || "draft",
  };
}

function parseCoordinates(data: { hotelLat?: string; hotelLng?: string }) {
  const lat = data.hotelLat ? Number(data.hotelLat) : undefined;
  const lng = data.hotelLng ? Number(data.hotelLng) : undefined;
  if (lat !== undefined && !Number.isNaN(lat) && lng !== undefined && !Number.isNaN(lng)) {
    return { lat, lng };
  }
  return undefined;
}

import { ItineraryRepository } from "@/repositories/itinerary.repository";
import { syncTripDatesFromLegs } from "@/modules/trips/utils/trip-leg.utils";

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

function toCreatePayload(data: ReturnType<typeof createTripSchema.parse>, userId: string) {
  return { userId, ...toTripPayload(data) };
}

export async function createTripAction(formData: FormData): Promise<ActionResult<{ trip: Trip }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const raw = buildTripInputFromRaw(formDataToRaw(formData));
  return createTripFromRaw(userId, raw);
}

export async function createTripFromRaw(
  userId: string,
  raw: Record<string, unknown>,
): Promise<ActionResult<{ trip: Trip }>> {
  const parsed = createTripSchema.safeParse(buildTripInputFromRaw(raw));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const trip = await TripRepository.create(toCreatePayload(parsed.data, userId));
  revalidatePath("/dashboard");
  revalidatePath("/trips");
  return { success: true, data: { trip }, message: "Trip created successfully" };
}

export async function updateTripAction(
  tripId: string,
  formData: FormData,
): Promise<ActionResult<{ trip: Trip }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const raw = buildTripInputFromRaw(formDataToRaw(formData));
  return updateTripFromRaw(tripId, userId, raw);
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

  revalidatePath("/dashboard");
  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: { trip }, message: "Trip updated successfully" };
}

export async function deleteTripAction(tripId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const trip = await TripRepository.findByIdForOwner(tripId, userId);
  if (!trip) return { success: false, error: "Only the trip owner can delete this trip" };

  const deleted = await TripRepository.delete(tripId, userId);
  if (!deleted) return { success: false, error: "Trip not found" };

  await ItineraryRepository.deleteByTripId(tripId);

  revalidatePath("/dashboard");
  revalidatePath("/trips");
  return { success: true, message: "Trip deleted" };
}

export async function duplicateTripAction(tripId: string): Promise<ActionResult<{ trip: Trip }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const trip = await TripRepository.duplicate(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  revalidatePath("/trips");
  revalidatePath("/dashboard");
  return { success: true, data: { trip }, message: "Trip duplicated" };
}

export async function archiveTripAction(tripId: string): Promise<ActionResult<{ trip: Trip }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const trip = await TripRepository.archive(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  revalidatePath("/trips");
  revalidatePath("/dashboard");
  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: { trip }, message: "Trip archived" };
}

export async function shareTripAction(tripId: string): Promise<ActionResult<{ trip: Trip; shareUrl: string }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const trip = await TripRepository.enableSharing(tripId, userId);
  if (!trip?.publicSlug) return { success: false, error: "Trip not found" };

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const shareUrl = `${baseUrl}/share/${trip.publicSlug}`;

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: { trip, shareUrl }, message: "Sharing enabled" };
}

export async function unshareTripAction(tripId: string): Promise<ActionResult<{ trip: Trip }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const trip = await TripRepository.disableSharing(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  revalidatePath(`/trips/${tripId}`);
  return { success: true, data: { trip }, message: "Sharing disabled" };
}

export async function generateTripFromPromptAction(
  prompt: string,
): Promise<ActionResult<{ trip: Trip; confidence: number }>> {
  const userId = await requireUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

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

  revalidatePath("/dashboard");
  revalidatePath("/trips");
  return {
    success: true,
    data: { trip, confidence },
    message: `Trip draft created (${Math.round(confidence * 100)}% confidence)`,
  };
}

export async function getTripsAction(status?: TripStatus): Promise<Trip[]> {
  const userId = await requireUserId();
  if (!userId) return [];
  return TripRepository.findByUser(userId, status ? { status } : undefined);
}

export async function getTripByIdAction(tripId: string): Promise<Trip | null> {
  const userId = await requireUserId();
  if (!userId) return null;
  return TripRepository.findByIdForUser(tripId, userId);
}

export async function getTripStatsAction(): Promise<TripStats> {
  const userId = await requireUserId();
  if (!userId) {
    return { totalTrips: 0, upcomingTrips: 0, completedTrips: 0, archivedTrips: 0 };
  }
  return TripRepository.getStats(userId);
}

export async function getUpcomingTripsAction(): Promise<Trip[]> {
  const userId = await requireUserId();
  if (!userId) return [];
  return TripRepository.findUpcoming(userId);
}

export async function getRecentTripsAction(): Promise<Trip[]> {
  const userId = await requireUserId();
  if (!userId) return [];
  return TripRepository.findRecent(userId);
}

export async function getPublicTripAction(slug: string): Promise<Trip | null> {
  return TripRepository.findByPublicSlug(slug);
}
