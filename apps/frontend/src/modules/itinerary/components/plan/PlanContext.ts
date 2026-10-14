import { createContext, useContext } from "react";
import type { ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripBooking } from "@/modules/trips/types/trip-extras.types";

export interface MoveTarget {
  dayNumber: number;
  label: string;
}

/** Actions a stop row can trigger — provided once by PlanView instead of drilling through DayCard. */
import type { DayRouteInsights } from "@/modules/itinerary/utils/route-insights";

export interface PlanActions {
  trip: Trip;
  readOnly: boolean;
  /** Phone layout: compact rows. */
  compact: boolean;
  highlightedStopId: string | null;
  setHighlightedStopId: (id: string | null) => void;
  /** The stop opened in the list (shows its action row and the map card). */
  selectedStopId: string | null;
  selectStop: (stop: ItineraryStop | null, day?: ItineraryDay) => void;
  openDetails: (stop: ItineraryStop, day: ItineraryDay) => void;
  openEdit: (stop: ItineraryStop, day: ItineraryDay) => void;
  openMealPicker: (stop: ItineraryStop, day: ItineraryDay, tab?: "nearby" | "saved") => void;
  /** Assign a restaurant to a meal slot straight from a suggestion chip. */
  chooseMeal: (stop: ItineraryStop, day: ItineraryDay, placeId: string, name: string) => void;
  /** Whether meal slots of this day may fetch inline suggestions (selected day, Maps key present). */
  mealHints: (day: ItineraryDay) => boolean;
  openAddStop: (day: ItineraryDay) => void;
  toggleLock: (stop: ItineraryStop, day: ItineraryDay) => void;
  removeStop: (stop: ItineraryStop, day: ItineraryDay) => void;
  moveStop: (stop: ItineraryStop, day: ItineraryDay, toDayNumber: number) => void;
  reorder: (day: ItineraryDay, stopIds: string[]) => void;
  moveTargets: (day: ItineraryDay) => MoveTarget[];
  addBookingToDay: (booking: TripBooking, day: ItineraryDay) => void;
  setStatus: (stop: ItineraryStop, day: ItineraryDay, status: "done" | "skipped" | null) => void;
  openComments: (stop: ItineraryStop) => void;
  commentCount: (stopId: string) => number;
  busyStopId: string | null;
  /** Jump to another tab (e.g. Stays when a night has no stay). */
  goTo: (tab: "stays" | "places" | "bookings", legId?: string) => void;
  replanCity: (legId: string) => void;
  /** Reorder a day (or every day) for the shortest drive. */
  optimizeDay: (day?: ItineraryDay) => void;
  /** Route checks for a day: saving from reordering, overrun past the day's end, far-off stops. */
  dayInsights: (day: ItineraryDay) => DayRouteInsights;
  showDayOnMap: (day: ItineraryDay) => void;
}

const PlanContext = createContext<PlanActions | null>(null);

export const PlanProvider = PlanContext.Provider;

export function usePlan(): PlanActions {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used inside PlanProvider");
  return ctx;
}
