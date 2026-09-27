import { randomUUID } from "crypto";
import { z } from "zod";
import { TripRepository } from "@/repositories/trip.repository";
import { retimeLegDaysAfterTripChange } from "@/modules/itinerary/services/itinerary.service";
import {
  BOOKING_TYPES,
  TRANSPORT_BOOKING_TYPES,
  type TripBooking,
} from "@/modules/trips/types/trip-extras.types";
import type { Trip } from "@/modules/trips/types/trip.types";

type Result<T> = { success: true; data: T; message?: string } | { success: false; error: string };

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");
const time = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:mm").optional(),
);
const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());

const bookingInputSchema = z
  .object({
    type: z.enum(BOOKING_TYPES),
    title: z.string().trim().min(1, "Give the booking a name").max(120),
    provider: optionalText(80),
    confirmationNumber: optionalText(60),
    startDate: date,
    startTime: time,
    endDate: z.preprocess((v) => (v === "" ? undefined : v), date.optional()),
    endTime: time,
    fromPlace: optionalText(120),
    toPlace: optionalText(120),
    transferId: optionalText(80),
    cost: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.number().min(0).max(100_000_000).optional()),
    currency: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().regex(/^[A-Za-z]{3}$/).transform((c) => c.toUpperCase()).optional(),
    ),
    url: optionalText(500),
    notes: optionalText(2000),
  })
  .refine((b) => !b.endDate || b.endDate >= b.startDate, { message: "End date is before start date", path: ["endDate"] });

function validateTransferLink(trip: Trip, booking: Omit<TripBooking, "id">): string | null {
  if (!booking.transferId) return null;
  if (!TRANSPORT_BOOKING_TYPES.includes(booking.type)) return "Only transport bookings can cover a transfer";
  if (!trip.transfers.some((t) => t.id === booking.transferId)) return "That transfer no longer exists";
  return null;
}

/** Legs whose days depend on this booking (a transfer booking moves both ends of the transfer). */
function affectedLegIds(trip: Trip, ...bookings: (Pick<TripBooking, "transferId"> | undefined)[]): string[] {
  const ids = new Set<string>();
  for (const booking of bookings) {
    const transfer = booking?.transferId ? trip.transfers.find((t) => t.id === booking.transferId) : undefined;
    if (transfer) {
      ids.add(transfer.fromLegId);
      ids.add(transfer.toLegId);
    }
  }
  return [...ids];
}

async function retimeLegs(trip: Trip, legIds: string[], label: string) {
  for (const legId of legIds) {
    try {
      await retimeLegDaysAfterTripChange(trip, legId, label);
    } catch {
      // The booking is saved; the plan catches up on the next edit.
    }
  }
}

export async function addBooking(userId: string, tripId: string, raw: unknown): Promise<Result<{ trip: Trip; booking: TripBooking }>> {
  const parsed = bookingInputSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid booking" };

  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };
  const linkError = validateTransferLink(trip, parsed.data);
  if (linkError) return { success: false, error: linkError };

  const booking: TripBooking = { id: randomUUID(), ...parsed.data };
  const updated = await TripRepository.addListItem(tripId, userId, "bookings", booking);
  if (!updated) return { success: false, error: "Trip not found" };

  await retimeLegs(updated, affectedLegIds(updated, booking), `Add booking ${booking.title}`);
  return { success: true, data: { trip: updated, booking }, message: "Booking added" };
}

export async function updateBooking(
  userId: string,
  tripId: string,
  bookingId: string,
  raw: unknown,
): Promise<Result<{ trip: Trip; booking: TripBooking }>> {
  const parsed = bookingInputSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid booking" };

  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };
  const previous = trip.bookings.find((b) => b.id === bookingId);
  if (!previous) return { success: false, error: "Booking not found" };
  const linkError = validateTransferLink(trip, parsed.data);
  if (linkError) return { success: false, error: linkError };

  const booking: TripBooking = { id: bookingId, ...parsed.data };
  const updated = await TripRepository.replaceListItem(tripId, userId, "bookings", booking);
  if (!updated) return { success: false, error: "Booking not found" };

  await retimeLegs(updated, affectedLegIds(updated, previous, booking), `Edit booking ${booking.title}`);
  return { success: true, data: { trip: updated, booking }, message: "Booking updated" };
}

export async function removeBooking(userId: string, tripId: string, bookingId: string): Promise<Result<{ trip: Trip }>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };
  const previous = trip.bookings.find((b) => b.id === bookingId);
  if (!previous) return { success: false, error: "Booking not found" };

  const updated = await TripRepository.removeListItem(tripId, userId, "bookings", bookingId);
  if (!updated) return { success: false, error: "Trip not found" };

  await retimeLegs(updated, affectedLegIds(trip, previous), `Remove booking ${previous.title}`);
  return { success: true, data: { trip: updated }, message: "Booking removed" };
}
