import type { IconType } from "react-icons";
import { LuBus, LuCalendar, LuCar, LuMap, LuPlane, LuShip, LuTicket, LuTrainFront, LuUtensils } from "react-icons/lu";
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { BookingType } from "@/modules/trips/types/trip-extras.types";

export const BOOKING_META: Record<BookingType, { label: string; icon: IconType; color: string }> = {
  flight: { label: "Flight", icon: LuPlane, color: "blue" },
  train: { label: "Train", icon: LuTrainFront, color: "purple" },
  bus: { label: "Bus", icon: LuBus, color: "purple" },
  car: { label: "Car / taxi", icon: LuCar, color: "purple" },
  ferry: { label: "Ferry", icon: LuShip, color: "cyan" },
  tour: { label: "Tour / activity", icon: LuMap, color: "green" },
  ticket: { label: "Ticket / show", icon: LuTicket, color: "pink" },
  restaurant: { label: "Restaurant", icon: LuUtensils, color: "orange" },
  other: { label: "Other", icon: LuCalendar, color: "gray" },
};

/** Day number of `date` within the trip (1-based). */
export function tripDayNumber(trip: Trip, date: string): number | undefined {
  try {
    const n = differenceInCalendarDays(parseISO(date), parseISO(trip.startDate.slice(0, 10))) + 1;
    return n >= 1 ? n : undefined;
  } catch {
    return undefined;
  }
}
