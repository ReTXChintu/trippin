import type { TripLeg, TripStay } from "@/modules/trips/types/trip-leg.types";

export interface StayPoint {
  name: string;
  coordinates: { lat: number; lng: number };
}

/** A leg's stays, oldest check-in first. Legs saved before stays existed only have the legacy
 * hotel* fields — those are treated as one stay spanning the whole leg. */
export function getEffectiveStays(leg: TripLeg): TripStay[] {
  if (leg.stays?.length) {
    return [...leg.stays].sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
  }
  if (!leg.hotelName && !leg.hotelCoordinates) return [];
  return [
    {
      id: `legacy-${leg.id}`,
      name: leg.hotelName ?? "Hotel",
      address: leg.hotelAddress,
      coordinates: leg.hotelCoordinates,
      checkInDate: leg.startDate,
      checkOutDate: leg.endDate,
    },
  ];
}

/** Where you sleep on the night of `date` (checkIn <= date < checkOut). */
export function getNightStay(leg: TripLeg, date: string): TripStay | undefined {
  return getEffectiveStays(leg).find((s) => s.checkInDate <= date && date < s.checkOutDate);
}

/** Where you woke up on `date` (checked in before it, checking out on or after it). */
export function getMorningStay(leg: TripLeg, date: string): TripStay | undefined {
  return getEffectiveStays(leg).find((s) => s.checkInDate < date && date <= s.checkOutDate);
}

function toPoint(stay: TripStay | undefined): StayPoint | null {
  if (!stay?.coordinates) return null;
  return { name: stay.name, coordinates: stay.coordinates };
}

/** The day's routing start: the stay you woke up in, else (arrival day) the one you check into. */
export function getDayStartStay(leg: TripLeg, date: string): StayPoint | null {
  return toPoint(getMorningStay(leg, date)) ?? toPoint(getNightStay(leg, date));
}

/** Where the day ends — the stay you sleep in tonight. Null on the leg's last day (you leave). */
export function getDayEndStay(leg: TripLeg, date: string): StayPoint | null {
  return toPoint(getNightStay(leg, date));
}

/** Mirrors the first stay into the legacy hotel* fields that older code paths (discovery bias,
 * rentals, public share page) still read. */
export function syncLegacyHotelFields(leg: TripLeg): TripLeg {
  const stays = leg.stays ?? [];
  if (stays.length === 0) {
    return { ...leg, hotelName: undefined, hotelAddress: undefined, hotelCoordinates: undefined };
  }
  const primary = [...stays].sort((a, b) => a.checkInDate.localeCompare(b.checkInDate))[0];
  return {
    ...leg,
    hotelName: primary.name,
    hotelAddress: primary.address,
    hotelCoordinates: primary.coordinates,
  };
}

/** Nights in the leg that no stay covers — surfaced in the UI as "no bed booked" gaps. */
export function getUncoveredNights(leg: TripLeg): string[] {
  const uncovered: string[] = [];
  const cursor = new Date(`${leg.startDate}T00:00:00Z`);
  const end = new Date(`${leg.endDate}T00:00:00Z`);
  while (cursor < end) {
    const date = cursor.toISOString().slice(0, 10);
    if (!getNightStay(leg, date)) uncovered.push(date);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return uncovered;
}
