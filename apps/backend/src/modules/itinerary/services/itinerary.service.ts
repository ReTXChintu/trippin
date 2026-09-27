import { getAIProvider } from "@/lib/ai";
import type { AiConfig } from "@/modules/ai/types/ai-provider.types";
import {
  ApiKeyError,
  assertGoogleMapsKey,
  getOwnerApiKeysForTripDto,
  requireAiConfig,
} from "@/lib/services/trip-api-keys.service";
import { PlacesService } from "@/modules/places/services/places.service";
import {
  addCustomStop,
  buildDaysFromPlaceAssignment,
  collectPreservedStops,
  estimateTravelLookup,
  fillUnscheduledPlaces,
  forceInsertPlaceIntoDay,
  generateItineraryDays,
  mealLabel,
  moveStopBetweenDays,
  reorderDayStops,
  retimeDay,
  travelLookupWithRoutes,
  type AiPlaceAssignment,
  type EngineEnv,
} from "@/modules/itinerary/services/itinerary-engine.service";
import { buildVisitIntelSummary } from "@/modules/itinerary/services/itinerary-enrichment.service";
import {
  getRoutesForDays,
  measureDayHops,
  type DayRoute,
} from "@/modules/itinerary/services/itinerary-routing.service";
import type { Itinerary, ItineraryDay, ItineraryStop, OptionalItineraryPlace } from "@/modules/itinerary/types";
import type { Place } from "@/modules/places/types/place.types";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import {
  addStopSchema,
  aiEditPlanSchema,
  applyMergedDaysSchema,
  generateLegGuideSchema,
  getRoutesSchema,
  movePlaceToDaySchema,
  moveStopSchema,
  removeStopSchema,
  reorderStopsSchema,
  replanFromNowSchema,
  setStopStatusSchema,
  setStopLockSchema,
  tripIdSchema,
  updateMealSlotSchema,
  updateStopSchema,
} from "@/modules/itinerary/validators/itinerary.validator";
import { TripRepository } from "@/repositories/trip.repository";
import { ItineraryRepository } from "@/repositories/itinerary.repository";
import {
  buildTripDayPlans,
  getAggregatedSelectedPlaceIds,
  getEffectiveLegs,
  isDayOwnedByLeg,
} from "@/modules/trips/utils/trip-leg.utils";
import { getLegDayBounds } from "@/modules/itinerary/utils/leg-day-bounds.utils";
import { haversineKm, minutesToTime, parseTimeToMinutes } from "@/utils/geo";

export type ItineraryActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

function actionError<T = void>(err: unknown, fallback: string): ItineraryActionResult<T> {
  if (err instanceof ApiKeyError) {
    return { success: false, error: err.message };
  }
  return { success: false, error: err instanceof Error ? err.message : fallback };
}

function invalid<T>(issues: { message: string }[]): ItineraryActionResult<T> {
  return { success: false, error: issues[0]?.message ?? "Invalid input" };
}

// ---------------------------------------------------------------------------------------------
// Scheduling environment: places + travel times (real routes when a Maps key is available)
// ---------------------------------------------------------------------------------------------

interface ScheduleEnv extends EngineEnv {
  googleMapsKey?: string;
}

function placeIdsInDays(days: ItineraryDay[]): string[] {
  return days.flatMap((d) => d.stops.map((s) => s.placeId)).filter((id) => id && !id.startsWith("transfer-"));
}

async function buildEnv(trip: Trip, placeIds: string[], extraPlaces: Place[] = []): Promise<ScheduleEnv> {
  const unique = [...new Set(placeIds.filter(Boolean))];
  const places = await PlacesService.getCachedPlaces(unique);
  const placesById = new Map<string, Place>();
  for (const place of [...places, ...extraPlaces]) {
    if (place.googlePlaceId) placesById.set(place.googlePlaceId, place);
  }

  let googleMapsKey: string | undefined;
  try {
    googleMapsKey = (await getOwnerApiKeysForTripDto(trip)).googleMaps?.trim() || undefined;
  } catch {
    googleMapsKey = undefined;
  }

  return { trip, placesById, travel: estimateTravelLookup(trip.transportationMode), googleMapsKey };
}

function isSchedulable(day: ItineraryDay): boolean {
  return day.dayType !== "transfer" && day.dayType !== "free";
}

/** Re-times `dayNumbers` (all schedulable days when omitted) using real Google route times where
 * possible. Order is never changed; with `strict`, auto-generated sights that no longer fit are
 * dropped (returned so they can be re-homed). */
async function retimeWithRoutes(
  env: ScheduleEnv,
  days: ItineraryDay[],
  opts: { dayNumbers?: Set<number>; strict?: boolean } = {},
): Promise<{ days: ItineraryDay[]; dropped: ItineraryStop[] }> {
  // Travel days are included too: their transfer stop is rebuilt (e.g. from a linked booking).
  const targets = days.filter((d) => !opts.dayNumbers || opts.dayNumbers.has(d.dayNumber));
  if (targets.length === 0) return { days, dropped: [] };

  let routedEnv: EngineEnv = env;
  if (env.googleMapsKey) {
    try {
      const measured = await measureDayHops(env.trip, targets.filter(isSchedulable), env.googleMapsKey);
      if (measured.size > 0) routedEnv = { ...env, travel: travelLookupWithRoutes(env.travel, measured) };
    } catch {
      // Best-effort: estimates are still a usable schedule.
    }
  }

  const dropped: ItineraryStop[] = [];
  const targetNumbers = new Set(targets.map((d) => d.dayNumber));
  const next = days.map((day) => {
    if (!targetNumbers.has(day.dayNumber)) return day;
    const result = retimeDay(day, routedEnv, { strict: opts.strict });
    dropped.push(...result.dropped);
    return result.day;
  });

  return { days: next, dropped };
}

async function commit(
  trip: Trip,
  existing: Itinerary | null,
  next: { days: ItineraryDay[]; optionalPlaces?: OptionalItineraryPlace[] },
  label: string,
  options?: { clearSummary?: boolean; markGenerated?: boolean },
): Promise<Itinerary> {
  return ItineraryRepository.saveWithHistory(
    trip.id,
    trip.userId,
    next,
    existing ? { label, days: existing.days, optionalPlaces: existing.optionalPlaces } : null,
    options,
  );
}

function dayLabel(day: ItineraryDay): string {
  return `Day ${day.dayNumber}${day.legName ? ` (${day.legName})` : ""}`;
}

async function loadTripAndItinerary(
  userId: string,
  tripId: string,
): Promise<{ error: string } | { trip: Trip; itinerary: Itinerary | null }> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { error: "Trip not found" };
  const itinerary = await ItineraryRepository.findByTripId(tripId);
  return { trip, itinerary };
}

// ---------------------------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------------------------

export async function getItineraryRoutes(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ days: DayRoute[] }>> {
  const parsed = getRoutesSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, legId, dayNumber } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const existing = await ItineraryRepository.findByTripId(tripId);
  if (!existing) return { success: false, error: "Itinerary not found" };

  const dayPlans = legId ? buildTripDayPlans(trip) : null;
  let days = legId && dayPlans ? existing.days.filter((d) => isDayOwnedByLeg(d.date, dayPlans, legId)) : existing.days;
  if (dayNumber) days = days.filter((d) => d.dayNumber === dayNumber);

  try {
    const ownerKeys = await getOwnerApiKeysForTripDto(trip);
    assertGoogleMapsKey(ownerKeys, "trip");

    const routes = await getRoutesForDays(trip, days, ownerKeys.googleMaps);
    return { success: true, data: { days: routes } };
  } catch (err) {
    return actionError(err, "Failed to compute route");
  }
}

export async function getItineraryForTrip(
  userId: string,
  tripId: string,
): Promise<ItineraryActionResult<{ itinerary: Itinerary | null }>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const itinerary = await ItineraryRepository.findByTripId(tripId);
  return { success: true, data: { itinerary } };
}

export async function getPublicItinerary(
  slug: string,
): Promise<ItineraryActionResult<{ itinerary: Itinerary | null }>> {
  const trip = await TripRepository.findByPublicSlug(slug);
  if (!trip) return { success: false, error: "Trip not found" };

  const itinerary = await ItineraryRepository.findByTripIdOnly(trip.id);
  return { success: true, data: { itinerary } };
}

// ---------------------------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------------------------

export async function generateItinerary(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const parsed = tripIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, legId } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const leg = legId ? getEffectiveLegs(trip).find((l) => l.id === legId) : undefined;
  if (legId && !leg) return { success: false, error: "Trip leg not found" };

  const selectedIds = getAggregatedSelectedPlaceIds(trip);
  if (selectedIds.length === 0) {
    return { success: false, error: "Pick some places first — then generate the day-by-day plan." };
  }

  try {
    const existing = await ItineraryRepository.findByTripId(tripId);
    const dayPlans = buildTripDayPlans(trip);
    const inScope = (date: string) => !legId || isDayOwnedByLeg(date, dayPlans, legId);

    // Locked stops, hand-added activities and chosen restaurants survive a regenerate.
    const preservedAll = existing ? collectPreservedStops(existing.days) : new Map<string, ItineraryStop[]>();
    const preserved = new Map([...preservedAll].filter(([date]) => inScope(date)));

    const env = await buildEnv(trip, [...selectedIds, ...placeIdsInDays(existing?.days ?? [])]);
    const places = selectedIds.map((id) => env.placesById.get(id)).filter((p): p is Place => Boolean(p));
    if (!places.some((p) => p.coordinates)) {
      return { success: false, error: "No cached place coordinates found. Try discovering places again." };
    }

    const generated = generateItineraryDays(env, places, preserved);

    // Re-time with real routes; anything that no longer fits is dropped here and re-homed below.
    const strictPass = await retimeWithRoutes(env, generated.days, { strict: true });
    const filled = fillUnscheduledPlaces(strictPass.days, places, env);
    const finalPass = await retimeWithRoutes(env, filled.days);

    let days = finalPass.days;
    let optionalPlaces = filled.optionalPlaces;

    if (legId && existing) {
      const existingByDate = new Map(existing.days.map((d) => [d.date, d]));
      days = days.map((day) => (inScope(day.date) ? day : (existingByDate.get(day.date) ?? day)));
      optionalPlaces = [
        ...existing.optionalPlaces.filter((p) => p.legId !== legId),
        ...optionalPlaces.filter((p) => p.legId === legId),
      ];
    }

    const totalStops = days.reduce((sum, d) => sum + d.stops.filter((s) => s.stopType !== "meal").length, 0);
    if (totalStops === 0) {
      return {
        success: false,
        error: "Couldn't fit any stops into your daily hours. Try longer days or fewer, closer places.",
      };
    }

    const label = leg ? `Regenerate ${leg.name || leg.baseCity}` : "Regenerate itinerary";
    const itinerary = await commit(trip, existing, { days, optionalPlaces }, label, {
      clearSummary: true,
      markGenerated: true,
    });

    const scheduled = days.filter((d) => inScope(d.date)).reduce(
      (sum, d) => sum + d.stops.filter((s) => s.stopType === "sight" || s.stopType === "activity").length,
      0,
    );
    return {
      success: true,
      data: { itinerary },
      message: `Planned ${scheduled} stops${optionalPlaces.length ? ` · ${optionalPlaces.length} didn't fit` : ""}.`,
    };
  } catch (err) {
    return actionError(err, "Failed to generate itinerary");
  }
}

// ---------------------------------------------------------------------------------------------
// Edits
// ---------------------------------------------------------------------------------------------

async function applyDayEdit(
  trip: Trip,
  existing: Itinerary,
  changed: ItineraryDay[],
  label: string,
  opts: { optionalPlaces?: OptionalItineraryPlace[]; extraPlaces?: Place[] } = {},
): Promise<Itinerary> {
  const byNumber = new Map(changed.map((d) => [d.dayNumber, d]));
  const merged = existing.days.map((d) => byNumber.get(d.dayNumber) ?? d);
  const env = await buildEnv(trip, placeIdsInDays(changed), opts.extraPlaces);
  const { days } = await retimeWithRoutes(env, merged, { dayNumbers: new Set(byNumber.keys()) });
  return commit(trip, existing, { days, optionalPlaces: opts.optionalPlaces }, label);
}

export async function reorderItineraryStops(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const parsed = reorderStopsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, dayNumber, stopIds } = parsed.data;
  const loaded = await loadTripAndItinerary(userId, tripId);
  if ("error" in loaded) return { success: false, error: loaded.error };
  const { trip, itinerary: existing } = loaded;
  if (!existing) return { success: false, error: "Itinerary not found" };

  const day = existing.days.find((d) => d.dayNumber === dayNumber);
  if (!day) return { success: false, error: "Day not found" };

  const env = await buildEnv(trip, placeIdsInDays([day]));
  const reordered = reorderDayStops(day, stopIds, env);
  const itinerary = await applyDayEdit(trip, existing, [reordered], `Reorder ${dayLabel(day)}`);
  return { success: true, data: { itinerary } };
}

export async function moveItineraryStop(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const parsed = moveStopSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, stopId, fromDayNumber, toDayNumber, targetIndex } = parsed.data;
  const loaded = await loadTripAndItinerary(userId, tripId);
  if ("error" in loaded) return { success: false, error: loaded.error };
  const { trip, itinerary: existing } = loaded;
  if (!existing) return { success: false, error: "Itinerary not found" };

  const fromDay = existing.days.find((d) => d.dayNumber === fromDayNumber);
  const toDay = existing.days.find((d) => d.dayNumber === toDayNumber);
  if (!fromDay || !toDay) return { success: false, error: "Day not found" };

  const stop = fromDay.stops.find((s) => s.id === stopId);
  if (!stop) return { success: false, error: "Stop not found in source day" };
  if (stop.stopType === "transfer" || stop.stopType === "return") {
    return { success: false, error: "Travel and return-to-stay stops can't be moved" };
  }
  if (toDay.dayType === "transfer") return { success: false, error: "That's a travel day — pick another day" };

  const env = await buildEnv(trip, placeIdsInDays([fromDay, toDay]));
  const moved = moveStopBetweenDays(fromDay, toDay, stopId, env, targetIndex);
  const itinerary = await applyDayEdit(
    trip,
    existing,
    [moved.fromDay, moved.toDay],
    `Move ${stop.placeName} to ${dayLabel(toDay)}`,
  );
  return { success: true, data: { itinerary } };
}

export async function setStopLock(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const parsed = setStopLockSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, dayNumber, stopId, locked } = parsed.data;
  const loaded = await loadTripAndItinerary(userId, tripId);
  if ("error" in loaded) return { success: false, error: loaded.error };
  const { trip, itinerary: existing } = loaded;
  if (!existing) return { success: false, error: "Itinerary not found" };

  const day = existing.days.find((d) => d.dayNumber === dayNumber);
  const stop = day?.stops.find((s) => s.id === stopId);
  if (!day || !stop) return { success: false, error: "Stop not found" };

  const nextDay = { ...day, stops: day.stops.map((s) => (s.id === stopId ? { ...s, locked: locked || undefined } : s)) };
  const itinerary = await commit(
    trip,
    existing,
    { days: existing.days.map((d) => (d.dayNumber === dayNumber ? nextDay : d)) },
    `${locked ? "Lock" : "Unlock"} ${stop.placeName}`,
  );
  return { success: true, data: { itinerary }, message: locked ? "Locked — regenerating keeps it on this day." : "Unlocked." };
}

export async function addStop(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary; stopId: string }>> {
  const parsed = addStopSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, dayNumber, placeId, name, fixedStartTime, durationMinutes, notes } = parsed.data;
  const loaded = await loadTripAndItinerary(userId, tripId);
  if ("error" in loaded) return { success: false, error: loaded.error };
  const { trip, itinerary: existing } = loaded;
  if (!existing) return { success: false, error: "Generate an itinerary first." };

  const day = existing.days.find((d) => d.dayNumber === dayNumber);
  if (!day) return { success: false, error: "Day not found" };
  if (day.dayType === "transfer") return { success: false, error: "That's a travel day — pick another day" };

  try {
    let place: Place | undefined;
    if (placeId) {
      const ownerKeys = await getOwnerApiKeysForTripDto(trip);
      assertGoogleMapsKey(ownerKeys, "trip");
      place = await PlacesService.getPlaceDetails(placeId, ownerKeys.googleMaps, {
        city: day.legName ?? trip.destinationCity,
        country: trip.destinationCountry,
      });
      if (day.stops.some((s) => s.placeId === placeId)) {
        return { success: false, error: `${place.name} is already on this day` };
      }
    }

    const env = await buildEnv(trip, placeIdsInDays([day]), place ? [place] : []);
    const { day: nextDay, stopId } = addCustomStop(day, { place, name, fixedStartTime, durationMinutes, notes }, env);
    const optionalPlaces = placeId
      ? existing.optionalPlaces.filter((p) => p.placeId !== placeId)
      : existing.optionalPlaces;

    const itinerary = await applyDayEdit(
      trip,
      existing,
      [nextDay],
      `Add ${place?.name ?? name} to ${dayLabel(day)}`,
      { optionalPlaces, extraPlaces: place ? [place] : [] },
    );
    return { success: true, data: { itinerary, stopId }, message: `Added to ${dayLabel(day)}.` };
  } catch (err) {
    return actionError(err, "Failed to add stop");
  }
}

export async function updateStop(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const parsed = updateStopSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, dayNumber, stopId, durationMinutes, fixedStartTime, notes, cost } = parsed.data;
  const loaded = await loadTripAndItinerary(userId, tripId);
  if ("error" in loaded) return { success: false, error: loaded.error };
  const { trip, itinerary: existing } = loaded;
  if (!existing) return { success: false, error: "Itinerary not found" };

  const day = existing.days.find((d) => d.dayNumber === dayNumber);
  const stop = day?.stops.find((s) => s.id === stopId);
  if (!day || !stop) return { success: false, error: "Stop not found" };
  if (stop.stopType === "transfer" || stop.stopType === "return") {
    return { success: false, error: "This stop is derived from your travel plan and can't be edited here" };
  }

  const updated: ItineraryStop = {
    ...stop,
    visitDurationMinutes: durationMinutes ?? stop.visitDurationMinutes,
    fixedStartTime: fixedStartTime === null ? undefined : (fixedStartTime ?? stop.fixedStartTime),
    notes: notes !== undefined ? notes.trim() || undefined : stop.notes,
    cost: cost === null ? undefined : (cost ?? stop.cost),
  };
  const nextDay = { ...day, stops: day.stops.map((s) => (s.id === stopId ? updated : s)) };

  const itinerary = await applyDayEdit(trip, existing, [nextDay], `Edit ${stop.placeName}`);
  return { success: true, data: { itinerary } };
}

export async function removeStop(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const parsed = removeStopSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, dayNumber, stopId } = parsed.data;
  const loaded = await loadTripAndItinerary(userId, tripId);
  if ("error" in loaded) return { success: false, error: loaded.error };
  const { trip, itinerary: existing } = loaded;
  if (!existing) return { success: false, error: "Itinerary not found" };

  const day = existing.days.find((d) => d.dayNumber === dayNumber);
  const stop = day?.stops.find((s) => s.id === stopId);
  if (!day || !stop) return { success: false, error: "Stop not found" };
  if (stop.stopType === "transfer" || stop.stopType === "return") {
    return { success: false, error: "This stop is derived from your travel plan and can't be removed" };
  }

  const nextDay = { ...day, stops: day.stops.filter((s) => s.id !== stopId) };

  // A removed place that's still in "My places" stays visible under "Didn't fit" so it can be put back.
  const selected = new Set(getAggregatedSelectedPlaceIds(trip));
  const optionalPlaces =
    stop.placeId && selected.has(stop.placeId) && stop.stopType !== "meal"
      ? [
          ...existing.optionalPlaces.filter((p) => p.placeId !== stop.placeId),
          {
            placeId: stop.placeId,
            placeName: stop.placeName,
            category: stop.category,
            coordinates: stop.coordinates,
            legId: stop.legId ?? day.legId,
            reason: `You removed it from ${dayLabel(day)}.`,
          },
        ]
      : existing.optionalPlaces;

  const itinerary = await applyDayEdit(trip, existing, [nextDay], `Remove ${stop.placeName}`, { optionalPlaces });
  return { success: true, data: { itinerary } };
}

export async function updateMealSlot(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const parsed = updateMealSlotSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, dayNumber, stopId, arrivalTime, departureTime, placeId, clearPlace } = parsed.data;
  const loaded = await loadTripAndItinerary(userId, tripId);
  if ("error" in loaded) return { success: false, error: loaded.error };
  const { trip, itinerary: existing } = loaded;
  if (!existing) return { success: false, error: "Itinerary not found" };

  const day = existing.days.find((d) => d.dayNumber === dayNumber);
  const stop = day?.stops.find((s) => s.id === stopId);
  if (!day || !stop) return { success: false, error: "Stop not found" };
  if (stop.stopType !== "meal") return { success: false, error: "Not a meal slot" };

  let updated: ItineraryStop = { ...stop };
  let place: Place | undefined;

  if (clearPlace) {
    updated = {
      ...updated,
      placeId: "",
      placeName: mealLabel(stop.mealType),
      coordinates: undefined,
      category: undefined,
    };
  } else if (placeId) {
    try {
      const ownerKeys = await getOwnerApiKeysForTripDto(trip);
      assertGoogleMapsKey(ownerKeys, "trip");
      place = await PlacesService.getPlaceDetails(placeId, ownerKeys.googleMaps, {
        city: day.legName ?? trip.destinationCity,
        country: trip.destinationCountry,
      });
    } catch (err) {
      return actionError(err, "Place not found — try searching again.");
    }
    updated = {
      ...updated,
      placeId: place.googlePlaceId ?? placeId,
      placeName: place.name,
      coordinates: place.coordinates,
      category: place.category,
    };
  }

  if (arrivalTime || departureTime) {
    const start = parseTimeToMinutes(arrivalTime ?? stop.arrivalTime);
    const end = parseTimeToMinutes(departureTime ?? stop.departureTime);
    if (end <= start) return { success: false, error: "End time must be after start time" };
    updated = {
      ...updated,
      visitDurationMinutes: end - start,
      // An explicitly chosen start time becomes a fixed slot the rest of the day works around.
      fixedStartTime: arrivalTime ? minutesToTime(start) : updated.fixedStartTime,
    };
  }

  const nextDay = { ...day, stops: day.stops.map((s) => (s.id === stopId ? updated : s)) };
  const label = clearPlace
    ? `Clear ${mealLabel(stop.mealType)} on ${dayLabel(day)}`
    : `Update ${mealLabel(stop.mealType)} on ${dayLabel(day)}`;
  const itinerary = await applyDayEdit(trip, existing, [nextDay], label, { extraPlaces: place ? [place] : [] });
  return { success: true, data: { itinerary } };
}

export async function movePlaceFromOptional(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const parsed = movePlaceToDaySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, placeId, toDayNumber } = parsed.data;
  const loaded = await loadTripAndItinerary(userId, tripId);
  if ("error" in loaded) return { success: false, error: loaded.error };
  const { trip, itinerary: existing } = loaded;
  if (!existing) return { success: false, error: "Itinerary not found" };

  const optionalPlace = existing.optionalPlaces.find((p) => p.placeId === placeId);
  if (!optionalPlace) return { success: false, error: "Optional place not found" };

  const day = existing.days.find((d) => d.dayNumber === toDayNumber);
  if (!day) return { success: false, error: "Day not found" };

  const env = await buildEnv(trip, [...placeIdsInDays([day]), placeId]);
  const place = env.placesById.get(placeId);
  if (!place) return { success: false, error: "Place not found — try discovering places again." };

  const nextDay = forceInsertPlaceIntoDay(day, place, env, { userAdded: true });
  const itinerary = await applyDayEdit(trip, existing, [nextDay], `Add ${place.name} to ${dayLabel(day)}`, {
    optionalPlaces: existing.optionalPlaces.filter((p) => p.placeId !== placeId),
  });
  return { success: true, data: { itinerary }, message: "Place added to your itinerary." };
}

export async function undoItineraryChange(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const parsed = tripIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const trip = await TripRepository.findByIdForUser(parsed.data.tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const result = await ItineraryRepository.undo(trip.id);
  if (!result) return { success: false, error: "Nothing to undo" };
  const itinerary = await ItineraryRepository.findByTripId(trip.id);
  return { success: true, data: { itinerary: itinerary ?? result.itinerary }, message: `Undid: ${result.label}` };
}

// ---------------------------------------------------------------------------------------------
// "Ask AI to change my plan" — the model proposes operations, the engine applies and re-times them
// ---------------------------------------------------------------------------------------------

const AI_EDIT_MIN_DURATION = 10;
const AI_EDIT_MAX_DURATION = 600;

function isStructural(stop: ItineraryStop): boolean {
  return stop.stopType === "transfer" || stop.stopType === "return";
}

export async function aiEditPlan(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary; summary: string; applied: number }>> {
  const parsed = aiEditPlanSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, instruction } = parsed.data;
  const loaded = await loadTripAndItinerary(userId, tripId);
  if ("error" in loaded) return { success: false, error: loaded.error };
  const { trip, itinerary: existing } = loaded;
  if (!existing || existing.days.length === 0) return { success: false, error: "Generate an itinerary first." };

  try {
    const aiConfig = requireAiConfig(await getOwnerApiKeysForTripDto(trip), "trip");

    // Places the traveller picked that aren't on the plan can be pulled in by the AI.
    const scheduled = new Set(placeIdsInDays(existing.days));
    const unscheduledIds = [
      ...new Set([...existing.optionalPlaces.map((p) => p.placeId), ...getAggregatedSelectedPlaceIds(trip)]),
    ].filter((id) => id && !scheduled.has(id));
    const env = await buildEnv(trip, [...scheduled, ...unscheduledIds]);

    const proposal = await getAIProvider(aiConfig).planEdits({
      instruction,
      days: existing.days
        .filter((d) => d.dayType !== "free")
        .map((d) => ({
          dayNumber: d.dayNumber,
          date: d.date,
          city: d.legName,
          stops: d.stops.map((s) => ({
            id: s.id,
            name: s.placeName,
            type: s.stopType ?? "sightseeing",
            time: s.arrivalTime,
            minutes: s.visitDurationMinutes,
            locked: s.locked || undefined,
            fixedTime: s.fixedStartTime,
          })),
        })),
      unscheduled: unscheduledIds
        .map((id) => {
          const place = env.placesById.get(id);
          return place ? { placeId: id, name: place.name, city: place.city } : null;
        })
        .filter((p): p is { placeId: string; name: string; city: string } => p !== null)
        .slice(0, 40),
    });
    if (!proposal) return { success: false, error: "The AI didn't return a usable answer — try rephrasing." };

    const days = new Map(existing.days.map((d) => [d.dayNumber, d]));
    const changed = new Set<number>();
    let optionalPlaces = existing.optionalPlaces;
    const selected = new Set(getAggregatedSelectedPlaceIds(trip));
    let applied = 0;

    const findStop = (stopId: string) => {
      for (const day of days.values()) {
        const stop = day.stops.find((s) => s.id === stopId);
        if (stop) return { day, stop };
      }
      return null;
    };
    const update = (day: ItineraryDay) => {
      days.set(day.dayNumber, day);
      changed.add(day.dayNumber);
      applied += 1;
    };

    for (const op of proposal.operations) {
      if (op.op === "move") {
        const found = findStop(op.stopId);
        const toDay = days.get(op.toDayNumber);
        if (!found || !toDay || isStructural(found.stop) || !isSchedulable(toDay) || toDay.dayNumber === found.day.dayNumber) continue;
        const moved = moveStopBetweenDays(found.day, toDay, op.stopId, env);
        update(moved.fromDay);
        update(moved.toDay);
        applied -= 1;
      } else if (op.op === "remove") {
        const found = findStop(op.stopId);
        if (!found || isStructural(found.stop)) continue;
        const { day, stop } = found;
        update({ ...day, stops: day.stops.filter((s) => s.id !== stop.id) });
        if (stop.placeId && selected.has(stop.placeId) && stop.stopType !== "meal") {
          optionalPlaces = [
            ...optionalPlaces.filter((p) => p.placeId !== stop.placeId),
            {
              placeId: stop.placeId,
              placeName: stop.placeName,
              category: stop.category,
              coordinates: stop.coordinates,
              legId: stop.legId ?? day.legId,
              reason: `Removed from ${dayLabel(day)} by AI.`,
            },
          ];
        }
      } else if (op.op === "add") {
        const day = days.get(op.dayNumber);
        const place = env.placesById.get(op.placeId);
        if (!day || !place || !isSchedulable(day) || [...days.values()].some((d) => d.stops.some((s) => s.placeId === op.placeId))) continue;
        update(forceInsertPlaceIntoDay(day, place, env, { userAdded: true }));
        optionalPlaces = optionalPlaces.filter((p) => p.placeId !== op.placeId);
      } else if (op.op === "setDuration") {
        const found = findStop(op.stopId);
        if (!found || isStructural(found.stop)) continue;
        const minutes = Math.round(Math.min(Math.max(op.minutes, AI_EDIT_MIN_DURATION), AI_EDIT_MAX_DURATION));
        update({
          ...found.day,
          stops: found.day.stops.map((s) => (s.id === op.stopId ? { ...s, visitDurationMinutes: minutes } : s)),
        });
      } else if (op.op === "lock") {
        const found = findStop(op.stopId);
        if (!found || isStructural(found.stop)) continue;
        update({ ...found.day, stops: found.day.stops.map((s) => (s.id === op.stopId ? { ...s, locked: true } : s)) });
      } else if (op.op === "reorder") {
        const day = days.get(op.dayNumber);
        if (!day || !isSchedulable(day) || !op.stopIds.every((id) => day.stops.some((s) => s.id === id))) continue;
        update(reorderDayStops(day, op.stopIds, env));
      }
    }

    if (applied === 0) {
      return { success: true, data: { itinerary: existing, summary: proposal.summary, applied: 0 }, message: proposal.summary };
    }

    const merged = existing.days.map((d) => days.get(d.dayNumber) ?? d);
    const { days: retimed } = await retimeWithRoutes(env, merged, { dayNumbers: changed });
    const label = `AI: ${instruction.length > 60 ? `${instruction.slice(0, 57)}…` : instruction}`;
    const itinerary = await commit(trip, existing, { days: retimed, optionalPlaces }, label);
    return { success: true, data: { itinerary, summary: proposal.summary, applied }, message: proposal.summary };
  } catch (err) {
    return actionError(err, "The AI couldn't change the plan");
  }
}

// ---------------------------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------------------------

export async function generateItinerarySummary(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary; summary: string }>> {
  const parsed = tripIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const existing = await ItineraryRepository.findByTripId(tripId);
  if (!existing || existing.days.every((d) => d.stops.length === 0)) {
    return { success: false, error: "Generate an itinerary first." };
  }

  try {
    const ownerKeys = await getOwnerApiKeysForTripDto(trip);
    const aiConfig = requireAiConfig(ownerKeys, "trip");

    const summary = await getAIProvider(aiConfig).generateSummary({ trip, days: existing.days });

    const itinerary = await ItineraryRepository.updateSummary(tripId, trip.userId, summary);
    if (!itinerary) return { success: false, error: "Failed to save summary" };

    return { success: true, data: { itinerary, summary }, message: "Trip summary generated." };
  } catch (err) {
    return actionError(err, "Failed to generate summary");
  }
}

function computeDayDistanceKm(day: ItineraryDay): number {
  const withMeasured = day.stops.filter((s) => s.travelDistanceKm !== undefined);
  if (withMeasured.length > 0) {
    return Math.round(withMeasured.reduce((sum, s) => sum + (s.travelDistanceKm ?? 0), 0) * 10) / 10;
  }
  const routable = day.stops.filter((s) => s.coordinates);
  let total = 0;
  for (let i = 1; i < routable.length; i++) {
    total += haversineKm(routable[i - 1].coordinates!, routable[i].coordinates!);
  }
  return Math.round(total * 10) / 10;
}

/** Sightseeing dates (owned by legId when scoped) that aren't skipped, with approximate bounds
 * to guide the AI on how much to pack into each day — the engine re-derives exact bounds when
 * actually scheduling the candidate, so these only need to be good hints, not precise. */
function computeEligibleDates(
  trip: Trip,
  legId?: string,
): { date: string; dayStartMin: number; dayEndMin: number }[] {
  const dayPlans = buildTripDayPlans(trip);
  const results: { date: string; dayStartMin: number; dayEndMin: number }[] = [];

  for (const { date, plan } of dayPlans) {
    if (plan.type !== "sightseeing") continue;
    if (legId && plan.leg.id !== legId) continue;

    const bounds = getLegDayBounds(plan.leg, date, trip, plan.transferOnDay);
    if (bounds.skipSightseeing) continue;

    results.push({ date, dayStartMin: bounds.dayStartMin, dayEndMin: bounds.dayEndMin });
  }

  return results;
}

export type ItineraryDayWithDistance = ItineraryDay & { distanceKm: number };

function withDistance(days: ItineraryDay[]): ItineraryDayWithDistance[] {
  return days.map((d) => ({ ...d, distanceKm: computeDayDistanceKm(d) }));
}

/** Replaces just the legId-owned slice of an optionalPlaces list with a fresh one — or the whole
 * list when unscoped (trip-wide), since an unscoped candidate/merge covers every leg at once. */
function mergeOptionalPlaces(
  existing: OptionalItineraryPlace[],
  incoming: OptionalItineraryPlace[],
  legId?: string,
): OptionalItineraryPlace[] {
  if (!legId) return incoming;
  return [...existing.filter((p) => p.legId !== legId), ...incoming.filter((p) => p.legId === legId)];
}

async function buildAiCandidateForScope(
  trip: Trip,
  leg: TripLeg | undefined,
  legId: string | undefined,
  aiConfig: AiConfig,
): Promise<{ days: ItineraryDay[]; optionalPlaces: OptionalItineraryPlace[] }> {
  const dayPlans = legId ? buildTripDayPlans(trip) : null;
  const placeIds = leg ? leg.selectedPlaceIds : getAggregatedSelectedPlaceIds(trip);
  const env = await buildEnv(trip, placeIds);
  const places = placeIds.map((id) => env.placesById.get(id)).filter((p): p is Place => Boolean(p));

  const eligibleDatesForAi = computeEligibleDates(trip, legId).map((d) => ({
    date: d.date,
    dailyStartTime: minutesToTime(d.dayStartMin),
    dailyEndTime: minutesToTime(d.dayEndMin),
  }));

  const ai = getAIProvider(aiConfig);
  const candidate = await ai.generateAiItineraryCandidate({ trip, leg, places, eligibleDates: eligibleDatesForAi });

  const assignment: AiPlaceAssignment = {
    byDate: new Map(candidate.days.map((d) => [d.date, d.placeIds])),
    dressCodeByDate: new Map(candidate.days.filter((d) => d.dressCode).map((d) => [d.date, d.dressCode!])),
  };

  const { days: aiDays } = buildDaysFromPlaceAssignment(env, places, assignment);
  const notesByPlaceId = new Map(candidate.stopNotes.map((n) => [n.placeId, n]));

  const notedDays = aiDays.map((day) => ({
    ...day,
    stops: day.stops.map((stop) => {
      const note = notesByPlaceId.get(stop.placeId);
      if (!note) return stop;
      const visitIntel = {
        bestTime: note.bestTime,
        avoidTime: note.avoidTime,
        hypeLevel: note.hypeLevel,
        why: note.why,
        tips: note.tips,
      };
      return { ...stop, visitIntel, aiNotes: buildVisitIntelSummary(visitIntel) };
    }),
  }));

  const strictPass = await retimeWithRoutes(env, notedDays, { strict: true });
  const filled = fillUnscheduledPlaces(strictPass.days, places, env);
  const { days: finalDays } = await retimeWithRoutes(env, filled.days);

  const scopedDays =
    legId && dayPlans ? finalDays.filter((d) => isDayOwnedByLeg(d.date, dayPlans, legId)) : finalDays;

  return { days: scopedDays, optionalPlaces: filled.optionalPlaces };
}

export async function generateAiCandidate(
  userId: string,
  input: unknown,
): Promise<
  ItineraryActionResult<{
    currentDays: ItineraryDayWithDistance[];
    currentOptionalPlaces: OptionalItineraryPlace[];
    aiCandidate: { days: ItineraryDayWithDistance[]; optionalPlaces: OptionalItineraryPlace[]; generatedAt: string };
  }>
> {
  const parsed = tripIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, legId } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const leg: TripLeg | undefined = legId ? trip.legs.find((l) => l.id === legId) : undefined;
  if (legId && !leg) return { success: false, error: "Trip leg not found" };

  const existing = await ItineraryRepository.findByTripId(tripId);
  if (!existing || existing.days.every((d) => d.stops.length === 0)) {
    return { success: false, error: "Generate an itinerary first." };
  }

  try {
    const ownerKeys = await getOwnerApiKeysForTripDto(trip);
    const aiConfig = requireAiConfig(ownerKeys, "trip");

    const dayPlans = legId ? buildTripDayPlans(trip) : null;
    const currentDays =
      legId && dayPlans ? existing.days.filter((d) => isDayOwnedByLeg(d.date, dayPlans, legId)) : existing.days;
    const currentOptionalPlaces = legId
      ? existing.optionalPlaces.filter((p) => p.legId === legId)
      : existing.optionalPlaces;

    if (currentDays.length === 0) {
      return { success: false, error: "No days found for this leg to compare." };
    }

    const { days: aiDays, optionalPlaces: aiOptionalPlaces } = await buildAiCandidateForScope(
      trip,
      leg,
      legId,
      aiConfig,
    );

    const generatedAt = new Date().toISOString();
    await ItineraryRepository.upsertAiCandidate(tripId, trip.userId, {
      legId,
      days: aiDays,
      optionalPlaces: aiOptionalPlaces,
      generatedAt,
    });

    return {
      success: true,
      data: {
        currentDays: withDistance(currentDays),
        currentOptionalPlaces,
        aiCandidate: { days: withDistance(aiDays), optionalPlaces: aiOptionalPlaces, generatedAt },
      },
      message: "AI itinerary generated.",
    };
  } catch (err) {
    return actionError(err, "Failed to generate AI itinerary");
  }
}

export async function getItineraryComparison(
  userId: string,
  input: unknown,
): Promise<
  ItineraryActionResult<{
    currentDays: ItineraryDayWithDistance[];
    currentOptionalPlaces: OptionalItineraryPlace[];
    aiCandidate: { days: ItineraryDayWithDistance[]; optionalPlaces: OptionalItineraryPlace[]; generatedAt: string } | null;
  }>
> {
  const parsed = tripIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, legId } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const existing = await ItineraryRepository.findByTripId(tripId);
  if (!existing) return { success: false, error: "Itinerary not found" };

  const dayPlans = legId ? buildTripDayPlans(trip) : null;
  const currentDays =
    legId && dayPlans ? existing.days.filter((d) => isDayOwnedByLeg(d.date, dayPlans, legId)) : existing.days;
  const currentOptionalPlaces = legId
    ? existing.optionalPlaces.filter((p) => p.legId === legId)
    : existing.optionalPlaces;

  const candidate = existing.aiCandidates.find((c) => c.legId === legId) ?? null;

  return {
    success: true,
    data: {
      currentDays: withDistance(currentDays),
      currentOptionalPlaces,
      aiCandidate: candidate
        ? { days: withDistance(candidate.days), optionalPlaces: candidate.optionalPlaces, generatedAt: candidate.generatedAt }
        : null,
    },
  };
}

export async function keepSystemItinerary(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const parsed = tripIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, legId } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const itinerary = await ItineraryRepository.removeAiCandidate(tripId, legId);
  if (!itinerary) return { success: false, error: "Itinerary not found" };

  return { success: true, data: { itinerary }, message: "Kept the current itinerary." };
}

export async function keepAiItinerary(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const parsed = tripIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, legId } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const existing = await ItineraryRepository.findByTripId(tripId);
  if (!existing) return { success: false, error: "Itinerary not found" };

  const candidate = existing.aiCandidates.find((c) => c.legId === legId);
  if (!candidate) return { success: false, error: "No pending AI itinerary for this leg." };

  const mergedByDate = new Map(candidate.days.map((d) => [d.date, d]));
  const finalDays = existing.days.map((d) => mergedByDate.get(d.date) ?? d);
  const finalOptionalPlaces = mergeOptionalPlaces(existing.optionalPlaces, candidate.optionalPlaces, legId);

  await commit(trip, existing, { days: finalDays, optionalPlaces: finalOptionalPlaces }, "Switch to AI itinerary", {
    clearSummary: true,
  });
  const itinerary = await ItineraryRepository.removeAiCandidate(tripId, legId);
  if (!itinerary) return { success: false, error: "Failed to update itinerary" };

  return { success: true, data: { itinerary }, message: "Switched to the AI itinerary." };
}

export async function applyMergedDays(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const parsed = applyMergedDaysSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, legId, days, newlyScheduledFromOptional } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const existing = await ItineraryRepository.findByTripId(tripId);
  if (!existing) return { success: false, error: "Itinerary not found" };

  const existingByDate = new Map(existing.days.map((d) => [d.date, d]));
  for (const day of days) {
    if (!existingByDate.has(day.date)) {
      return { success: false, error: "Merged days must match the existing itinerary's dates" };
    }
  }

  const placeIds = legId
    ? (trip.legs.find((l) => l.id === legId)?.selectedPlaceIds ?? [])
    : getAggregatedSelectedPlaceIds(trip);
  const extraIds = (newlyScheduledFromOptional ?? []).map((n) => n.placeId);
  const env = await buildEnv(trip, [...placeIds, ...extraIds, ...placeIdsInDays(days as ItineraryDay[])]);

  const mergedByDate = new Map(days.map((d) => [d.date, d as ItineraryDay]));
  let finalDays = existing.days.map((d) => mergedByDate.get(d.date) ?? d);

  for (const { date, placeId } of newlyScheduledFromOptional ?? []) {
    const dayIndex = finalDays.findIndex((d) => d.date === date);
    const place = env.placesById.get(placeId);
    if (dayIndex === -1 || !place) continue;
    finalDays[dayIndex] = forceInsertPlaceIntoDay(finalDays[dayIndex], place, env, { userAdded: true });
  }

  const places = placeIds.map((id) => env.placesById.get(id)).filter((p): p is Place => Boolean(p));
  const filled = fillUnscheduledPlaces(finalDays, places, env);
  const changedDates = new Set(days.map((d) => d.date));
  const changedNumbers = new Set(filled.days.filter((d) => changedDates.has(d.date)).map((d) => d.dayNumber));
  finalDays = (await retimeWithRoutes(env, filled.days, { dayNumbers: changedNumbers })).days;
  const finalOptionalPlaces = mergeOptionalPlaces(existing.optionalPlaces, filled.optionalPlaces, legId);

  await commit(trip, existing, { days: finalDays, optionalPlaces: finalOptionalPlaces }, "Apply merged itinerary", {
    clearSummary: true,
  });
  const itinerary = await ItineraryRepository.removeAiCandidate(tripId, legId);
  if (!itinerary) return { success: false, error: "Failed to update itinerary" };

  return { success: true, data: { itinerary }, message: "Itinerary updated." };
}

export async function generateLegGuide(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ trip: Trip }>> {
  const parsed = generateLegGuideSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, legId } = parsed.data;
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const leg = trip.legs.find((l) => l.id === legId);
  if (!leg) return { success: false, error: "Trip leg not found" };

  try {
    const ownerKeys = await getOwnerApiKeysForTripDto(trip);
    const aiConfig = requireAiConfig(ownerKeys, "trip");

    const poolIds = [...leg.discoveryPoolIds, ...leg.foodPoolIds, ...leg.marketPoolIds];
    const places = await PlacesService.getCachedPlaces([...new Set(poolIds)]);
    const legPlaces = places.filter((p) => leg.discoveryPoolIds.includes(p.googlePlaceId ?? ""));
    const foodPlaces = places.filter((p) => leg.foodPoolIds.includes(p.googlePlaceId ?? ""));
    const marketPlaces = places.filter((p) => leg.marketPoolIds.includes(p.googlePlaceId ?? ""));

    const ai = getAIProvider(aiConfig);
    const brief = await ai.generateLegBrief({ trip, leg, places: legPlaces, foodPlaces, marketPlaces });

    const updatedLegs = trip.legs.map((l) => (l.id === legId ? { ...l, destinationBrief: brief } : l));
    const updatedTrip = (await TripRepository.update(tripId, userId, { legs: updatedLegs })) ?? trip;

    return { success: true, data: { trip: updatedTrip }, message: "Local guide generated." };
  } catch (err) {
    return actionError(err, "Failed to generate local guide");
  }
}

/** Re-times the given leg's days after something that moves its start/end points changed (e.g.
 * stays were edited). No-op when there's no itinerary yet. */
export async function retimeLegDaysAfterTripChange(trip: Trip, legId: string, label: string): Promise<void> {
  const existing = await ItineraryRepository.findByTripId(trip.id);
  if (!existing) return;

  const dayPlans = buildTripDayPlans(trip);
  const legDayNumbers = new Set(
    existing.days.filter((d) => isDayOwnedByLeg(d.date, dayPlans, legId)).map((d) => d.dayNumber),
  );
  if (legDayNumbers.size === 0) return;

  const env = await buildEnv(trip, placeIdsInDays(existing.days));
  const { days } = await retimeWithRoutes(env, existing.days, { dayNumbers: legDayNumbers });
  await commit(trip, existing, { days }, label);
}

/** Mark a stop done / skipped (or back to planned). Skipping pulls the rest of the day earlier. */
export async function setStopStatus(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const parsed = setStopStatusSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, dayNumber, stopId, status } = parsed.data;
  const loaded = await loadTripAndItinerary(userId, tripId);
  if ("error" in loaded) return { success: false, error: loaded.error };
  const { trip, itinerary: existing } = loaded;
  if (!existing) return { success: false, error: "Itinerary not found" };

  const day = existing.days.find((d) => d.dayNumber === dayNumber);
  const stop = day?.stops.find((s) => s.id === stopId);
  if (!day || !stop) return { success: false, error: "Stop not found" };
  if (stop.stopType === "transfer" || stop.stopType === "return") {
    return { success: false, error: "Travel and return-to-stay stops can't be marked" };
  }

  const nextDay = { ...day, stops: day.stops.map((s) => (s.id === stopId ? { ...s, status: status ?? undefined } : s)) };
  const label = status === "done" ? `Done: ${stop.placeName}` : status === "skipped" ? `Skip ${stop.placeName}` : `Unmark ${stop.placeName}`;
  const itinerary = await applyDayEdit(trip, existing, [nextDay], label);
  return { success: true, data: { itinerary } };
}

/** "Running late": keep what's done, re-plan the rest of the day starting at `time`. */
export async function replanFromNow(
  userId: string,
  input: unknown,
): Promise<ItineraryActionResult<{ itinerary: Itinerary }>> {
  const parsed = replanFromNowSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues);

  const { tripId, dayNumber, time } = parsed.data;
  const loaded = await loadTripAndItinerary(userId, tripId);
  if ("error" in loaded) return { success: false, error: loaded.error };
  const { trip, itinerary: existing } = loaded;
  if (!existing) return { success: false, error: "Itinerary not found" };

  const day = existing.days.find((d) => d.dayNumber === dayNumber);
  if (!day) return { success: false, error: "Day not found" };

  const env = await buildEnv(trip, placeIdsInDays([day]));
  let routedEnv: EngineEnv = env;
  if (env.googleMapsKey) {
    try {
      const measured = await measureDayHops(trip, [day], env.googleMapsKey);
      if (measured.size > 0) routedEnv = { ...env, travel: travelLookupWithRoutes(env.travel, measured) };
    } catch {
      // estimates are fine
    }
  }

  const { day: replanned } = retimeDay(day, routedEnv, { fromMinutes: parseTimeToMinutes(time) });
  const itinerary = await commit(
    trip,
    existing,
    { days: existing.days.map((d) => (d.dayNumber === dayNumber ? replanned : d)) },
    `Re-plan ${dayLabel(day)} from ${time}`,
  );
  return { success: true, data: { itinerary }, message: `Re-planned from ${time}` };
}
