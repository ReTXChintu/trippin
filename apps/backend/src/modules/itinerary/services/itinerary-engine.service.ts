import { randomUUID } from "crypto";
import { rankPlacesRuleBased } from "@/modules/ai/services/place-ranking.service";
import type { Place } from "@/modules/places/types/place.types";
import type {
  ItineraryDay,
  ItineraryStop,
  ItineraryStopType,
  MealType,
  OptionalItineraryPlace,
  TravelSource,
} from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg, TripLegTransfer } from "@/modules/trips/types/trip-leg.types";
import {
  assignPlaceToLeg,
  buildPlaceLegHints,
  buildTripDayPlans,
  getEffectiveLegs,
  getLegStartPoint,
} from "@/modules/trips/utils/trip-leg.utils";
import { getDayEndStay, getDayStartStay, type StayPoint } from "@/modules/trips/utils/stay.utils";
import {
  type Coordinates,
  estimateRoadKm,
  estimateTravelMinutes,
  getMaxPlacesPerDay,
  haversineKm,
  minutesToTime,
  parseTimeToMinutes,
} from "@/utils/geo";
import {
  getPlaceTargetArrivalMinutes,
  getPlaceVisitDurationMinutes,
} from "@/modules/itinerary/utils/place-schedule.utils";
import { getLegDayBounds, type LegDayBounds } from "@/modules/itinerary/utils/leg-day-bounds.utils";
import {
  fitVisitToHours,
  formatWindows,
  getOpenWindowsOnDate,
  isClosedOnDate,
  weekdayName,
} from "@/modules/places/utils/opening-hours.utils";

// ---------------------------------------------------------------------------------------------
// Travel time
// ---------------------------------------------------------------------------------------------

export interface TravelHop {
  minutes: number;
  km: number;
  source: TravelSource;
}

/** Answers "how long from A to B" — backed by real Google routes where known, estimates otherwise. */
export type TravelLookup = (from: Coordinates, to: Coordinates) => TravelHop;

const NO_TRAVEL: TravelHop = { minutes: 0, km: 0, source: "estimate" };

export function coordKey(c: Coordinates): string {
  return `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`;
}

export function hopKey(from: Coordinates, to: Coordinates): string {
  return `${coordKey(from)}>${coordKey(to)}`;
}

function sameSpot(a: Coordinates, b: Coordinates): boolean {
  return haversineKm(a, b) < 0.05;
}

export function estimateTravelLookup(mode: Trip["transportationMode"]): TravelLookup {
  return (from, to) => {
    if (sameSpot(from, to)) return NO_TRAVEL;
    return {
      minutes: estimateTravelMinutes(from, to, mode),
      km: Math.round(estimateRoadKm(from, to) * 10) / 10,
      source: "estimate",
    };
  };
}

/** Prefers measured hops (keyed by hopKey) and falls back to `fallback` for unknown pairs. */
export function travelLookupWithRoutes(
  fallback: TravelLookup,
  measured: Map<string, { minutes: number; km: number }>,
): TravelLookup {
  return (from, to) => {
    if (sameSpot(from, to)) return NO_TRAVEL;
    const hit = measured.get(hopKey(from, to));
    return hit ? { minutes: hit.minutes, km: hit.km, source: "route" } : fallback(from, to);
  };
}

// ---------------------------------------------------------------------------------------------
// Meals
// ---------------------------------------------------------------------------------------------

interface MealRule {
  label: string;
  durationMin: number;
  /** Never start this meal before this time. */
  earliestMin: number;
  /** Take the meal once the clock reaches this, before the next activity. */
  dueMin: number;
  /** Starting after this is flagged as late. */
  latestStartMin: number;
}

export const MEAL_RULES: Record<MealType, MealRule> = {
  breakfast: { label: "Breakfast", durationMin: 30, earliestMin: 7 * 60, dueMin: 7 * 60, latestStartMin: 10 * 60 + 30 },
  lunch: { label: "Lunch", durationMin: 60, earliestMin: 12 * 60, dueMin: 12 * 60 + 30, latestStartMin: 14 * 60 + 30 },
  tiffin: { label: "Snacks", durationMin: 30, earliestMin: 16 * 60 + 30, dueMin: 16 * 60 + 30, latestStartMin: 18 * 60 },
  dinner: { label: "Dinner", durationMin: 60, earliestMin: 19 * 60 + 30, dueMin: 19 * 60 + 30, latestStartMin: 22 * 60 },
};

export function mealLabel(mealType: MealType | undefined): string {
  return mealType ? MEAL_RULES[mealType].label : "Meal";
}

function mealFitsDay(mealType: MealType, bounds: LegDayBounds): boolean {
  switch (mealType) {
    case "breakfast":
      return bounds.dayStartMin <= 10 * 60;
    case "lunch":
      return bounds.dayStartMin <= 14 * 60 && bounds.dayEndMin >= 12 * 60 + 30;
    case "tiffin":
      return bounds.dayStartMin <= 16 * 60 && bounds.dayEndMin >= 17 * 60 + 30;
    case "dinner":
      // Only when the day actually runs into the evening — not on a day you leave at 18:00.
      return bounds.dayEndMin >= 19 * 60;
  }
}

function makeMealStop(mealType: MealType, legId: string | undefined): ItineraryStop {
  const rule = MEAL_RULES[mealType];
  return {
    id: randomUUID(),
    placeId: "",
    placeName: rule.label,
    sequence: 0,
    arrivalTime: minutesToTime(rule.earliestMin),
    departureTime: minutesToTime(rule.earliestMin + rule.durationMin),
    visitDurationMinutes: rule.durationMin,
    travelDurationMinutes: 0,
    stopType: "meal",
    mealType,
    legId,
  };
}

// ---------------------------------------------------------------------------------------------
// Day context
// ---------------------------------------------------------------------------------------------

/** Everything the scheduler needs that isn't in the day itself. */
export interface EngineEnv {
  trip: Trip;
  placesById: Map<string, Place>;
  travel: TravelLookup;
}

interface DayContext {
  env: EngineEnv;
  date: string;
  legId?: string;
  bounds: LegDayBounds;
  startPoint: Coordinates | null;
  endStay: StayPoint | null;
}

/** Waiting longer than this for a place to open isn't worth it — the generator tries another day. */
const MAX_AUTO_WAIT_MINUTES = 90;

function centroid(points: Coordinates[]): Coordinates | null {
  if (points.length === 0) return null;
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
  };
}

function findLeg(trip: Trip, legId: string | undefined): TripLeg | undefined {
  return legId ? getEffectiveLegs(trip).find((l) => l.id === legId) : undefined;
}

/** The leg whose sightseeing covers `date` (a day's own legId wins when set). */
function legForDate(trip: Trip, date: string, legId?: string): TripLeg | undefined {
  const byId = findLeg(trip, legId);
  if (byId) return byId;
  const plan = buildTripDayPlans(trip).find((d) => d.date === date)?.plan;
  return plan?.type === "sightseeing" ? plan.leg : undefined;
}

function buildTransferStop(
  trip: Trip,
  transfer: Pick<TripLegTransfer, "id" | "label" | "estimatedTravelMinutes" | "date">,
  fromLeg: TripLeg,
  toLeg: TripLeg,
): ItineraryStop {
  const fromPoint = getDayStartStay(fromLeg, transfer.date)?.coordinates ?? getLegStartPoint(fromLeg, []);
  const toPoint = getDayEndStay(toLeg, transfer.date)?.coordinates ?? getLegStartPoint(toLeg, []);
  let travelMin = transfer.estimatedTravelMinutes ?? 180;

  if (fromPoint && toPoint) {
    travelMin = Math.max(
      transfer.estimatedTravelMinutes ?? 0,
      estimateTravelMinutes(fromPoint, toPoint, trip.transportationMode),
    );
  }

  let arrivalMin = parseTimeToMinutes(trip.dailyStartTime) + 30;
  let departureMin = arrivalMin + travelMin;
  let placeName = transfer.label;
  let notes = `Inter-city travel from ${fromLeg.baseCity} to ${toLeg.baseCity}`;

  // A booked flight/train/bus for this transfer: its real times drive the day.
  const booking = (trip.bookings ?? []).find((b) => b.transferId === transfer.id && b.startTime);
  if (booking?.startTime) {
    arrivalMin = parseTimeToMinutes(booking.startTime);
    const sameDayArrival = booking.endTime && (!booking.endDate || booking.endDate === booking.startDate);
    departureMin = sameDayArrival
      ? parseTimeToMinutes(booking.endTime!)
      : booking.endDate && booking.endDate > booking.startDate
        ? 24 * 60 - 1
        : arrivalMin + travelMin;
    if (departureMin <= arrivalMin) departureMin = arrivalMin + travelMin;
    placeName = booking.title;
    notes = [
      `${fromLeg.baseCity} → ${toLeg.baseCity}`,
      booking.provider,
      booking.confirmationNumber ? `Conf. ${booking.confirmationNumber}` : undefined,
    ]
      .filter(Boolean)
      .join(" · ");
    travelMin = departureMin - arrivalMin;
  }

  return {
    id: randomUUID(),
    placeId: `transfer-${fromLeg.id}-${toLeg.id}`,
    placeName,
    sequence: 1,
    arrivalTime: minutesToTime(arrivalMin),
    departureTime: minutesToTime(departureMin),
    visitDurationMinutes: travelMin,
    travelDurationMinutes: 30,
    coordinates: toPoint ?? fromPoint ?? undefined,
    category: "Transfer",
    stopType: "transfer",
    notes,
  };
}

/** Rebuilds a day's inter-city transfer stop from the current trip (legs, stays, linked booking),
 * keeping its id. Days without a transfer are returned unchanged. */
function refreshTransferStop(day: ItineraryDay, trip: Trip): ItineraryDay {
  const plan = buildTripDayPlans(trip).find((d) => d.date === day.date)?.plan;
  const transfer = plan?.type === "transfer" ? plan.transfer : plan?.type === "sightseeing" ? plan.transferOnDay : undefined;
  if (!transfer) return day;

  const legs = getEffectiveLegs(trip);
  const fromLeg = legs.find((l) => l.id === transfer.fromLegId);
  const toLeg = legs.find((l) => l.id === transfer.toLegId);
  if (!fromLeg || !toLeg) return day;

  const existing = day.stops.find((s) => s.stopType === "transfer");
  const fresh = { ...buildTransferStop(trip, transfer, fromLeg, toLeg), id: existing?.id ?? randomUUID() };
  const rest = day.stops.filter((s) => s.stopType !== "transfer");
  return { ...day, transferLabel: fresh.placeName, stops: [fresh, ...rest] };
}

/** Day bounds (start/end minutes) for a leg's date, including the shortened start when the day
 * begins with an inter-city transfer into this leg. */
export function getDayBounds(trip: Trip, leg: TripLeg, date: string): LegDayBounds {
  const plan = buildTripDayPlans(trip).find((d) => d.date === date)?.plan;
  const transferOnDay = plan?.type === "sightseeing" && plan.leg.id === leg.id ? plan.transferOnDay : undefined;

  let transferEndMin: number | undefined;
  if (transferOnDay) {
    const fromLeg = findLeg(trip, transferOnDay.fromLegId);
    if (fromLeg) {
      transferEndMin = parseTimeToMinutes(buildTransferStop(trip, transferOnDay, fromLeg, leg).departureTime);
    }
  }

  return getLegDayBounds(leg, date, trip, transferOnDay, transferEndMin);
}

function makeDayContext(env: EngineEnv, date: string, leg: TripLeg | undefined, fallbackStart: Coordinates | null): DayContext {
  const { trip } = env;
  const bounds: LegDayBounds = leg
    ? getDayBounds(trip, leg, date)
    : {
        dayStartMin: parseTimeToMinutes(trip.dailyStartTime),
        dayEndMin: parseTimeToMinutes(trip.dailyEndTime),
        skipSightseeing: false,
      };

  const startPoint =
    (leg ? getDayStartStay(leg, date)?.coordinates : undefined) ?? trip.hotelCoordinates ?? fallbackStart;

  return {
    env,
    date,
    legId: leg?.id,
    bounds,
    startPoint: startPoint ?? null,
    endStay: leg ? getDayEndStay(leg, date) : null,
  };
}

function contextForDay(env: EngineEnv, day: ItineraryDay): DayContext {
  const leg = legForDate(env.trip, day.date, day.legId);
  const firstCoords = day.stops.find((s) => s.coordinates && s.stopType !== "transfer")?.coordinates ?? null;
  return makeDayContext(env, day.date, leg, firstCoords);
}

// ---------------------------------------------------------------------------------------------
// The scheduler: walks one day's stops in order and assigns real times
// ---------------------------------------------------------------------------------------------

interface WalkOptions {
  /** Drop auto-generated sights that don't fit (closed, closes early, past day end). When false,
   * nothing is removed — problems are reported as warnings on the stop instead. */
  strict: boolean;
  /** Insert meal blocks when they fall due (generation). When false, meals already in the
   * sequence are scheduled where they sit (user edits). */
  autoMeals: boolean;
  /** autoMeals only: meals to reuse instead of fresh placeholders (e.g. a chosen restaurant). */
  preservedMeals?: Map<MealType, ItineraryStop>;
}

interface WalkResult {
  stops: ItineraryStop[];
  dropped: ItineraryStop[];
}

function isDroppable(stop: ItineraryStop): boolean {
  if (stop.locked || stop.userAdded || stop.fixedStartTime) return false;
  return stop.stopType === undefined || stop.stopType === "sight" || stop.stopType === "food" || stop.stopType === "market";
}

function isAnchor(stop: ItineraryStop): boolean {
  return Boolean(stop.fixedStartTime);
}

/** A meal slot with no restaurant chosen and no booked time — a placeholder whose position in the
 * list means nothing, so it always floats to its mealtime when the day is re-timed. */
function isFloatingMeal(stop: ItineraryStop): boolean {
  return stop.stopType === "meal" && !stop.placeId && !stop.fixedStartTime;
}

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "tiffin", "dinner"];

function stripComputed(stop: ItineraryStop): ItineraryStop {
  return { ...stop, warnings: undefined, openingHoursToday: undefined };
}

export function walkDay(sequence: ItineraryStop[], ctx: DayContext, opts: WalkOptions): WalkResult {
  const { env, bounds, date } = ctx;
  const { trip, placesById, travel } = env;

  const leading = sequence.filter((s) => s.stopType === "transfer");
  const existingReturn = sequence.find((s) => s.stopType === "return");
  const generating = opts.autoMeals;
  const allMiddle = sequence.filter((s) => s.stopType !== "transfer" && s.stopType !== "return").map(stripComputed);

  // Meals the walk places by time rather than by list position: every meal type the day has room
  // for when generating; otherwise just the placeholder meals already on the day.
  const floating = generating ? [] : allMiddle.filter(isFloatingMeal);
  const autoMealTypes = new Set<MealType>(
    generating ? MEAL_ORDER.filter((m) => mealFitsDay(m, bounds)) : floating.map((m) => m.mealType ?? "lunch"),
  );
  const mealSource = new Map<MealType, ItineraryStop>([
    ...(opts.preservedMeals ?? new Map()),
    ...floating.map((m) => [m.mealType ?? "lunch", m] as const),
  ]);
  const middle = allMiddle.filter((s) => (generating ? s.stopType !== "meal" : !isFloatingMeal(s)));

  const anchors = middle.filter(isAnchor).sort(
    (a, b) => parseTimeToMinutes(a.fixedStartTime!) - parseTimeToMinutes(b.fixedStartTime!),
  );
  const flexible = middle.filter((s) => !isAnchor(s));

  const out: ItineraryStop[] = [];
  const dropped: ItineraryStop[] = [];
  const mealsDone = new Set<MealType>();

  let t = bounds.dayStartMin;
  let loc: Coordinates | null = ctx.startPoint;

  // "Plan by best times": start the day so the first sight is reached at its ideal hour.
  if (trip.useFlexibleSchedule) {
    const first = flexible.find((s) => s.stopType !== "meal" && s.coordinates && placesById.has(s.placeId));
    const place = first ? placesById.get(first.placeId) : undefined;
    if (first && place) {
      const toFirst = loc ? travel(loc, first.coordinates!).minutes : 0;
      const target = getPlaceTargetArrivalMinutes(place, first.stopType);
      const clamped = Math.min(Math.max(target, bounds.dayStartMin), bounds.dayEndMin - first.visitDurationMinutes);
      t = Math.max(bounds.dayStartMin, clamped - toFirst);
    }
  }

  const hopTo = (coords: Coordinates | undefined): TravelHop => (coords && loc ? travel(loc, coords) : NO_TRAVEL);

  const emit = (stop: ItineraryStop, start: number, duration: number, hop: TravelHop, warnings: string[], hours?: string) => {
    out.push({
      ...stop,
      arrivalTime: minutesToTime(start),
      departureTime: minutesToTime(start + duration),
      visitDurationMinutes: duration,
      travelDurationMinutes: hop.minutes,
      travelDistanceKm: hop.km > 0 ? hop.km : undefined,
      travelSource: stop.coordinates && hop.minutes > 0 ? hop.source : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      openingHoursToday: hours,
    });
    t = start + duration;
    if (stop.coordinates) loc = stop.coordinates;
  };

  const placeMeal = (stop: ItineraryStop) => {
    const mealType = stop.mealType ?? "lunch";
    const rule = MEAL_RULES[mealType];
    const duration = stop.visitDurationMinutes > 0 ? stop.visitDurationMinutes : rule.durationMin;
    const hop = hopTo(stop.coordinates);
    const arrive = t + hop.minutes;
    const warnings: string[] = [];

    let start = Math.max(arrive, rule.earliestMin);
    const place = stop.placeId ? placesById.get(stop.placeId) : undefined;
    const windows = place ? getOpenWindowsOnDate(place, date) : null;

    if (stop.fixedStartTime) {
      const fixed = parseTimeToMinutes(stop.fixedStartTime);
      if (arrive > fixed + 5) warnings.push(`You'd arrive ${arrive - fixed} min after your ${stop.fixedStartTime} booking`);
      start = fixed;
      const fit = fitVisitToHours(windows, start, duration, date);
      if (fit.unavailable && fit.warning) warnings.push(fit.warning);
    } else {
      const fit = fitVisitToHours(windows, start, duration, date);
      start = fit.start;
      if (fit.warning) warnings.push(fit.warning);
    }

    if (start > rule.latestStartMin) warnings.push(`Late ${rule.label.toLowerCase()} (${minutesToTime(start)})`);

    emit(stop, start, duration, hop, warnings, formatWindows(windows));
    mealsDone.add(mealType);
  };

  const placeVisit = (stop: ItineraryStop, nextAnchor: ItineraryStop | undefined): void => {
    const place = stop.placeId ? placesById.get(stop.placeId) : undefined;
    const duration = stop.visitDurationMinutes;
    const hop = hopTo(stop.coordinates);
    const arrive = t + hop.minutes;
    const warnings: string[] = [];
    const windows = place ? getOpenWindowsOnDate(place, date) : null;

    let start = arrive;
    let unavailable = false;

    if (stop.fixedStartTime) {
      const fixed = parseTimeToMinutes(stop.fixedStartTime);
      if (arrive > fixed + 5) warnings.push(`You'd arrive ${arrive - fixed} min after the booked ${stop.fixedStartTime}`);
      start = fixed;
      const fit = fitVisitToHours(windows, start, duration, date);
      if (fit.unavailable && fit.warning) warnings.push(fit.warning);
    } else {
      if (trip.useFlexibleSchedule && place) {
        const target = getPlaceTargetArrivalMinutes(place, stop.stopType);
        const clamped = Math.min(Math.max(target, bounds.dayStartMin), bounds.dayEndMin - duration);
        start = Math.max(arrive, clamped);
      }
      const fit = fitVisitToHours(windows, start, duration, date);
      start = fit.start;
      unavailable = fit.unavailable;
      if (fit.warning) warnings.push(fit.warning);
    }

    const end = start + duration;
    const overruns = end > bounds.dayEndMin;
    const clashesWithAnchor = Boolean(
      nextAnchor &&
        end + (stop.coordinates && nextAnchor.coordinates ? travel(stop.coordinates, nextAnchor.coordinates).minutes : 0) >
          parseTimeToMinutes(nextAnchor.fixedStartTime!),
    );
    const waitsTooLong = start - arrive > MAX_AUTO_WAIT_MINUTES && !trip.useFlexibleSchedule;

    if (opts.strict && isDroppable(stop) && (unavailable || overruns || clashesWithAnchor || waitsTooLong)) {
      dropped.push(stop);
      return;
    }

    if (overruns && !stop.fixedStartTime) warnings.push(`Runs past your day end (${minutesToTime(bounds.dayEndMin)})`);
    emit(stop, start, duration, hop, warnings, formatWindows(windows));
  };

  const placeAnchor = (stop: ItineraryStop) => {
    if (stop.stopType === "meal") placeMeal(stop);
    else placeVisit(stop, undefined);
  };

  const placeAutoMeal = (mealType: MealType) => {
    autoMealTypes.delete(mealType);
    placeMeal(mealSource.get(mealType) ?? makeMealStop(mealType, ctx.legId));
  };

  const insertDueMeals = (nextCost: number) => {
    for (const mealType of ["lunch", "tiffin", "dinner"] as const) {
      if (!autoMealTypes.has(mealType) || mealsDone.has(mealType)) continue;
      const rule = MEAL_RULES[mealType];
      const due =
        t >= rule.dueMin ||
        (mealType === "lunch" && t >= rule.earliestMin && t + nextCost > 14 * 60);
      if (due) placeAutoMeal(mealType);
    }
  };

  if (autoMealTypes.has("breakfast")) placeAutoMeal("breakfast");

  /** When `stop` would end if it were done next — meals can't start before their earliest time. */
  const projectedEnd = (stop: ItineraryStop): number => {
    const arrive = t + hopTo(stop.coordinates).minutes;
    const start = stop.stopType === "meal" ? Math.max(arrive, MEAL_RULES[stop.mealType ?? "lunch"].earliestMin) : arrive;
    return start + stop.visitDurationMinutes;
  };

  for (const stop of flexible) {
    const cost = hopTo(stop.coordinates).minutes + stop.visitDurationMinutes;

    // Booked slots come first whenever doing this stop next would collide with them.
    while (anchors.length > 0 && parseTimeToMinutes(anchors[0].fixedStartTime!) < projectedEnd(stop)) {
      placeAnchor(anchors.shift()!);
    }

    if (stop.stopType === "meal") {
      placeMeal(stop);
      continue;
    }

    insertDueMeals(cost);
    placeVisit(stop, anchors[0]);
  }

  while (anchors.length > 0) placeAnchor(anchors.shift()!);

  // Meals still pending at the end of the day. A new plan only adds them where they make sense;
  // meals that already exist on the day are never dropped by a re-time.
  if (autoMealTypes.has("lunch") && (!generating || t <= MEAL_RULES.lunch.latestStartMin)) placeAutoMeal("lunch");
  if (autoMealTypes.has("tiffin") && (!generating || (t >= 16 * 60 && t <= MEAL_RULES.tiffin.latestStartMin))) {
    placeAutoMeal("tiffin");
  }
  if (autoMealTypes.has("dinner")) placeAutoMeal("dinner");

  const visitedSomewhere = out.some((s) => s.coordinates && s.stopType !== "meal");
  const returns: ItineraryStop[] = [];
  if (ctx.endStay && visitedSomewhere) {
    const hop = hopTo(ctx.endStay.coordinates);
    const arrival = t + hop.minutes;
    returns.push({
      id: existingReturn?.id ?? randomUUID(),
      placeId: "",
      placeName: `Return to ${ctx.endStay.name}`,
      sequence: 0,
      arrivalTime: minutesToTime(arrival),
      departureTime: minutesToTime(arrival),
      visitDurationMinutes: 0,
      travelDurationMinutes: hop.minutes,
      travelDistanceKm: hop.km > 0 ? hop.km : undefined,
      travelSource: hop.minutes > 0 ? hop.source : undefined,
      coordinates: { ...ctx.endStay.coordinates },
      category: "Transfer",
      stopType: "return",
      legId: ctx.legId,
    });
  }

  const stops = [...leading, ...out, ...returns].map((stop, i) => ({ ...stop, sequence: i + 1 }));
  return { stops, dropped };
}

/** Re-times a stored day in its current order. Non-strict by default: user edits never lose stops. */
export function retimeDay(
  day: ItineraryDay,
  env: EngineEnv,
  opts: { strict?: boolean; /** "Running late": re-plan what's left starting now (minutes). */ fromMinutes?: number } = {},
): WalkResult & { day: ItineraryDay } {
  const current = refreshTransferStop(day, env.trip);
  if (current.dayType === "transfer" || current.dayType === "free") {
    return { day: current, stops: current.stops, dropped: [] };
  }
  const ctx = contextForDay(env, current);

  // Stops already done or skipped keep their times; the rest re-plan from where the last one left
  // off (or from `fromMinutes` when the traveller says they're running late).
  // Frozen: anything marked, anything earlier in the day than the last marked stop (it's behind you),
  // and — when re-planning from now — meal slots whose window has already passed.
  const lastMarkedIndex = current.stops.reduce((max, s, i) => (s.status ? i : max), -1);
  const frozen = current.stops.filter(
    (s, i) =>
      s.stopType !== "transfer" &&
      s.stopType !== "return" &&
      (Boolean(s.status) ||
        i < lastMarkedIndex ||
        (opts.fromMinutes !== undefined && isFloatingMeal(s) && MEAL_RULES[s.mealType ?? "lunch"].latestStartMin < opts.fromMinutes)),
  );
  if (frozen.length === 0 && opts.fromMinutes === undefined) {
    const result = walkDay(current.stops, ctx, { strict: opts.strict ?? false, autoMeals: false });
    return { ...result, day: { ...current, stops: result.stops } };
  }

  // Resume from the end of the last finished stop (skipped ones free their time), at its location.
  const lastDone = [...frozen].reverse().find((s) => s.status === "done");
  const start = opts.fromMinutes ?? (lastDone ? parseTimeToMinutes(lastDone.departureTime) : ctx.bounds.dayStartMin);
  const resumeCtx: DayContext = {
    ...ctx,
    bounds: { ...ctx.bounds, dayStartMin: start },
    startPoint: lastDone?.coordinates ?? ctx.startPoint,
  };

  const remaining = current.stops.filter((s) => !frozen.includes(s) && s.stopType !== "transfer");
  const walked = walkDay(remaining, resumeCtx, { strict: opts.strict ?? false, autoMeals: false });
  const leading = current.stops.filter((s) => s.stopType === "transfer");
  const stops = [...leading, ...frozen, ...walked.stops].map((s, i) => ({ ...s, sequence: i + 1 }));
  return { stops, dropped: walked.dropped, day: { ...current, stops } };
}

// ---------------------------------------------------------------------------------------------
// Route ordering
// ---------------------------------------------------------------------------------------------

function pathLength(points: Coordinates[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i]);
  return total;
}

/** Nearest-neighbour from the start, then 2-opt to remove crossings. When `returnTo` is given the
 * route is scored as a loop back there (you end the day at the hotel). */
export function optimizeDayRoute(places: Place[], startPoint: Coordinates, returnTo?: Coordinates | null): Place[] {
  const remaining = places.filter((p) => p.coordinates);
  const ordered: Place[] = [];
  let current = startPoint;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineKm(current, remaining[i].coordinates!);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = next.coordinates!;
  }

  if (ordered.length < 3) return ordered;

  const score = (route: Place[]) =>
    pathLength([startPoint, ...route.map((p) => p.coordinates!), ...(returnTo ? [returnTo] : [])]);

  let best = ordered;
  let bestScore = score(best);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
        const candidateScore = score(candidate);
        if (candidateScore + 1e-9 < bestScore) {
          best = candidate;
          bestScore = candidateScore;
          improved = true;
        }
      }
    }
  }
  return best;
}

function placeToStop(place: Place, trip: Trip, legId: string | undefined, stopType: ItineraryStopType = "sight"): ItineraryStop {
  return {
    id: randomUUID(),
    placeId: place.googlePlaceId!,
    placeName: place.name,
    sequence: 0,
    arrivalTime: trip.dailyStartTime,
    departureTime: trip.dailyStartTime,
    visitDurationMinutes: getPlaceVisitDurationMinutes(place, stopType, trip.travelStyle),
    travelDurationMinutes: 0,
    coordinates: place.coordinates ? { lat: place.coordinates.lat, lng: place.coordinates.lng } : undefined,
    category: place.category,
    stopType,
    legId,
  };
}

/** Index in the day's middle section (between leading transfer and trailing return) where adding
 * `coords` adds the least distance. */
function cheapestInsertionIndex(middle: ItineraryStop[], coords: Coordinates, start: Coordinates | null): number {
  let bestIdx = middle.length;
  let bestAdded = Infinity;
  for (let i = 0; i <= middle.length; i++) {
    const prev = [...middle.slice(0, i)].reverse().find((s) => s.coordinates)?.coordinates ?? start;
    const next = middle.slice(i).find((s) => s.coordinates)?.coordinates ?? null;
    const added = prev
      ? haversineKm(prev, coords) + (next ? haversineKm(coords, next) - haversineKm(prev, next) : 0)
      : next
        ? haversineKm(coords, next)
        : 0;
    // Don't put a sight before breakfast.
    if (i === 0 && middle[0]?.mealType === "breakfast") continue;
    if (added < bestAdded) {
      bestAdded = added;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function splitDay(stops: ItineraryStop[]) {
  return {
    leading: stops.filter((s) => s.stopType === "transfer"),
    middle: stops.filter((s) => s.stopType !== "transfer" && s.stopType !== "return"),
    trailing: stops.filter((s) => s.stopType === "return"),
  };
}

function insertIntoDay(day: ItineraryDay, stop: ItineraryStop, env: EngineEnv, index?: number): ItineraryStop[] {
  const { leading, middle, trailing } = splitDay(day.stops);
  const ctx = contextForDay(env, day);
  const at =
    index !== undefined
      ? Math.min(Math.max(index, 0), middle.length)
      : stop.coordinates
        ? cheapestInsertionIndex(middle, stop.coordinates, ctx.startPoint)
        : middle.length;
  return [...leading, ...middle.slice(0, at), stop, ...middle.slice(at), ...trailing];
}

// ---------------------------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------------------------

/** Stops that survive a regenerate: locked or hand-added stops, and meals with a chosen place or
 * a booked time. Keyed by date. */
export function collectPreservedStops(days: ItineraryDay[]): Map<string, ItineraryStop[]> {
  const byDate = new Map<string, ItineraryStop[]>();
  for (const day of days) {
    const kept = day.stops.filter(
      (s) =>
        s.stopType !== "transfer" &&
        s.stopType !== "return" &&
        (s.locked || s.userAdded || (s.stopType === "meal" && (s.placeId || s.fixedStartTime))),
    );
    if (kept.length > 0) byDate.set(day.date, kept.map(stripComputed));
  }
  return byDate;
}

function isPreservedVisit(stop: ItineraryStop): boolean {
  return stop.stopType !== "meal";
}

/** Builds one sightseeing day: orders nothing itself — takes the visit order as given. */
function buildSightseeingDay(
  env: EngineEnv,
  leg: TripLeg,
  date: string,
  dayNumber: number,
  orderedPlaces: Place[],
  preserved: ItineraryStop[],
  transferStop: ItineraryStop | undefined,
  dressCode: string | undefined,
): { day: ItineraryDay; dropped: ItineraryStop[] } {
  const { trip } = env;
  const legPlaceFallback = centroid(orderedPlaces.flatMap((p) => (p.coordinates ? [p.coordinates] : [])));
  const ctx = makeDayContext(env, date, leg, legPlaceFallback);

  const preservedByPlaceId = new Map(preserved.filter((s) => s.placeId && isPreservedVisit(s)).map((s) => [s.placeId, s]));
  const visits = orderedPlaces.map((p) => preservedByPlaceId.get(p.googlePlaceId!) ?? placeToStop(p, trip, leg.id));

  // Hand-added activities with no Google place aren't in orderedPlaces — slot them in.
  let sequence = [...visits];
  for (const extra of preserved.filter((s) => isPreservedVisit(s) && !orderedPlaces.some((p) => p.googlePlaceId === s.placeId))) {
    const pseudoDay: ItineraryDay = { dayNumber, date, stops: sequence, legId: leg.id };
    sequence = insertIntoDay(pseudoDay, extra, env);
  }

  const preservedMeals = new Map(
    preserved.filter((s) => s.stopType === "meal" && s.mealType).map((s) => [s.mealType!, s] as const),
  );

  const result = walkDay(
    [...(transferStop ? [transferStop] : []), ...sequence],
    ctx,
    { strict: true, autoMeals: true, preservedMeals },
  );

  return {
    day: {
      dayNumber,
      date,
      dayType: "sightseeing",
      legId: leg.id,
      legName: leg.name || leg.baseCity,
      transferLabel: transferStop?.placeName,
      stops: result.stops,
      dressCode,
    },
    dropped: result.dropped,
  };
}

function allocateToDays(
  places: Place[],
  dates: string[],
  capacity: number[],
  startPoint: Coordinates,
  seeded: Place[][],
): Place[][] {
  const buckets = seeded.map((b) => [...b]);

  for (const place of places) {
    let bestDay = -1;
    let bestScore = Infinity;

    for (let day = 0; day < dates.length; day++) {
      if (buckets[day].length >= capacity[day]) continue;
      if (isClosedOnDate(place, dates[day])) continue;

      const dayCenter = centroid(buckets[day].flatMap((p) => (p.coordinates ? [p.coordinates] : []))) ?? startPoint;
      const score = haversineKm(dayCenter, place.coordinates!) + buckets[day].length * 2;
      if (score < bestScore) {
        bestScore = score;
        bestDay = day;
      }
    }

    if (bestDay >= 0) buckets[bestDay].push(place);
  }

  return buckets;
}

function hasElderlyCompanion(notes?: string): boolean {
  if (!notes) return false;
  return /parent|elder|senior|wheelchair|mobility/i.test(notes);
}

function maxStopsPerDay(trip: Trip): number {
  const base = getMaxPlacesPerDay(trip.travelStyle);
  return hasElderlyCompanion(trip.notes) ? Math.min(base, 3) : base;
}

interface GeneratedDays {
  days: ItineraryDay[];
  /** Places the generator picked but couldn't fit on their day. */
  dropped: ItineraryStop[];
}

/** Assigns each date to transfer / free / sightseeing and builds the non-sightseeing days;
 * `buildLegDay` fills in sightseeing days. Shared by the rule-based and AI paths. */
function buildDays(
  env: EngineEnv,
  buildLegDay: (leg: TripLeg, date: string, dayNumber: number, transferStop: ItineraryStop | undefined) => {
    day: ItineraryDay;
    dropped: ItineraryStop[];
  },
): GeneratedDays {
  const { trip } = env;
  const legs = getEffectiveLegs(trip);
  const dayPlans = buildTripDayPlans(trip);
  const dropped: ItineraryStop[] = [];

  const days = dayPlans.map(({ date, plan }, index): ItineraryDay => {
    const dayNumber = index + 1;

    if (plan.type === "transfer") {
      const fromLeg = legs.find((l) => l.id === plan.transfer.fromLegId);
      const toLeg = legs.find((l) => l.id === plan.transfer.toLegId);
      return {
        dayNumber,
        date,
        dayType: "transfer",
        transferLabel: plan.transfer.label,
        stops: fromLeg && toLeg ? [buildTransferStop(trip, plan.transfer, fromLeg, toLeg)] : [],
      };
    }

    if (plan.type === "free") {
      return { dayNumber, date, dayType: "free", stops: [] };
    }

    const leg = plan.leg;
    const fromLeg = plan.transferOnDay ? legs.find((l) => l.id === plan.transferOnDay!.fromLegId) : undefined;
    const transferStop = plan.transferOnDay && fromLeg ? buildTransferStop(trip, plan.transferOnDay, fromLeg, leg) : undefined;

    const built = buildLegDay(leg, date, dayNumber, transferStop);
    dropped.push(...built.dropped);
    return built.day;
  });

  return { days, dropped };
}

/** Rule-based itinerary: rank → cluster into days (skipping days a place is closed) → order each
 * day's route → schedule with real hours and meal breaks. `preservedByDate` stops (locked, hand
 * added, chosen restaurants) stay on their dates. */
export function generateItineraryDays(
  env: EngineEnv,
  places: Place[],
  preservedByDate: Map<string, ItineraryStop[]> = new Map(),
): GeneratedDays {
  const { trip } = env;
  const legs = getEffectiveLegs(trip);
  const dayPlans = buildTripDayPlans(trip);
  const placeLegHints = buildPlaceLegHints(trip);
  const maxPerDay = maxStopsPerDay(trip);

  const preservedPlaceIds = new Set(
    [...preservedByDate.values()].flat().filter(isPreservedVisit).map((s) => s.placeId).filter(Boolean),
  );

  const placesByLeg = new Map<string, Place[]>(legs.map((l) => [l.id, []]));
  for (const place of places) {
    if (!place.googlePlaceId || !place.coordinates) continue;
    const leg = assignPlaceToLeg(place, legs, placeLegHints);
    if (leg) placesByLeg.get(leg.id)?.push(place);
  }

  const bucketsByDate = new Map<string, Place[]>();

  for (const leg of legs) {
    const legPlaces = placesByLeg.get(leg.id) ?? [];
    const dates = dayPlans
      .filter(({ date, plan }) => plan.type === "sightseeing" && plan.leg.id === leg.id && !getDayBounds(trip, leg, date).skipSightseeing)
      .map(({ date }) => date);
    if (dates.length === 0) continue;

    const startPoint =
      getDayStartStay(leg, dates[0])?.coordinates ??
      getLegStartPoint(leg, legPlaces) ??
      centroid(legPlaces.flatMap((p) => (p.coordinates ? [p.coordinates] : [])));
    if (!startPoint) continue;

    const seeded = dates.map((date) =>
      (preservedByDate.get(date) ?? [])
        .filter((s) => isPreservedVisit(s) && s.placeId)
        .map((s) => env.placesById.get(s.placeId))
        .filter((p): p is Place => Boolean(p?.coordinates)),
    );
    const capacity = dates.map((_, i) => Math.max(maxPerDay, seeded[i].length));

    const ranked = rankPlacesRuleBased({
      places: legPlaces.filter((p) => !preservedPlaceIds.has(p.googlePlaceId!)),
      interests: trip.interests,
      travelStyle: trip.travelStyle,
      mustVisitPlaces: trip.mustVisitPlaces,
      excludedPlaces: trip.excludedPlaces,
      limit: dates.length * maxPerDay,
    });

    const buckets = allocateToDays(ranked, dates, capacity, startPoint, seeded);
    dates.forEach((date, i) => bucketsByDate.set(date, buckets[i]));
  }

  return buildDays(env, (leg, date, dayNumber, transferStop) => {
    const bucket = bucketsByDate.get(date) ?? [];
    const start =
      getDayStartStay(leg, date)?.coordinates ??
      getLegStartPoint(leg, placesByLeg.get(leg.id) ?? []) ??
      centroid(bucket.flatMap((p) => (p.coordinates ? [p.coordinates] : [])));
    const ordered = start ? optimizeDayRoute(bucket, start, getDayEndStay(leg, date)?.coordinates) : bucket;
    return buildSightseeingDay(env, leg, date, dayNumber, ordered, preservedByDate.get(date) ?? [], transferStop, undefined);
  });
}

export interface AiPlaceAssignment {
  /** date -> ordered googlePlaceIds the AI assigned to that date */
  byDate: Map<string, string[]>;
  /** date -> AI-suggested dress-code line for that date */
  dressCodeByDate: Map<string, string>;
}

/** Same as generateItineraryDays, but the AI decides which place goes on which date and in what
 * order. Timing still comes from the scheduler — never AI-invented numbers. */
export function buildDaysFromPlaceAssignment(env: EngineEnv, places: Place[], assignment: AiPlaceAssignment): GeneratedDays {
  const placesById = new Map(places.filter((p) => p.googlePlaceId).map((p) => [p.googlePlaceId!, p]));

  return buildDays(env, (leg, date, dayNumber, transferStop) => {
    const bounds = getDayBounds(env.trip, leg, date);
    const ordered = bounds.skipSightseeing
      ? []
      : (assignment.byDate.get(date) ?? [])
          .map((id) => placesById.get(id))
          .filter((p): p is Place => Boolean(p?.coordinates));
    return buildSightseeingDay(env, leg, date, dayNumber, ordered, [], transferStop, assignment.dressCodeByDate.get(date));
  });
}

// ---------------------------------------------------------------------------------------------
// Filling leftovers & user edits
// ---------------------------------------------------------------------------------------------

function keptDroppableCount(stops: ItineraryStop[]): number {
  return stops.filter(isDroppable).length;
}

/** Tries to fit every selected place that isn't scheduled anywhere onto a day of its leg that has
 * room (strictly — without pushing anything else out). The rest become "optional" with a reason. */
export function fillUnscheduledPlaces(
  days: ItineraryDay[],
  places: Place[],
  env: EngineEnv,
): { days: ItineraryDay[]; optionalPlaces: OptionalItineraryPlace[] } {
  const { trip } = env;
  const legs = getEffectiveLegs(trip);
  const placeLegHints = buildPlaceLegHints(trip);
  const scheduledIds = new Set(days.flatMap((d) => d.stops.map((s) => s.placeId)).filter(Boolean));

  const updatedDays = [...days];
  const optionalPlaces: OptionalItineraryPlace[] = [];

  for (const place of places) {
    if (!place.googlePlaceId || !place.coordinates || scheduledIds.has(place.googlePlaceId)) continue;

    const leg = assignPlaceToLeg(place, legs, placeLegHints);
    const candidates = updatedDays
      .map((d, idx) => ({ d, idx }))
      .filter(({ d }) => d.dayType === "sightseeing" && (!leg || d.legId === leg.id));

    let placed = false;
    for (const { d, idx } of candidates) {
      const dayLeg = legForDate(trip, d.date, d.legId);
      if (!dayLeg || getDayBounds(trip, dayLeg, d.date).skipSightseeing) continue;
      if (isClosedOnDate(place, d.date)) continue;

      const draft = placeToStop(place, trip, dayLeg.id);
      const before = keptDroppableCount(d.stops);
      const result = walkDay(insertIntoDay(d, draft, env), contextForDay(env, d), { strict: true, autoMeals: false });

      const fitted = result.stops.some((s) => s.id === draft.id);
      if (fitted && keptDroppableCount(result.stops) === before + 1) {
        updatedDays[idx] = { ...d, stops: result.stops };
        placed = true;
        break;
      }
    }

    if (!placed) {
      const openDays = candidates.filter(({ d }) => !isClosedOnDate(place, d.date));
      let reason: string;
      if (candidates.length === 0) reason = "This city has no sightseeing days left.";
      else if (openDays.length === 0) {
        const closedOn = [...new Set(candidates.map(({ d }) => weekdayName(d.date)))].join(", ");
        reason = `Closed on every day you're there (${closedOn}).`;
      } else {
        reason = "No day had room for it within your daily hours and its opening times.";
      }

      optionalPlaces.push({
        placeId: place.googlePlaceId,
        placeName: place.name,
        category: place.category,
        coordinates: place.coordinates,
        legId: leg?.id,
        reason,
      });
    }
  }

  return { days: updatedDays, optionalPlaces };
}

/** Puts a place on a chosen day even if it overruns — the user asked for exactly this, so it's
 * kept and flagged rather than silently refused. */
export function forceInsertPlaceIntoDay(
  day: ItineraryDay,
  place: Place,
  env: EngineEnv,
  opts: { userAdded?: boolean; index?: number } = {},
): ItineraryDay {
  const leg = legForDate(env.trip, day.date, day.legId);
  const stop = { ...placeToStop(place, env.trip, leg?.id), userAdded: opts.userAdded || undefined };
  const { stops } = walkDay(insertIntoDay(day, stop, env, opts.index), contextForDay(env, day), { strict: false, autoMeals: false });
  return { ...day, stops };
}

export interface CustomStopInput {
  place?: Place;
  name?: string;
  fixedStartTime?: string;
  durationMinutes?: number;
  notes?: string;
}

export function addCustomStop(day: ItineraryDay, input: CustomStopInput, env: EngineEnv): { day: ItineraryDay; stopId: string } {
  const leg = legForDate(env.trip, day.date, day.legId);
  const base: ItineraryStop = input.place
    ? placeToStop(input.place, env.trip, leg?.id)
    : {
        id: randomUUID(),
        placeId: "",
        placeName: input.name!,
        sequence: 0,
        arrivalTime: env.trip.dailyStartTime,
        departureTime: env.trip.dailyStartTime,
        visitDurationMinutes: 60,
        travelDurationMinutes: 0,
        stopType: "activity",
        legId: leg?.id,
      };

  const stop: ItineraryStop = {
    ...base,
    placeName: input.name?.trim() || base.placeName,
    visitDurationMinutes: input.durationMinutes ?? base.visitDurationMinutes,
    fixedStartTime: input.fixedStartTime,
    notes: input.notes,
    userAdded: true,
  };

  const { stops } = walkDay(insertIntoDay(day, stop, env), contextForDay(env, day), { strict: false, autoMeals: false });
  return { day: { ...day, stops }, stopId: stop.id };
}

export function reorderDayStops(day: ItineraryDay, stopIds: string[], env: EngineEnv): ItineraryDay {
  const byId = new Map(day.stops.map((s) => [s.id, s]));
  const reordered = stopIds.map((id) => byId.get(id)).filter((s): s is ItineraryStop => Boolean(s));
  // Anything the client didn't mention (stale list) keeps its place at the end rather than vanishing.
  const missing = day.stops.filter((s) => !stopIds.includes(s.id));
  return retimeDay({ ...day, stops: [...reordered, ...missing] }, env).day;
}

/**
 * Reorders a day's visits for the shortest drive (stay → visits → stay). Meals, stops with a fixed
 * start time, stops already done/skipped and stops without a location keep their slots; only the
 * other visits are shuffled between the remaining slots. Returns the re-timed day and the
 * straight-line route length before and after (km).
 */
export function optimizeDayOrder(day: ItineraryDay, env: EngineEnv): { day: ItineraryDay; beforeKm: number; afterKm: number } {
  const { leading, middle, trailing } = splitDay(day.stops);
  const movable = (s: ItineraryStop) => s.stopType !== "meal" && !s.fixedStartTime && !s.status && Boolean(s.coordinates);
  const start = resolveDayStartPoint(day, env.trip);
  const leg = legForDate(env.trip, day.date, day.legId);
  const end = (leg ? getDayEndStay(leg, day.date)?.coordinates : undefined) ?? start;
  const route = (stops: ItineraryStop[]) =>
    pathLength([...(start ? [start] : []), ...stops.filter((s) => s.coordinates && s.stopType !== "meal").map((s) => s.coordinates!), ...(end ? [end] : [])]);

  const visits = middle.filter(movable);
  const beforeKm = route(middle);
  if (visits.length < 2 || !start) return { day, beforeKm, afterKm: beforeKm };

  const asPlaces = visits.map((s) => ({ googlePlaceId: s.id, name: s.placeName, coordinates: s.coordinates }) as Place);
  const order = optimizeDayRoute(asPlaces, start, end).map((p) => visits.find((s) => s.id === p.googlePlaceId)!);
  let next = 0;
  const reordered = middle.map((s) => (movable(s) ? order[next++] : s));
  const afterKm = route(reordered);
  // Keep the old order unless the new one is actually shorter.
  if (afterKm >= beforeKm - 0.05) return { day, beforeKm, afterKm: beforeKm };
  return { day: retimeDay({ ...day, stops: [...leading, ...reordered, ...trailing] }, env).day, beforeKm, afterKm };
}

/** Resolves the routing start point (the stay you woke up in, trip hotel, or first stop). */
export function resolveDayStartPoint(day: ItineraryDay, trip: Trip): Coordinates | null {
  const leg = legForDate(trip, day.date, day.legId);
  const stay = leg ? getDayStartStay(leg, day.date) : null;
  if (stay) return stay.coordinates;
  if (trip.hotelCoordinates) return trip.hotelCoordinates;
  return day.stops.find((s) => s.coordinates && s.stopType !== "transfer")?.coordinates ?? null;
}

/** Moves a stop to another day (any leg — the user may deliberately want that). */
export function moveStopBetweenDays(
  fromDay: ItineraryDay,
  toDay: ItineraryDay,
  stopId: string,
  env: EngineEnv,
  targetIndex?: number,
): { fromDay: ItineraryDay; toDay: ItineraryDay } {
  const stop = fromDay.stops.find((s) => s.id === stopId);
  if (!stop) throw new Error("Stop not found in source day");

  const toLeg = legForDate(env.trip, toDay.date, toDay.legId);
  const moved: ItineraryStop = { ...stop, legId: toLeg?.id ?? stop.legId };

  const nextFrom = retimeDay({ ...fromDay, stops: fromDay.stops.filter((s) => s.id !== stopId) }, env).day;
  const nextTo = retimeDay({ ...toDay, stops: insertIntoDay(toDay, moved, env, targetIndex) }, env).day;

  return { fromDay: nextFrom, toDay: nextTo };
}
