import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg, TripLegTransfer } from "@/modules/trips/types/trip-leg.types";
import { parseClockTime } from "@/modules/itinerary/utils/place-schedule.utils";
import { parseTimeToMinutes } from "@/utils/geo";

export interface LegDayBounds {
  dayStartMin: number;
  dayEndMin: number;
  skipSightseeing: boolean;
}

/** Minimum available minutes to allocate places on a leg day. */
export const MIN_SIGHTSEEING_WINDOW_MINUTES = 90;

export function isLegLastDay(leg: TripLeg, date: string): boolean {
  return date === leg.endDate;
}

export function isLegFirstSightseeingDay(
  leg: TripLeg,
  date: string,
  transferOnDay?: TripLegTransfer,
): boolean {
  if (transferOnDay && transferOnDay.toLegId === leg.id) return true;
  return date === leg.startDate;
}

export function getLegDayBounds(
  leg: TripLeg,
  date: string,
  trip: Trip,
  transferOnDay?: TripLegTransfer,
  transferEndMin?: number,
): LegDayBounds {
  const dailyStart = parseTimeToMinutes(trip.dailyStartTime);
  const dailyEnd = parseTimeToMinutes(trip.dailyEndTime);

  let dayStartMin = dailyStart;
  let dayEndMin = dailyEnd;

  const isFirstDay = isLegFirstSightseeingDay(leg, date, transferOnDay);
  const isLastDay = isLegLastDay(leg, date);

  if (isFirstDay) {
    const arrivalMin = leg.arrivalTime
      ? (parseClockTime(leg.arrivalTime) ?? dailyStart)
      : dailyStart;

    if (transferOnDay && transferEndMin != null) {
      dayStartMin = Math.max(arrivalMin, transferEndMin + 30, dailyStart);
    } else {
      dayStartMin = Math.max(arrivalMin, dailyStart);
    }
  }

  if (isLastDay && leg.departureTime) {
    const depMin = parseClockTime(leg.departureTime) ?? dailyEnd;
    dayEndMin = Math.min(dailyEnd, depMin);

    const available = dayEndMin - dayStartMin;
    const skipSightseeing =
      depMin <= dailyStart || available < MIN_SIGHTSEEING_WINDOW_MINUTES;

    return { dayStartMin, dayEndMin, skipSightseeing };
  }

  const available = dayEndMin - dayStartMin;
  return {
    dayStartMin,
    dayEndMin,
    skipSightseeing: available < MIN_SIGHTSEEING_WINDOW_MINUTES,
  };
}
