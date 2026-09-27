import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripDayPlan, TripLeg, TripLegTransfer } from "@/modules/trips/types/trip-leg.types";
import { getDateRange, haversineKm } from "@/utils/geo";
import type { Place } from "@/modules/places/types/place.types";

export function newTripLegId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `leg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyLeg(order: number, country = ""): TripLeg {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: newTripLegId(),
    name: "",
    baseCity: "",
    dayTripAreas: [],
    startDate: today,
    endDate: today,
    country,
    order,
    discoveryPoolIds: [],
    foodPoolIds: [],
    marketPoolIds: [],
    selectedPlaceIds: [],
    aiMatchedPlaceIds: [],
    aiSuggestedPlaceNames: [],
    vehicleRentalSuggestions: [],
    stays: [],
  };
}

export function getEffectiveLegs(trip: Trip): TripLeg[] {
  if (trip.legs.length > 0) {
    return [...trip.legs].sort((a, b) => a.order - b.order);
  }

  return [
    {
      id: "legacy",
      name: trip.destinationCity,
      baseCity: trip.destinationCity,
      dayTripAreas: [],
      startDate: trip.startDate.slice(0, 10),
      endDate: trip.endDate.slice(0, 10),
      arrivalTime: trip.arrivalTime,
      departureTime: trip.departureTime,
      state: trip.destinationState,
      country: trip.destinationCountry,
      hotelName: trip.hotelName,
      hotelAddress: trip.hotelAddress,
      hotelCoordinates: trip.hotelCoordinates,
      stays: [],
      order: 0,
      discoveryPoolIds: trip.discoveryPoolIds ?? [],
      foodPoolIds: trip.foodPoolIds ?? [],
      marketPoolIds: trip.marketPoolIds ?? [],
      selectedPlaceIds: [],
      aiMatchedPlaceIds: [],
      aiSuggestedPlaceNames: [],
      destinationBrief: trip.destinationBrief,
      vehicleRentalSuggestions: trip.vehicleRentalSuggestions ?? [],
    },
  ];
}

export function getEffectiveTransfers(trip: Trip): TripLegTransfer[] {
  return trip.transfers ?? [];
}

export function getAggregatedDiscoveryPoolIds(trip: Trip): string[] {
  const legs = getEffectiveLegs(trip);
  const ids = new Set<string>();
  for (const leg of legs) {
    for (const id of leg.discoveryPoolIds) ids.add(id);
  }
  for (const id of trip.discoveryPoolIds ?? []) ids.add(id);
  return Array.from(ids);
}

export function syncTripDatesFromLegs(
  legs: TripLeg[],
  transfers: TripLegTransfer[],
): { startDate: string; endDate: string; destinationCity: string } | null {
  if (legs.length === 0) return null;

  const sorted = [...legs].sort((a, b) => a.order - b.order);
  const allDates = [
    ...sorted.map((l) => l.startDate),
    ...sorted.map((l) => l.endDate),
    ...transfers.map((t) => t.date),
  ].sort();

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const destinationCity =
    sorted.length === 1
      ? first.baseCity
      : `${first.baseCity} → ${last.baseCity}`;

  return {
    startDate: allDates[0] ?? first.startDate,
    endDate: allDates[allDates.length - 1] ?? last.endDate,
    destinationCity,
  };
}

export function buildTripDayPlans(trip: Trip): { date: string; plan: TripDayPlan }[] {
  const legs = getEffectiveLegs(trip);
  const transfers = getEffectiveTransfers(trip);
  const transferByDate = new Map(transfers.map((t) => [t.date, t]));

  return getDateRange(trip.startDate, trip.endDate).map((date) => {
    const transfer = transferByDate.get(date);
    const leg = legs.find((l) => date >= l.startDate && date <= l.endDate);

    if (transfer && leg && transfer.toLegId === leg.id) {
      return { date, plan: { type: "sightseeing" as const, leg, transferOnDay: transfer } };
    }

    if (transfer) {
      return { date, plan: { type: "transfer" as const, transfer } };
    }

    if (leg) {
      return { date, plan: { type: "sightseeing" as const, leg } };
    }

    return { date, plan: { type: "free" as const } };
  });
}

export function getLegStartPoint(leg: TripLeg, places: Place[]): { lat: number; lng: number } | null {
  if (leg.hotelCoordinates) return leg.hotelCoordinates;
  const legPlaces = places.filter((p) => p.coordinates);
  if (legPlaces.length === 0) return null;
  return {
    lat: legPlaces.reduce((s, p) => s + p.coordinates!.lat, 0) / legPlaces.length,
    lng: legPlaces.reduce((s, p) => s + p.coordinates!.lng, 0) / legPlaces.length,
  };
}

export function assignPlaceToLeg(
  place: Place,
  legs: TripLeg[],
  placeLegHints: Map<string, string>,
): TripLeg | null {
  if (!place.googlePlaceId || !place.coordinates) return null;

  const hintLegId = placeLegHints.get(place.googlePlaceId);
  if (hintLegId) {
    const hinted = legs.find((l) => l.id === hintLegId);
    if (hinted) return hinted;
  }

  let bestLeg: TripLeg | null = null;
  let bestDist = Infinity;

  for (const leg of legs) {
    const start = getLegStartPoint(leg, [place]);
    if (!start) continue;
    const dist = haversineKm(start, place.coordinates);
    if (dist < bestDist) {
      bestDist = dist;
      bestLeg = leg;
    }
  }

  return bestLeg;
}

export function buildPlaceLegHints(trip: Trip): Map<string, string> {
  const hints = new Map<string, string>();
  for (const leg of getEffectiveLegs(trip)) {
    for (const placeId of leg.discoveryPoolIds) {
      hints.set(placeId, leg.id);
    }
  }
  return hints;
}

export function countSightseeingDays(trip: Trip): number {
  return buildTripDayPlans(trip).filter((d) => d.plan.type === "sightseeing").length;
}

/**
 * Whether a day (by date) "belongs" to a leg — mirrors the backend's isDayOwnedByLeg, used to
 * filter the itinerary's days down to just the ones this leg's tab should show.
 */
export function isDayOwnedByLeg(
  date: string,
  dayPlans: { date: string; plan: TripDayPlan }[],
  legId: string,
): boolean {
  const entry = dayPlans.find((d) => d.date === date);
  if (!entry) return false;
  const { plan } = entry;
  if (plan.type === "sightseeing") return plan.leg.id === legId;
  if (plan.type === "transfer") return plan.transfer.fromLegId === legId || plan.transfer.toLegId === legId;
  return false;
}
