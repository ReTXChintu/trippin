import type { VisitIntel } from "./visit-intel.types";

export type ItineraryStopType = "sight" | "transfer" | "food" | "market" | "meal" | "return" | "activity";

/** "route" = Google Directions for the real road/transit path; "estimate" = distance-based guess
 * (no Maps key, or the Directions call failed). */
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
  /** Kept on its day (and never auto-dropped) when the itinerary is regenerated. */
  locked?: boolean;
  /** Added by hand rather than by the generator — always preserved on regenerate. */
  userAdded?: boolean;
  /** HH:mm — a booked slot (tour, show, reservation). The schedule works around it. */
  fixedStartTime?: string;
  /** Problems with this stop as scheduled: closed that day, closes early, runs late, … */
  warnings?: string[];
  /** The place's hours on this stop's date, e.g. "09:30–17:00", "Closed", "Open 24 hours". */
  openingHoursToday?: string;
  travelSource?: TravelSource;
  /** Distance of the hop that arrives at this stop. */
  travelDistanceKm?: number;
  /** Expected cost (tickets, meal) in the trip currency — feeds the budget. */
  cost?: number;
}

export type ItineraryDayType = "sightseeing" | "transfer" | "free";

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  stops: ItineraryStop[];
  legId?: string;
  legName?: string;
  dayType?: ItineraryDayType;
  transferLabel?: string;
  /** Suggested outfit/clothing for the day's activities and photo ops — AI-generated only. */
  dressCode?: string;
}

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

/** A snapshot of the editable itinerary state taken before each change, for undo. */
export interface ItinerarySnapshot {
  label: string;
  days: ItineraryDay[];
  optionalPlaces: OptionalItineraryPlace[];
  createdAt: string;
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
  /** Label of the most recent change that can be undone (e.g. "Regenerate Jaipur"). */
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
