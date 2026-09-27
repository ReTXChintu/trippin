import { randomUUID } from "crypto";
import { z } from "zod";
import { TripRepository } from "@/repositories/trip.repository";
import { getTripWeatherForTrip } from "@/modules/trips/services/trip-weather.service";
import { getEffectiveLegs, getEffectiveTransfers } from "@/modules/trips/utils/trip-leg.utils";
import { getUncoveredNights } from "@/modules/trips/utils/stay.utils";
import {
  CHECKLIST_CATEGORIES,
  TRANSPORT_BOOKING_TYPES,
  type ChecklistCategory,
  type ChecklistItem,
} from "@/modules/trips/types/trip-extras.types";
import type { Trip } from "@/modules/trips/types/trip.types";

type Result<T> = { success: true; data: T; message?: string } | { success: false; error: string };

const itemInputSchema = z.object({
  text: z.string().trim().min(1, "Write something").max(200),
  category: z.enum(CHECKLIST_CATEGORIES),
  done: z.boolean().optional(),
  dueDate: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  assigneeId: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(64).optional()),
});

const itemPatchSchema = itemInputSchema.partial();

const addManySchema = z.object({ items: z.array(itemInputSchema).min(1).max(60) });

export async function addChecklistItems(userId: string, tripId: string, raw: unknown): Promise<Result<{ trip: Trip }>> {
  const parsed = addManySchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid item" };

  let trip: Trip | null = null;
  for (const input of parsed.data.items) {
    const item: ChecklistItem = { id: randomUUID(), done: false, ...input };
    trip = await TripRepository.addListItem(tripId, userId, "checklist", item);
    if (!trip) return { success: false, error: "Trip not found" };
  }
  return { success: true, data: { trip: trip! } };
}

export async function updateChecklistItem(
  userId: string,
  tripId: string,
  itemId: string,
  raw: unknown,
): Promise<Result<{ trip: Trip }>> {
  const parsed = itemPatchSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid item" };

  const trip = await TripRepository.findByIdForUser(tripId, userId);
  const existing = trip?.checklist.find((c) => c.id === itemId);
  if (!trip || !existing) return { success: false, error: "Item not found" };

  const updated = await TripRepository.replaceListItem(tripId, userId, "checklist", { ...existing, ...parsed.data });
  if (!updated) return { success: false, error: "Item not found" };
  return { success: true, data: { trip: updated } };
}

export async function removeChecklistItem(userId: string, tripId: string, itemId: string): Promise<Result<{ trip: Trip }>> {
  const updated = await TripRepository.removeListItem(tripId, userId, "checklist", itemId);
  if (!updated) return { success: false, error: "Trip not found" };
  return { success: true, data: { trip: updated } };
}

export interface ChecklistSuggestion {
  text: string;
  category: ChecklistCategory;
  /** Why it's suggested, e.g. "Rain likely on Tue 6 Oct". */
  reason?: string;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/** Items tailored to this trip — weather, length, interests, bookings still missing — minus ones
 * already on the list. */
export async function getChecklistSuggestions(userId: string, tripId: string): Promise<Result<{ suggestions: ChecklistSuggestion[] }>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const suggestions: ChecklistSuggestion[] = [];
  const add = (category: ChecklistCategory, text: string, reason?: string) => suggestions.push({ category, text, reason });
  const nights = Math.max(daysBetween(trip.startDate.slice(0, 10), trip.endDate.slice(0, 10)), 1);

  // Documents
  add("documents", "ID / passport");
  add("documents", "Hotel booking confirmations (offline copy)");
  if (trip.bookings.some((b) => b.type === "flight")) {
    add("documents", "Boarding passes / e-tickets", "You have flights booked");
    add("todo", "Web check-in 24–48 h before each flight", "You have flights booked");
  }
  if (trip.bookings.some((b) => b.type === "train" || b.type === "bus")) {
    add("documents", "Train / bus tickets (offline copy)", "You have train or bus bookings");
  }
  add("documents", "Travel insurance details");

  // Packing — basics scaled to trip length
  add("packing", `Clothes for ${nights + 1} day${nights ? "s" : ""}`);
  add("packing", "Toiletries & medicines");
  add("packing", "Phone charger & power bank");
  add("packing", "Comfortable walking shoes");
  if (trip.interests.some((i) => ["Temples", "Spiritual"].includes(i))) {
    add("packing", "Clothes covering shoulders & knees (temples)", "Temples are on your list");
    add("packing", "Socks for barefoot temple visits", "Temples are on your list");
  }
  if (trip.interests.includes("Photography")) add("packing", "Camera, spare batteries & memory cards", "Photography is an interest");
  if (trip.interests.some((i) => ["Nature", "Adventure", "Wildlife"].includes(i))) {
    add("packing", "Insect repellent", "Outdoor plans");
  }

  // Weather-driven
  const weather = await getTripWeatherForTrip(trip);
  const rainy = weather.find((d) => (d.rainChance ?? 0) >= 40 || (d.rainMm ?? 0) >= 2);
  const hot = weather.find((d) => d.tempMaxC >= 32);
  const cold = weather.find((d) => d.tempMinC <= 12);
  const label = (date: string) => new Date(`${date}T00:00:00Z`).toUTCString().slice(0, 11);
  if (rainy) add("packing", "Umbrella or rain jacket", `${rainy.kind === "forecast" ? "Rain likely" : "It usually rains"} around ${label(rainy.date)}`);
  if (hot) add("packing", "Sunscreen, sunglasses & a hat", `Up to ${hot.tempMaxC}°C expected`);
  if (hot) add("packing", "Reusable water bottle", `Up to ${hot.tempMaxC}°C expected`);
  if (cold) add("packing", "Warm jacket for mornings & evenings", `Down to ${cold.tempMinC}°C`);

  // To-dos from gaps in the plan
  for (const leg of getEffectiveLegs(trip)) {
    const missing = getUncoveredNights(leg).length;
    if (missing > 0) add("todo", `Book a stay in ${leg.name || leg.baseCity} (${missing} night${missing === 1 ? "" : "s"})`, "Nights without a stay");
  }
  const legs = getEffectiveLegs(trip);
  for (const transfer of getEffectiveTransfers(trip)) {
    const covered = trip.bookings.some((b) => b.transferId === transfer.id && TRANSPORT_BOOKING_TYPES.includes(b.type));
    if (!covered) {
      const from = legs.find((l) => l.id === transfer.fromLegId)?.baseCity ?? "";
      const to = legs.find((l) => l.id === transfer.toLegId)?.baseCity ?? "";
      add("todo", `Book transport ${from} → ${to}`.trim(), transfer.label);
    }
  }
  add("todo", "Tell your bank you're travelling");
  add("todo", "Download offline maps for each city");

  const existing = new Set(trip.checklist.map((c) => c.text.trim().toLowerCase()));
  const unique = suggestions.filter((s, i) => !existing.has(s.text.toLowerCase()) && suggestions.findIndex((o) => o.text === s.text) === i);
  return { success: true, data: { suggestions: unique } };
}
