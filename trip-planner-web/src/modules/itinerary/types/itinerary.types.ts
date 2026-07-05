import type { VisitIntel } from "./visit-intel.types";

export type ItineraryStopType = "sight" | "transfer" | "food" | "market";

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
}

export interface Itinerary {
  id: string;
  tripId: string;
  userId: string;
  days: ItineraryDay[];
  summary?: string;
  summaryGeneratedAt?: string;
  generatedAt: string;
  updatedAt: string;
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
