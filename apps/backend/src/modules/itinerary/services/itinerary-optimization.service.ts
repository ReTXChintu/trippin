import type { Place } from "@/modules/places/types/place.types";
import type { ItineraryDay } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";
import {
  optimizeDayRoute,
  recalculateDayStops,
  reorderDayStops,
} from "@/modules/itinerary/services/itinerary-engine.service";

function getRoutingStart(trip: Trip, day: ItineraryDay): { lat: number; lng: number } | null {
  if (trip.hotelCoordinates) return trip.hotelCoordinates;
  const first = day.stops.find((s) => s.coordinates);
  return first?.coordinates ?? null;
}

export function optimizeItineraryRuleBased(trip: Trip, days: ItineraryDay[]): ItineraryDay[] {
  return days.map((day) => {
    if (day.stops.length <= 1) return day;

    const startPoint = getRoutingStart(trip, day);
    if (!startPoint) return day;

    const places: Place[] = day.stops
      .filter((s) => s.coordinates && s.placeId)
      .map((s) => ({
        googlePlaceId: s.placeId,
        name: s.placeName,
        city: trip.destinationCity,
        state: trip.destinationState,
        country: trip.destinationCountry,
        category: s.category ?? "Culture",
        coordinates: s.coordinates,
        source: "google" as const,
      }));

    const ordered = optimizeDayRoute(places, startPoint);
    const stopIds = ordered
      .map((p) => day.stops.find((s) => s.placeId === p.googlePlaceId)?.id)
      .filter((id): id is string => Boolean(id));

    const remaining = day.stops
      .filter((s) => !stopIds.includes(s.id))
      .map((s) => s.id);

    return reorderDayStops(day, [...stopIds, ...remaining], trip, startPoint);
  });
}

export function applyOptimizedDayOrder(
  trip: Trip,
  days: ItineraryDay[],
  optimizedOrder: { dayNumber: number; stopIds: string[] }[],
): ItineraryDay[] {
  const orderMap = new Map(optimizedOrder.map((d) => [d.dayNumber, d.stopIds]));

  return days.map((day) => {
    const stopIds = orderMap.get(day.dayNumber);
    if (!stopIds) return day;

    const existingIds = new Set(day.stops.map((s) => s.id));
    const validIds = stopIds.filter((id) => existingIds.has(id));
    if (validIds.length === 0) return day;

    const missing = day.stops.filter((s) => !validIds.includes(s.id)).map((s) => s.id);
    const startPoint = getRoutingStart(trip, day);
    if (!startPoint) return day;

    return reorderDayStops(day, [...validIds, ...missing], trip, startPoint);
  });
}

export function validateOptimizedOrder(
  originalDays: ItineraryDay[],
  optimizedOrder: { dayNumber: number; stopIds: string[] }[],
): boolean {
  const originalIds = originalDays.flatMap((d) => d.stops.map((s) => s.id)).sort();
  const proposedIds = optimizedOrder.flatMap((d) => d.stopIds).sort();

  if (originalIds.length !== proposedIds.length) return false;
  return originalIds.every((id, i) => id === proposedIds[i]);
}

export function recalculateAllDays(trip: Trip, days: ItineraryDay[]): ItineraryDay[] {
  return days.map((day) => {
    const startPoint = getRoutingStart(trip, day);
    if (!startPoint || day.stops.length === 0) return day;
    return {
      ...day,
      stops: recalculateDayStops(day.stops, trip, startPoint),
    };
  });
}
