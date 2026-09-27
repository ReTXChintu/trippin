import type { VisitIntel } from "./visit-intel.types";

export type ItineraryStopType = "sight" | "transfer" | "food" | "market" | "meal" | "return" | "activity";

/** "route" = real Google directions; "estimate" = distance-based guess. */
export type TravelSource = "route" | "estimate";

export type MealType = "breakfast" | "lunch" | "tiffin" | "dinner";

export interface ItineraryStop {
  id: string;
  placeId: string;
  placeName: string;
  sequence: number;
  arrivalTime: string;
  departureTime: string;
  visitDurationMinutes: number;
  travelDurationMinutes: number;
  coordinates?: { lat: number; lng: number };
  category?: string;
  stopType?: ItineraryStopType;
  legId?: string;
  notes?: string;
  visitIntel?: VisitIntel;
  aiNotes?: string;
  /** Only set when stopType is "meal" — identifies which meal this editable slot represents. */
  mealType?: MealType;
  /** Stays on its day when the itinerary is regenerated. */
  locked?: boolean;
  /** Added by hand — always kept on regenerate. */
  userAdded?: boolean;
  /** HH:mm — booked slot the rest of the day works around. */
  fixedStartTime?: string;
  warnings?: string[];
  /** The place's hours on this date, e.g. "09:30–17:00" / "Closed". */
  openingHoursToday?: string;
  travelSource?: TravelSource;
  travelDistanceKm?: number;
  /** Expected cost in the trip currency. */
  cost?: number;
  /** Set while travelling. */
  status?: StopStatus;
}

export type StopStatus = "done" | "skipped";

export type ItineraryDayType = "sightseeing" | "transfer" | "free";

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  stops: ItineraryStop[];
  legId?: string;
  legName?: string;
  dayType?: ItineraryDayType;
  transferLabel?: string;
  dressCode?: string;
}

export type ItineraryDayWithDistance = ItineraryDay & { distanceKm: number };

/** A selected place that couldn't be scheduled onto any day — kept visible with a reason instead
 * of being silently dropped, and movable onto a specific day from the UI. */
export interface OptionalItineraryPlace {
  placeId: string;
  placeName: string;
  category?: string;
  coordinates?: { lat: number; lng: number };
  legId?: string;
  reason: string;
}

/** A pending AI-generated alternative for a leg (or the whole trip, when legId is unset),
 * persisted until the user resolves it (keep System, keep AI, or save a manual merge). */
export interface AiItineraryCandidate {
  legId?: string;
  days: ItineraryDay[];
  optionalPlaces: OptionalItineraryPlace[];
  generatedAt: string;
}

export interface Itinerary {
  id: string;
  tripId: string;
  userId: string;
  days: ItineraryDay[];
  optionalPlaces: OptionalItineraryPlace[];
  aiCandidates: AiItineraryCandidate[];
  summary?: string;
  summaryGeneratedAt?: string;
  generatedAt: string;
  updatedAt: string;
  /** Label of the change that Undo would revert. */
  undoLabel?: string;
  historyCount: number;
}

export interface GenerateItineraryInput {
  tripId: string;
  userId: string;
}

export interface UpdateItineraryStopsInput {
  tripId: string;
  userId: string;
  dayNumber: number;
  stopIds: string[];
}
