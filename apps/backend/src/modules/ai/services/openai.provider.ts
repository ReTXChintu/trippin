import type { Place, RankPlacesParams } from "@/modules/places/types/place.types";
import type {
  AIProvider,
  AiItineraryCandidateResult,
  GenerateAiItineraryParams,
  GenerateLegBriefParams,
  GenerateSummaryParams,
  ParsedPromptResult,
  SuggestPlacesParams,
} from "../types/ai-provider.types";
import { buildRuleBasedLegBrief } from "@/modules/itinerary/services/itinerary-enrichment.service";
import type { LegDestinationBrief } from "@/modules/trips/types/trip-enrichment.types";
import {
  estimateVisitDuration as ruleBasedDuration,
  rankPlacesRuleBased,
} from "./place-ranking.service";
import { generateRuleBasedSummary } from "@/modules/itinerary/services/itinerary-summary.service";

export class OpenAIProvider implements AIProvider {
  private apiKey?: string;

  constructor(apiKey: string) {
    const key = apiKey?.trim();
    if (!key) {
      throw new Error("OpenAI API key is required.");
    }
    this.apiKey = key;
  }

  private assertConfigured(): void {
    if (!this.apiKey) {
      throw new Error("OpenAI API key is required.");
    }
  }

  async parseTripPrompt(prompt: string): Promise<ParsedPromptResult> {
    void prompt;
    this.assertConfigured();
    throw new Error("OpenAI parseTripPrompt not yet implemented. Use rule-based NLP parser.");
  }

  async rankPlaces(params: RankPlacesParams): Promise<Place[]> {
    if (!this.apiKey) {
      return rankPlacesRuleBased(params);
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You rank travel attractions for an itinerary. Return JSON: { \"orderedIds\": [\"googlePlaceId\", ...] }. Only include IDs from the input list. Respect excluded places and prioritize must-visit and interests.",
            },
            {
              role: "user",
              content: JSON.stringify({
                interests: params.interests,
                travelStyle: params.travelStyle,
                mustVisit: params.mustVisitPlaces,
                excluded: params.excludedPlaces,
                limit: params.limit ?? 20,
                places: params.places.map((p) => ({
                  id: p.googlePlaceId,
                  name: p.name,
                  category: p.category,
                  rating: p.rating,
                })),
              }),
            },
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        return rankPlacesRuleBased(params);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) return rankPlacesRuleBased(params);

      const parsed = JSON.parse(content) as { orderedIds?: string[] };
      const idOrder = parsed.orderedIds ?? [];
      const placeMap = new Map(params.places.map((p) => [p.googlePlaceId, p]));

      const ranked = idOrder
        .map((id) => placeMap.get(id))
        .filter((p): p is Place => p !== undefined);

      const remaining = params.places.filter(
        (p) => p.googlePlaceId && !idOrder.includes(p.googlePlaceId),
      );

      return [...ranked, ...remaining].slice(0, params.limit ?? 20);
    } catch {
      return rankPlacesRuleBased(params);
    }
  }

  async estimateVisitDuration(place: Place, travelStyle?: string): Promise<number> {
    return ruleBasedDuration(place, travelStyle);
  }

  async generateSummary(params: GenerateSummaryParams): Promise<string> {
    if (!this.apiKey) {
      return generateRuleBasedSummary(params.trip, params.days);
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Write a friendly, concise travel itinerary summary (2-4 paragraphs). Highlight the trip vibe, key attractions per day, and practical tips. Use plain text, no markdown headers.",
            },
            {
              role: "user",
              content: JSON.stringify({
                title: params.trip.title,
                destination: [
                  params.trip.destinationCity,
                  params.trip.destinationState,
                  params.trip.destinationCountry,
                ]
                  .filter(Boolean)
                  .join(", "),
                dates: `${params.trip.startDate} to ${params.trip.endDate}`,
                travelStyle: params.trip.travelStyle,
                interests: params.trip.interests,
                hotel: params.trip.hotelName,
                notes: params.trip.notes,
                days: params.days.map((d) => ({
                  day: d.dayNumber,
                  date: d.date,
                  stops: d.stops.map((s) => ({
                    name: s.placeName,
                    time: `${s.arrivalTime}-${s.departureTime}`,
                    category: s.category,
                  })),
                })),
              }),
            },
          ],
          temperature: 0.6,
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        return generateRuleBasedSummary(params.trip, params.days);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      return content || generateRuleBasedSummary(params.trip, params.days);
    } catch {
      return generateRuleBasedSummary(params.trip, params.days);
    }
  }

  async generateLegBrief(params: GenerateLegBriefParams): Promise<LegDestinationBrief> {
    const fallback = buildRuleBasedLegBrief(
      params.leg,
      params.places,
      params.foodPlaces,
      params.marketPlaces,
    );

    if (!this.apiKey) return fallback;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'Return JSON for a travel leg guide: { "specialties": string[], "localFood": string[], "markets": [{ "placeId": string?, "name": string, "whatToBuy": string[] }], "festivals": string[], "generalTips": string[] }. Use only real place names from input. specialties = what the region is known for. localFood = dishes to try. markets = shopping areas with what to buy. festivals = well-known local festivals/events worth timing a visit around — only include ones you are confident actually exist for this destination, otherwise return an empty array.',
            },
            {
              role: "user",
              content: JSON.stringify({
                leg: params.leg.name || params.leg.baseCity,
                baseCity: params.leg.baseCity,
                dayTripAreas: params.leg.dayTripAreas,
                country: params.leg.country,
                interests: params.trip.interests,
                sights: params.places.slice(0, 15).map((p) => ({
                  id: p.googlePlaceId,
                  name: p.name,
                  category: p.category,
                })),
                foodPlaces: params.foodPlaces.slice(0, 8).map((p) => p.name),
                marketPlaces: params.marketPlaces.slice(0, 6).map((p) => ({
                  id: p.googlePlaceId,
                  name: p.name,
                })),
              }),
            },
          ],
          temperature: 0.4,
        }),
      });

      if (!response.ok) return fallback;

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) return fallback;

      const parsed = JSON.parse(content) as LegDestinationBrief;
      return {
        specialties: parsed.specialties ?? fallback.specialties,
        localFood: parsed.localFood ?? fallback.localFood,
        markets: parsed.markets?.length ? parsed.markets : fallback.markets,
        festivals: parsed.festivals ?? fallback.festivals,
        generalTips: parsed.generalTips ?? fallback.generalTips,
        generatedAt: new Date().toISOString(),
      };
    } catch {
      return fallback;
    }
  }

  async suggestPlaces(params: SuggestPlacesParams): Promise<string[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'Suggest real, verifiable places worth visiting for a trip. Return JSON: { "places": string[] }. Each entry is just the place name (no descriptions), as it would appear on Google Maps. Only suggest places that genuinely exist — never invent names.',
            },
            {
              role: "user",
              content: JSON.stringify({
                city: params.city,
                state: params.state,
                country: params.country,
                interests: params.interests,
                travelStyle: params.travelStyle,
                limit: params.limit ?? 15,
              }),
            },
          ],
          temperature: 0.4,
        }),
      });

      if (!response.ok) return [];

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) return [];

      const parsed = JSON.parse(content) as { places?: string[] };
      return (parsed.places ?? []).filter((name): name is string => typeof name === "string" && name.trim().length > 0);
    } catch {
      return [];
    }
  }

  async generateAiItineraryCandidate(params: GenerateAiItineraryParams): Promise<AiItineraryCandidateResult> {
    const empty: AiItineraryCandidateResult = { days: [], stopNotes: [] };
    if (!this.apiKey) return empty;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'Design an alternative day-by-day sightseeing plan. Return JSON: { "days": [{ "date": "YYYY-MM-DD", "placeIds": ["id1","id2"], "dressCode": string }], "stopNotes": [{ "placeId": "id1", "bestTime": string?, "avoidTime": string?, "hypeLevel": "overhyped"|"worth-it"|"hidden-gem"?, "why": string?, "tips": string[]? }] }. ' +
                "Only use placeIds from the input list — never invent places. Assign each place to exactly one date; it's fine to leave out places that don't fit well. Group nearby places on the same date and order placeIds within a day in a sensible visiting sequence starting near the stay, minimizing backtracking. Each date has limited daily hours (given) — favor fewer well-paced stops over overpacking a day. dressCode is a 1-2 sentence practical outfit suggestion for that day's activities/season/destination, geared toward good photos. stopNotes give practical best-time-to-visit, crowd-avoidance, and hype-level guidance per place.",
            },
            {
              role: "user",
              content: JSON.stringify({
                destination: params.leg?.baseCity ?? params.trip.destinationCity,
                country: params.leg?.country ?? params.trip.destinationCountry,
                interests: params.trip.interests,
                travelStyle: params.trip.travelStyle,
                mustVisitPlaces: params.trip.mustVisitPlaces,
                excludedPlaces: params.trip.excludedPlaces,
                dates: params.eligibleDates,
                places: params.places
                  .filter((p) => p.googlePlaceId)
                  .map((p) => ({
                    id: p.googlePlaceId,
                    name: p.name,
                    category: p.category,
                    rating: p.rating,
                    userRatingCount: p.userRatingCount,
                    coordinates: p.coordinates,
                  })),
              }),
            },
          ],
          temperature: 0.5,
        }),
      });

      if (!response.ok) return empty;

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) return empty;

      const parsed = JSON.parse(content) as Partial<AiItineraryCandidateResult>;
      return {
        days: parsed.days ?? [],
        stopNotes: parsed.stopNotes ?? [],
      };
    } catch {
      return empty;
    }
  }
}
