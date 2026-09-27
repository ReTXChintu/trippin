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
}

export interface AIProvider {
  parseTripPrompt(prompt: string): Promise<ParsedPromptResult>;
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
