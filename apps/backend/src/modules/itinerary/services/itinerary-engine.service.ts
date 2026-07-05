import { randomUUID } from "crypto";
import { rankPlacesRuleBased } from "@/modules/ai/services/place-ranking.service";
import type { Place } from "@/modules/places/types/place.types";
import type { ItineraryDay, ItineraryStop, ItineraryStopType } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import {
  assignPlaceToLeg,
  buildPlaceLegHints,
  buildTripDayPlans,
  getEffectiveLegs,
  getLegStartPoint,
} from "@/modules/trips/utils/trip-leg.utils";
import {
  type Coordinates,
  estimateTravelMinutes,
  getDateRange,
  getMaxPlacesPerDay,
  haversineKm,
  minutesToTime,
  parseTimeToMinutes,
} from "@/utils/geo";
import {
  getPlaceTargetArrivalMinutes,
  getPlaceVisitDurationMinutes,
} from "@/modules/itinerary/utils/place-schedule.utils";
import {
  getLegDayBounds,
  type LegDayBounds,
} from "@/modules/itinerary/utils/leg-day-bounds.utils";

interface ScheduleContext {
  dailyStartTime: string;
  dailyEndTime: string;
  transportationMode: Trip["transportationMode"];
  travelStyle: Trip["travelStyle"];
  useFlexibleSchedule: boolean;
  dayStartMin: number;
  dayEndMin: number;
}

function scheduleContextFromTrip(trip: Trip, bounds?: LegDayBounds): ScheduleContext {
  const dailyStart = parseTimeToMinutes(trip.dailyStartTime);
  const dailyEnd = parseTimeToMinutes(trip.dailyEndTime);
  return {
    dailyStartTime: trip.dailyStartTime,
    dailyEndTime: trip.dailyEndTime,
    transportationMode: trip.transportationMode,
    travelStyle: trip.travelStyle,
    useFlexibleSchedule: trip.useFlexibleSchedule ?? false,
    dayStartMin: bounds?.dayStartMin ?? dailyStart,
    dayEndMin: bounds?.dayEndMin ?? dailyEnd,
  };
}

function resolveArrivalMinutes(
  context: ScheduleContext,
  place: Place,
  stopType: ItineraryStopType | undefined,
  travelArrivalMin: number,
  visitMin: number,
): number {
  if (context.useFlexibleSchedule) {
    const target = getPlaceTargetArrivalMinutes(place, stopType);
    const clampedTarget = Math.min(
      Math.max(target, context.dayStartMin),
      context.dayEndMin - visitMin,
    );
    return Math.max(travelArrivalMin, clampedTarget);
  }

  return Math.max(travelArrivalMin, context.dayStartMin);
}

function resolveDayStartMinutes(
  context: ScheduleContext,
  firstPlace: Place | undefined,
  firstStopType: ItineraryStopType | undefined,
  travelMinToFirst: number,
): number {
  if (context.useFlexibleSchedule && firstPlace?.googlePlaceId) {
    const visitMin = getPlaceVisitDurationMinutes(
      firstPlace,
      firstStopType,
      context.travelStyle,
    );
    const target = getPlaceTargetArrivalMinutes(firstPlace, firstStopType);
    const clampedTarget = Math.min(
      Math.max(target, context.dayStartMin),
      context.dayEndMin - visitMin,
    );
    return Math.max(context.dayStartMin, clampedTarget - travelMinToFirst);
  }
  return context.dayStartMin;
}

function getStartPoint(trip: Trip, places: Place[]): Coordinates | null {
  if (trip.hotelCoordinates) return trip.hotelCoordinates;
  const withCoords = places.filter((p) => p.coordinates);
  if (withCoords.length === 0) return null;
  const lat = withCoords.reduce((sum, p) => sum + p.coordinates!.lat, 0) / withCoords.length;
  const lng = withCoords.reduce((sum, p) => sum + p.coordinates!.lng, 0) / withCoords.length;
  return { lat, lng };
}

function hasElderlyCompanion(notes?: string): boolean {
  if (!notes) return false;
  return /parent|elder|senior|wheelchair|mobility/i.test(notes);
}

function selectPlaces(trip: Trip, places: Place[], numDays: number, maxPerDay: number): Place[] {
  const limit = numDays * maxPerDay;
  const withCoords = places.filter((p) => p.coordinates && p.googlePlaceId);

  return rankPlacesRuleBased({
    places: withCoords,
    interests: trip.interests,
    travelStyle: trip.travelStyle,
    mustVisitPlaces: trip.mustVisitPlaces,
    excludedPlaces: trip.excludedPlaces,
    limit,
  });
}

function allocateToDays(
  places: Place[],
  numDays: number,
  maxPerDay: number,
  startPoint: Coordinates,
): Place[][] {
  const buckets: Place[][] = Array.from({ length: numDays }, () => []);

  for (const place of places) {
    let bestDay = 0;
    let bestScore = Infinity;

    for (let day = 0; day < numDays; day++) {
      if (buckets[day].length >= maxPerDay) continue;

      const dayCentroid =
        buckets[day].length > 0
          ? {
              lat: buckets[day].reduce((s, p) => s + p.coordinates!.lat, 0) / buckets[day].length,
              lng: buckets[day].reduce((s, p) => s + p.coordinates!.lng, 0) / buckets[day].length,
            }
          : startPoint;

      const score =
        haversineKm(dayCentroid, place.coordinates!) + buckets[day].length * 2;

      if (score < bestScore) {
        bestScore = score;
        bestDay = day;
      }
    }

    if (buckets[bestDay].length < maxPerDay) {
      buckets[bestDay].push(place);
    }
  }

  return buckets;
}

export function optimizeDayRoute(places: Place[], startPoint: Coordinates): Place[] {
  const remaining = [...places];
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

  return ordered;
}

export function scheduleDayStops(
  places: Place[],
  context: ScheduleContext,
  startPoint: Coordinates,
  existingStopIds?: Map<string, string>,
): ItineraryStop[] {
  const dayEnd = context.dayEndMin;
  const firstPlace = places.find((p) => p.coordinates && p.googlePlaceId);
  const travelToFirst =
    firstPlace?.coordinates != null
      ? estimateTravelMinutes(startPoint, firstPlace.coordinates, context.transportationMode)
      : 0;

  let currentMinutes = resolveDayStartMinutes(context, firstPlace, "sight", travelToFirst);
  let currentLoc = startPoint;
  const stops: ItineraryStop[] = [];

  for (const place of places) {
    if (!place.coordinates || !place.googlePlaceId) continue;

    const travelMin = estimateTravelMinutes(
      currentLoc,
      place.coordinates,
      context.transportationMode,
    );
    const travelArrival = currentMinutes + travelMin;
    const visitMin = getPlaceVisitDurationMinutes(place, "sight", context.travelStyle);
    const arrivalMin = resolveArrivalMinutes(context, place, "sight", travelArrival, visitMin);

    if (arrivalMin + visitMin > dayEnd) break;

    const stopId = existingStopIds?.get(place.googlePlaceId) ?? randomUUID();

    stops.push({
      id: stopId,
      placeId: place.googlePlaceId,
      placeName: place.name,
      sequence: stops.length + 1,
      arrivalTime: minutesToTime(arrivalMin),
      departureTime: minutesToTime(arrivalMin + visitMin),
      visitDurationMinutes: visitMin,
      travelDurationMinutes: travelMin,
      coordinates: { lat: place.coordinates.lat, lng: place.coordinates.lng },
      category: place.category,
      stopType: "sight",
    });

    currentMinutes = arrivalMin + visitMin;
    currentLoc = place.coordinates;
  }

  return stops;
}

export function scheduleMixedDayStops(
  items: Array<{ place: Place; stopType: ItineraryStopType }>,
  context: ScheduleContext,
  startPoint: Coordinates,
  legId?: string,
): ItineraryStop[] {
  const dayEnd = context.dayEndMin;
  const firstItem = items.find((i) => i.place.coordinates && i.place.googlePlaceId);
  const travelToFirst =
    firstItem?.place.coordinates != null
      ? estimateTravelMinutes(startPoint, firstItem.place.coordinates, context.transportationMode)
      : 0;

  let currentMinutes = resolveDayStartMinutes(
    context,
    firstItem?.place,
    firstItem?.stopType,
    travelToFirst,
  );
  let currentLoc = startPoint;
  const stops: ItineraryStop[] = [];

  for (const { place, stopType } of items) {
    if (!place.coordinates || !place.googlePlaceId) continue;

    const travelMin = estimateTravelMinutes(
      currentLoc,
      place.coordinates,
      context.transportationMode,
    );
    const travelArrival = currentMinutes + travelMin;
    const visitMin = getPlaceVisitDurationMinutes(place, stopType, context.travelStyle);
    const arrivalMin = resolveArrivalMinutes(context, place, stopType, travelArrival, visitMin);

    if (arrivalMin + visitMin > dayEnd) break;

    stops.push({
      id: randomUUID(),
      placeId: place.googlePlaceId,
      placeName: place.name,
      sequence: stops.length + 1,
      arrivalTime: minutesToTime(arrivalMin),
      departureTime: minutesToTime(arrivalMin + visitMin),
      visitDurationMinutes: visitMin,
      travelDurationMinutes: travelMin,
      coordinates: { lat: place.coordinates.lat, lng: place.coordinates.lng },
      category: place.category,
      stopType,
      legId,
    });

    currentMinutes = arrivalMin + visitMin;
    currentLoc = place.coordinates;
  }

  return stops;
}

function augmentSightseeingStops(
  sightPlaces: Place[],
  trip: Trip,
  startPoint: Coordinates,
  legId: string | undefined,
  foodPlaces: Place[],
  marketPlaces: Place[],
  dayIndex: number,
  bounds: LegDayBounds,
): ItineraryStop[] {
  if (sightPlaces.length === 0) return [];

  const context = scheduleContextFromTrip(trip, bounds);
  const mid = Math.max(1, Math.ceil(sightPlaces.length / 2));
  const morning = sightPlaces.slice(0, mid);
  const afternoon = sightPlaces.slice(mid);
  const food = foodPlaces.length > 0 ? foodPlaces[dayIndex % foodPlaces.length] : undefined;
  const market =
    marketPlaces.length > 0 ? marketPlaces[dayIndex % marketPlaces.length] : undefined;

  const items: Array<{ place: Place; stopType: ItineraryStopType }> = [
    ...morning.map((place) => ({ place, stopType: "sight" as const })),
  ];
  if (food) items.push({ place: food, stopType: "food" });
  items.push(...afternoon.map((place) => ({ place, stopType: "sight" as const })));
  if (market) items.push({ place: market, stopType: "market" });

  return scheduleMixedDayStops(items, context, startPoint, legId);
}

export interface GenerateItineraryOptions {
  foodPlaces?: Place[];
  marketPlaces?: Place[];
}

function resolveLegPools(
  trip: Trip,
  legId: string,
  options?: GenerateItineraryOptions,
): { food: Place[]; market: Place[] } {
  const leg = getEffectiveLegs(trip).find((l) => l.id === legId);
  const foodIds = new Set(leg?.foodPoolIds ?? trip.foodPoolIds ?? []);
  const marketIds = new Set(leg?.marketPoolIds ?? trip.marketPoolIds ?? []);

  return {
    food: (options?.foodPlaces ?? []).filter(
      (p) => p.googlePlaceId && foodIds.has(p.googlePlaceId),
    ),
    market: (options?.marketPlaces ?? []).filter(
      (p) => p.googlePlaceId && marketIds.has(p.googlePlaceId),
    ),
  };
}

export function recalculateDayStops(
  orderedStops: ItineraryStop[],
  trip: Trip,
  startPoint: Coordinates,
  bounds?: LegDayBounds,
): ItineraryDay["stops"] {
  const context = scheduleContextFromTrip(trip, bounds);
  const dayEnd = context.dayEndMin;
  const firstStop = orderedStops.find((s) => s.coordinates);
  const travelToFirst =
    firstStop?.coordinates != null
      ? estimateTravelMinutes(startPoint, firstStop.coordinates, context.transportationMode)
      : 0;

  const firstPlaceLike: Place | undefined = firstStop
    ? {
        googlePlaceId: firstStop.placeId,
        name: firstStop.placeName,
        city: "",
        country: "",
        category: firstStop.category ?? "Culture",
        source: "google",
      }
    : undefined;

  let currentMinutes = resolveDayStartMinutes(
    context,
    firstPlaceLike,
    firstStop?.stopType,
    travelToFirst,
  );
  let currentLoc = startPoint;
  const result: ItineraryStop[] = [];

  for (const stop of orderedStops) {
    if (!stop.coordinates) continue;

    const placeLike: Place = {
      googlePlaceId: stop.placeId,
      name: stop.placeName,
      city: "",
      country: "",
      category: stop.category ?? "Culture",
      source: "google",
    };

    const travelMin = estimateTravelMinutes(
      currentLoc,
      stop.coordinates,
      context.transportationMode,
    );
    const travelArrival = currentMinutes + travelMin;
    const visitMin = stop.visitDurationMinutes;
    const arrivalMin = resolveArrivalMinutes(
      context,
      placeLike,
      stop.stopType,
      travelArrival,
      visitMin,
    );

    if (arrivalMin + visitMin > dayEnd) break;

    result.push({
      ...stop,
      sequence: result.length + 1,
      travelDurationMinutes: travelMin,
      arrivalTime: minutesToTime(arrivalMin),
      departureTime: minutesToTime(arrivalMin + visitMin),
      visitDurationMinutes: visitMin,
    });

    currentMinutes = arrivalMin + visitMin;
    currentLoc = stop.coordinates;
  }

  return result;
}

export function generateItineraryDays(
  trip: Trip,
  places: Place[],
  options?: GenerateItineraryOptions,
): ItineraryDay[] {
  if (trip.legs.length > 0) {
    return generateLegAwareItineraryDays(trip, places, options);
  }

  const dates = getDateRange(trip.startDate, trip.endDate);
  const startPoint = getStartPoint(trip, places);

  if (!startPoint) {
    throw new Error("No places with coordinates available for routing.");
  }

  let maxPerDay = getMaxPlacesPerDay(trip.travelStyle);
  if (hasElderlyCompanion(trip.notes)) {
    maxPerDay = Math.min(maxPerDay, 3);
  }

  const legacyLeg = getEffectiveLegs(trip)[0];
  const boundsByDate = dates.map((date) => getLegDayBounds(legacyLeg, date, trip));
  const allocatableDates = dates.filter((date) => {
    const bounds = getLegDayBounds(legacyLeg, date, trip);
    return !bounds.skipSightseeing;
  });
  const numAllocDays = allocatableDates.length || 1;

  const selected = selectPlaces(trip, places, numAllocDays, maxPerDay);
  const dayBuckets = allocateToDays(selected, numAllocDays, maxPerDay, startPoint);
  const { food, market } = resolveLegPools(trip, "legacy", options);

  return dates.map((date, index) => {
    const bounds = boundsByDate[index]!;

    if (bounds.skipSightseeing) {
      return {
        dayNumber: index + 1,
        date,
        dayType: "sightseeing" as const,
        stops: [],
      };
    }

    const allocIdx = allocatableDates.indexOf(date);
    const dayPlaces = optimizeDayRoute(dayBuckets[allocIdx >= 0 ? allocIdx : 0] ?? [], startPoint);
    const stops = augmentSightseeingStops(
      dayPlaces,
      trip,
      startPoint,
      undefined,
      food,
      market,
      allocIdx >= 0 ? allocIdx : 0,
      bounds,
    );

    return {
      dayNumber: index + 1,
      date,
      dayType: "sightseeing" as const,
      stops,
    };
  });
}

function buildTransferStop(
  trip: Trip,
  transfer: { label: string; estimatedTravelMinutes?: number },
  fromLeg: TripLeg,
  toLeg: TripLeg,
): ItineraryStop {
  const fromPoint = getLegStartPoint(fromLeg, []);
  const toPoint = getLegStartPoint(toLeg, []);
  let travelMin = transfer.estimatedTravelMinutes ?? 180;

  if (fromPoint && toPoint) {
    travelMin = Math.max(
      transfer.estimatedTravelMinutes ?? 0,
      estimateTravelMinutes(fromPoint, toPoint, trip.transportationMode),
    );
  }

  const startMin = parseTimeToMinutes(trip.dailyStartTime);
  const arrivalMin = startMin + 30;
  const departureMin = arrivalMin + travelMin;

  return {
    id: randomUUID(),
    placeId: `transfer-${fromLeg.id}-${toLeg.id}`,
    placeName: transfer.label,
    sequence: 1,
    arrivalTime: minutesToTime(arrivalMin),
    departureTime: minutesToTime(departureMin),
    visitDurationMinutes: travelMin,
    travelDurationMinutes: 30,
    coordinates: toPoint ?? fromPoint ?? undefined,
    category: "Transfer",
    stopType: "transfer",
    notes: `Inter-city travel from ${fromLeg.baseCity} to ${toLeg.baseCity}`,
  };
}

function computeLegDayMeta(
  trip: Trip,
  dayPlans: ReturnType<typeof buildTripDayPlans>,
  legs: TripLeg[],
): {
  legAllocatableDates: Map<string, string[]>;
  boundsByKey: Map<string, LegDayBounds>;
} {
  const legAllocatableDates = new Map<string, string[]>();
  const boundsByKey = new Map<string, LegDayBounds>();

  for (const leg of legs) {
    const allocatable: string[] = [];

    for (const { date, plan } of dayPlans) {
      if (plan.type !== "sightseeing" || plan.leg.id !== leg.id) continue;

      let transferEndMin: number | undefined;
      if (plan.transferOnDay) {
        const fromLeg = legs.find((l) => l.id === plan.transferOnDay!.fromLegId);
        if (fromLeg) {
          const transferStop = buildTransferStop(trip, plan.transferOnDay, fromLeg, leg);
          transferEndMin = parseTimeToMinutes(transferStop.departureTime);
        }
      }

      const bounds = getLegDayBounds(leg, date, trip, plan.transferOnDay, transferEndMin);
      boundsByKey.set(`${leg.id}:${date}`, bounds);
      if (!bounds.skipSightseeing) allocatable.push(date);
    }

    legAllocatableDates.set(leg.id, allocatable);
  }

  return { legAllocatableDates, boundsByKey };
}

function generateLegAwareItineraryDays(
  trip: Trip,
  places: Place[],
  options?: GenerateItineraryOptions,
): ItineraryDay[] {
  const legs = getEffectiveLegs(trip);
  const dayPlans = buildTripDayPlans(trip);
  const placeLegHints = buildPlaceLegHints(trip);
  const { legAllocatableDates, boundsByKey } = computeLegDayMeta(trip, dayPlans, legs);

  let maxPerDay = getMaxPlacesPerDay(trip.travelStyle);
  if (hasElderlyCompanion(trip.notes)) {
    maxPerDay = Math.min(maxPerDay, 3);
  }

  const placesByLeg = new Map<string, Place[]>();
  for (const leg of legs) {
    placesByLeg.set(leg.id, []);
  }

  for (const place of places) {
    const leg = assignPlaceToLeg(place, legs, placeLegHints);
    if (leg && place.coordinates && place.googlePlaceId) {
      placesByLeg.get(leg.id)?.push(place);
    }
  }

  const legDayBuckets = new Map<string, Place[][]>();
  for (const leg of legs) {
    const legPlaces = placesByLeg.get(leg.id) ?? [];
    const allocatableDates = legAllocatableDates.get(leg.id) ?? [];
    const numDays = allocatableDates.length || 1;
    const startPoint = getLegStartPoint(leg, legPlaces) ?? getStartPoint(trip, legPlaces);

    if (!startPoint) {
      legDayBuckets.set(leg.id, Array.from({ length: numDays }, () => []));
      continue;
    }

    const selected = rankPlacesRuleBased({
      places: legPlaces.filter((p) => p.coordinates && p.googlePlaceId),
      interests: trip.interests,
      travelStyle: trip.travelStyle,
      mustVisitPlaces: trip.mustVisitPlaces,
      excludedPlaces: trip.excludedPlaces,
      limit: numDays * maxPerDay,
    });

    legDayBuckets.set(leg.id, allocateToDays(selected, numDays, maxPerDay, startPoint));
  }

  return dayPlans.map(({ date, plan }, index) => {
    if (plan.type === "transfer") {
      const fromLeg = legs.find((l) => l.id === plan.transfer.fromLegId);
      const toLeg = legs.find((l) => l.id === plan.transfer.toLegId);
      const stops =
        fromLeg && toLeg
          ? [buildTransferStop(trip, plan.transfer, fromLeg, toLeg)]
          : [];

      return {
        dayNumber: index + 1,
        date,
        dayType: "transfer",
        transferLabel: plan.transfer.label,
        stops,
      };
    }

    if (plan.type === "free") {
      return {
        dayNumber: index + 1,
        date,
        dayType: "free",
        stops: [],
      };
    }

    const leg = plan.leg;
    const bounds = boundsByKey.get(`${leg.id}:${date}`)!;
    const allocatableDates = legAllocatableDates.get(leg.id) ?? [];
    const allocIdx = allocatableDates.indexOf(date);

    if (bounds.skipSightseeing) {
      if (plan.transferOnDay) {
        const fromLeg = legs.find((l) => l.id === plan.transferOnDay!.fromLegId);
        if (fromLeg) {
          const transferStop = buildTransferStop(trip, plan.transferOnDay, fromLeg, leg);
          return {
            dayNumber: index + 1,
            date,
            dayType: "sightseeing",
            legId: leg.id,
            legName: leg.name || leg.baseCity,
            transferLabel: plan.transferOnDay.label,
            stops: [transferStop],
          };
        }
      }

      return {
        dayNumber: index + 1,
        date,
        dayType: "sightseeing",
        legId: leg.id,
        legName: leg.name || leg.baseCity,
        stops: [],
      };
    }

    const buckets = legDayBuckets.get(leg.id) ?? [];
    const dayPlaces = allocIdx >= 0 ? (buckets[allocIdx] ?? []) : [];
    const startPoint =
      getLegStartPoint(leg, dayPlaces) ??
      getLegStartPoint(leg, placesByLeg.get(leg.id) ?? []) ??
      getStartPoint(trip, places);

    if (!startPoint) {
      return {
        dayNumber: index + 1,
        date,
        dayType: "sightseeing",
        legId: leg.id,
        legName: leg.name || leg.baseCity,
        stops: [],
      };
    }

    const ordered = optimizeDayRoute(dayPlaces, startPoint);
    const { food, market } = resolveLegPools(trip, leg.id, options);
    const sightStops = augmentSightseeingStops(
      ordered,
      trip,
      startPoint,
      leg.id,
      food,
      market,
      allocIdx >= 0 ? allocIdx : 0,
      bounds,
    );

    if (plan.transferOnDay) {
      const fromLeg = legs.find((l) => l.id === plan.transferOnDay!.fromLegId);
      if (fromLeg) {
        const transferStop = buildTransferStop(trip, plan.transferOnDay, fromLeg, leg);
        const shiftedStops = sightStops.map((stop, i) => ({
          ...stop,
          sequence: i + 2,
        }));

        return {
          dayNumber: index + 1,
          date,
          dayType: "sightseeing",
          legId: leg.id,
          legName: leg.name || leg.baseCity,
          transferLabel: plan.transferOnDay.label,
          stops: [{ ...transferStop, sequence: 1 }, ...shiftedStops],
        };
      }
    }

    return {
      dayNumber: index + 1,
      date,
      dayType: "sightseeing",
      legId: leg.id,
      legName: leg.name || leg.baseCity,
      stops: sightStops,
    };
  });
}

export function reorderDayStops(
  day: ItineraryDay,
  stopIds: string[],
  trip: Trip,
  startPoint: Coordinates,
): ItineraryDay {
  const stopMap = new Map(day.stops.map((s) => [s.id, s]));
  const reordered = stopIds
    .map((id) => stopMap.get(id))
    .filter((s): s is ItineraryStop => Boolean(s));

  const leg = day.legId ? getEffectiveLegs(trip).find((l) => l.id === day.legId) : undefined;
  const bounds = leg ? getLegDayBounds(leg, day.date, trip) : undefined;
  const recalculated = recalculateDayStops(reordered, trip, startPoint, bounds);

  return {
    ...day,
    stops: recalculated,
  };
}
