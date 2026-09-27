import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { TripLeg, TripStay } from "@/modules/trips/types/trip-leg.types";

export function newStayId(): string {
  return crypto.randomUUID();
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Stays oldest first. Legs from before stays existed only have hotel* — shown as one stay. */
export function getEffectiveStays(leg: TripLeg): TripStay[] {
  if (leg.stays?.length) return [...leg.stays].sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
  if (!leg.hotelName) return [];
  return [
    {
      id: `legacy-${leg.id}`,
      name: leg.hotelName,
      address: leg.hotelAddress,
      coordinates: leg.hotelCoordinates,
      checkInDate: leg.startDate,
      checkOutDate: leg.endDate > leg.startDate ? leg.endDate : addDays(leg.startDate, 1),
    },
  ];
}

export function getNightStay(leg: TripLeg, date: string): TripStay | undefined {
  return getEffectiveStays(leg).find((s) => s.checkInDate <= date && date < s.checkOutDate);
}

/** Nights in the leg without a bed. The leg's last date is the day you leave, so it isn't a night. */
export function getUncoveredNights(leg: TripLeg): string[] {
  const nights: string[] = [];
  for (let date = leg.startDate; date < leg.endDate; date = addDays(date, 1)) {
    if (!getNightStay(leg, date)) nights.push(date);
  }
  return nights;
}

export function nightCount(stay: Pick<TripStay, "checkInDate" | "checkOutDate">): number {
  try {
    return Math.max(differenceInCalendarDays(parseISO(stay.checkOutDate), parseISO(stay.checkInDate)), 0);
  } catch {
    return 0;
  }
}

export function formatShortDate(date: string): string {
  try {
    return format(parseISO(date), "EEE d MMM");
  } catch {
    return date;
  }
}

/** First run of consecutive uncovered nights — the natural dates to prefill when adding a stay. */
export function firstUncoveredRange(leg: TripLeg): { checkInDate: string; checkOutDate: string } {
  const nights = getUncoveredNights(leg);
  if (nights.length === 0) {
    return { checkInDate: leg.startDate, checkOutDate: leg.endDate > leg.startDate ? leg.endDate : addDays(leg.startDate, 1) };
  }
  let end = nights[0];
  for (const night of nights.slice(1)) {
    if (night !== addDays(end, 1)) break;
    end = night;
  }
  return { checkInDate: nights[0], checkOutDate: addDays(end, 1) };
}

/** Where you wake up on `date` — else (arrival day) the stay you check into. */
export function getDayStartStay(leg: TripLeg, date: string): TripStay | undefined {
  const stays = getEffectiveStays(leg);
  return stays.find((s) => s.checkInDate < date && date <= s.checkOutDate) ?? getNightStay(leg, date);
}
