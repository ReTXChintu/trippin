import type { ItineraryDay } from "@/modules/itinerary/types";
import type { VisitIntel } from "@/modules/itinerary/types/visit-intel.types";
import type { Place, RankPlacesParams } from "@/modules/places/types/place.types";
import type { LegDestinationBrief } from "@/modules/trips/types/trip-enrichment.types";
import type { TripDraft, Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";

export interface ParsedPromptResult {
  draft: TripDraft;
  companions: string[];
  confidence: number;
}

export interface GenerateSummaryParams {
  trip: Trip;
  days: ItineraryDay[];
}

export interface OptimizeItineraryParams {
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

export interface GenerateVisitIntelParams {
  trip: Trip;
  days: ItineraryDay[];
  placeMap: Map<string, Place>;
}

export interface AIProvider {
  parseTripPrompt(prompt: string): Promise<ParsedPromptResult>;
  rankPlaces(params: RankPlacesParams): Promise<Place[]>;
  estimateVisitDuration(place: Place, travelStyle?: string): Promise<number>;
  optimizeItinerary(params: OptimizeItineraryParams): Promise<ItineraryDay[]>;
  generateSummary(params: GenerateSummaryParams): Promise<string>;
  generateLegBrief(params: GenerateLegBriefParams): Promise<LegDestinationBrief>;
  generateVisitIntel(params: GenerateVisitIntelParams): Promise<Map<string, VisitIntel>>;
}
