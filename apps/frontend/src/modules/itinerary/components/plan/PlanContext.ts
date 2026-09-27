import { createContext, useContext } from "react";
import type { ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripBooking } from "@/modules/trips/types/trip-extras.types";

export interface MoveTarget {
  dayNumber: number;
  label: string;
}

/** Actions a stop row can trigger — provided once by PlanView instead of drilling through DayCard. */
export interface PlanActions {
  trip: Trip;
  readOnly: boolean;
  highlightedStopId: string | null;
  setHighlightedStopId: (id: string | null) => void;
  openDetails: (stop: ItineraryStop, day: ItineraryDay) => void;
  openEdit: (stop: ItineraryStop, day: ItineraryDay) => void;
  openMealPicker: (stop: ItineraryStop, day: ItineraryDay) => void;
  openAddStop: (day: ItineraryDay) => void;
  toggleLock: (stop: ItineraryStop, day: ItineraryDay) => void;
  removeStop: (stop: ItineraryStop, day: ItineraryDay) => void;
  moveStop: (stop: ItineraryStop, day: ItineraryDay, toDayNumber: number) => void;
  reorder: (day: ItineraryDay, stopIds: string[]) => void;
  moveTargets: (day: ItineraryDay) => MoveTarget[];
  addBookingToDay: (booking: TripBooking, day: ItineraryDay) => void;
  busyStopId: string | null;
}

const PlanContext = createContext<PlanActions | null>(null);

export const PlanProvider = PlanContext.Provider;

export function usePlan(): PlanActions {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used inside PlanProvider");
  return ctx;
}
