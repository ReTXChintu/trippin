import type { ItineraryDay } from "@/modules/itinerary/types";
import type { VisitIntel } from "@/modules/itinerary/types/visit-intel.types";
import type { Place, RankPlacesParams } from "@/modules/places/types/place.types";
import type { LegDestinationBrief } from "@/modules/trips/types/trip-enrichment.types";
import type { TripDraft, Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import type { AiProviderName } from "@/constants/ai";

/** Which provider, key and model an AI call runs with (resolved from the trip owner's profile). */
export interface AiConfig {
  provider: AiProviderName;
  apiKey: string;
  model: string;
}

export interface ParsedPromptResult {
  draft: TripDraft;
  companions: string[];
  confidence: number;
}

/** A trip sketched by the AI from one sentence — any destination, one or more cities. */
export interface AiTripDraft {
  title: string;
  /** YYYY-MM-DD, only when the prompt gives or clearly implies a date. */
  startDate?: string;
  cities: { city: string; state?: string; country: string; days: number }[];
  interests: string[];
  travelStyle?: "Relaxed" | "Balanced" | "Fast Paced";
  transportationMode?: "Walking" | "Cab" | "Self Drive" | "Bike" | "Public Transport";
  budgetLevel?: "budget" | "moderate" | "luxury";
  /** Who's travelling / special needs, as a short note. */
  notes?: string;
}

export interface PlanEditInput {
  instruction: string;
  days: {
    dayNumber: number;
    date: string;
    city?: string;
    stops: { id: string; name: string; type: string; time: string; minutes: number; locked?: boolean; fixedTime?: string }[];
  }[];
  /** Places the traveller picked that aren't on any day (can be added). */
  unscheduled: { placeId: string; name: string; city?: string }[];
}

export type PlanEditOperation =
  | { op: "move"; stopId: string; toDayNumber: number }
  | { op: "remove"; stopId: string }
  | { op: "add"; placeId: string; dayNumber: number }
  | { op: "setDuration"; stopId: string; minutes: number }
  | { op: "lock"; stopId: string }
  | { op: "reorder"; dayNumber: number; stopIds: string[] };

export interface PlanEditProposal {
  summary: string;
  operations: PlanEditOperation[];
}

export interface GenerateSummaryParams {
  trip: Trip;
  days: ItineraryDay[];
}

export interface GenerateLegBriefParams {
  trip: Trip;
  leg: TripLeg;
  places: Place[];
  foodPlaces: Place[];
  marketPlaces: Place[];
}

export interface SuggestPlacesParams {
  city: string;
  state?: string;
  country: string;
  interests?: string[];
  travelStyle?: string;
  limit?: number;
}

export interface AiItineraryEligibleDate {
  date: string;
  dailyStartTime: string;
  dailyEndTime: string;
}

export interface GenerateAiItineraryParams {
  trip: Trip;
  leg?: TripLeg;
  places: Place[];
  eligibleDates: AiItineraryEligibleDate[];
  /** The traveller's own wishes for this plan; they take priority. */
  instructions?: string;
}

export interface AiItineraryDayAssignment {
  date: string;
  placeIds: string[];
  dressCode?: string;
}

export interface AiItineraryStopNote extends VisitIntel {
  placeId: string;
}

export interface AiItineraryCandidateResult {
  days: AiItineraryDayAssignment[];
  stopNotes: AiItineraryStopNote[];
  /** Places the instructions tie to a specific date — kept there when the plan is timed. */
  pinnedPlaceIds?: string[];
  /** One or two sentences on how the instructions were applied (or why one couldn't be). */
  instructionNote?: string;
}

export interface AIProvider {
  /** Sketches a trip from one sentence. Null when the model can't produce a usable draft. */
  draftTrip(prompt: string, context: { today: string; interestOptions: string[] }): Promise<AiTripDraft | null>;
  /** Turns a plain-English request ("make day 2 lighter") into concrete plan operations. */
  planEdits(input: PlanEditInput): Promise<PlanEditProposal | null>;
  rankPlaces(params: RankPlacesParams): Promise<Place[]>;
  estimateVisitDuration(place: Place, travelStyle?: string): Promise<number>;
  generateSummary(params: GenerateSummaryParams): Promise<string>;
  generateLegBrief(params: GenerateLegBriefParams): Promise<LegDestinationBrief>;
  /** AI-sourced place-name suggestions to layer on top of Google discovery. No rule-based
   * fallback exists (there's no non-AI signal for "suggest new places") — returns [] without an
   * API key or on any failure, so discovery just falls back to Google results only. */
  suggestPlaces(params: SuggestPlacesParams): Promise<string[]>;
  /** Proposes a complete alternative day-by-day place assignment (which places, which day, what
   * order) plus per-day dress-code suggestions and per-stop visit notes. No rule-based fallback —
   * this is only ever called once an AI key has been confirmed present by the caller; returns
   * an empty result on any failure so a comparison request degrades to "AI itinerary is empty"
   * rather than throwing. The engine (not the AI) is responsible for turning this into real
   * scheduled stops with trustworthy times/distances. */
  generateAiItineraryCandidate(params: GenerateAiItineraryParams): Promise<AiItineraryCandidateResult>;
}
