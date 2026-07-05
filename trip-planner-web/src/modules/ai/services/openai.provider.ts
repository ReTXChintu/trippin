import type { Place, RankPlacesParams } from "@/modules/places/types/place.types";
import type {
  AIProvider,
  GenerateLegBriefParams,
  GenerateSummaryParams,
  GenerateVisitIntelParams,
  OptimizeItineraryParams,
  ParsedPromptResult,
} from "../types/ai-provider.types";
import {
  buildRuleBasedLegBrief,
  enrichStopsWithRuleBasedIntel,
} from "@/modules/itinerary/services/itinerary-enrichment.service";
import type { LegDestinationBrief } from "@/modules/trips/types/trip-enrichment.types";
import type { VisitIntel } from "@/modules/itinerary/types/visit-intel.types";
import {
  estimateVisitDuration as ruleBasedDuration,
  rankPlacesRuleBased,
} from "./place-ranking.service";
import { generateRuleBasedSummary } from "@/modules/itinerary/services/itinerary-summary.service";
import {
  applyOptimizedDayOrder,
  optimizeItineraryRuleBased,
  validateOptimizedOrder,
} from "@/modules/itinerary/services/itinerary-optimization.service";

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

  async optimizeItinerary(params: OptimizeItineraryParams) {
    if (!this.apiKey) {
      return optimizeItineraryRuleBased(params.trip, params.days);
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
                'Reorder stops within each day to minimize travel time and improve flow. Return JSON: { "days": [{ "dayNumber": 1, "stopIds": ["id1", "id2"] }] }. Include every stop ID exactly once across all days. Do not add or remove stops.',
            },
            {
              role: "user",
              content: JSON.stringify({
                destination: params.trip.destinationCity,
                travelStyle: params.trip.travelStyle,
                transportationMode: params.trip.transportationMode,
                hotel: params.trip.hotelName,
                days: params.days.map((d) => ({
                  dayNumber: d.dayNumber,
                  date: d.date,
                  stops: d.stops.map((s) => ({
                    id: s.id,
                    name: s.placeName,
                    category: s.category,
                    arrivalTime: s.arrivalTime,
                    coordinates: s.coordinates,
                  })),
                })),
              }),
            },
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        return optimizeItineraryRuleBased(params.trip, params.days);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) return optimizeItineraryRuleBased(params.trip, params.days);

      const parsed = JSON.parse(content) as {
        days?: { dayNumber: number; stopIds: string[] }[];
      };

      if (!parsed.days || !validateOptimizedOrder(params.days, parsed.days)) {
        return optimizeItineraryRuleBased(params.trip, params.days);
      }

      return applyOptimizedDayOrder(params.trip, params.days, parsed.days);
    } catch {
      return optimizeItineraryRuleBased(params.trip, params.days);
    }
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
                'Return JSON for a travel leg guide: { "specialties": string[], "localFood": string[], "markets": [{ "placeId": string?, "name": string, "whatToBuy": string[] }], "generalTips": string[] }. Use only real place names from input. specialties = what the region is known for. localFood = dishes to try. markets = shopping areas with what to buy.',
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
        generalTips: parsed.generalTips ?? fallback.generalTips,
        generatedAt: new Date().toISOString(),
      };
    } catch {
      return fallback;
    }
  }

  async generateVisitIntel(params: GenerateVisitIntelParams): Promise<Map<string, VisitIntel>> {
    const ruleBasedDays = enrichStopsWithRuleBasedIntel(params.days, params.placeMap);
    const intelMap = new Map<string, VisitIntel>();
    for (const day of ruleBasedDays) {
      for (const stop of day.stops) {
        if (stop.visitIntel) intelMap.set(stop.id, stop.visitIntel);
      }
    }

    if (!this.apiKey) return intelMap;

    const stopsPayload = params.days.flatMap((day) =>
      day.stops
        .filter((s) => s.stopType !== "transfer")
        .map((s) => ({
          stopId: s.id,
          placeId: s.placeId,
          name: s.placeName,
          category: s.category,
          stopType: s.stopType,
          dayNumber: day.dayNumber,
          arrivalTime: s.arrivalTime,
          rating: params.placeMap.get(s.placeId)?.rating,
          userRatingCount: params.placeMap.get(s.placeId)?.userRatingCount,
        })),
    );

    if (stopsPayload.length === 0) return intelMap;

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
                'Return JSON: { "stops": [{ "stopId": string, "bestTime": string, "avoidTime": string?, "hypeLevel": "overhyped"|"worth-it"|"hidden-gem", "why": string, "tips": string[]? }] }. Give practical visit timing, crowd warnings, and hype assessment for each stop. Only use stopIds from input.',
            },
            {
              role: "user",
              content: JSON.stringify({
                destination: params.trip.destinationCity,
                travelStyle: params.trip.travelStyle,
                notes: params.trip.notes,
                stops: stopsPayload,
              }),
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) return intelMap;

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) return intelMap;

      const parsed = JSON.parse(content) as {
        stops?: Array<VisitIntel & { stopId: string }>;
      };

      for (const item of parsed.stops ?? []) {
        if (!item.stopId) continue;
        intelMap.set(item.stopId, {
          bestTime: item.bestTime,
          avoidTime: item.avoidTime,
          hypeLevel: item.hypeLevel,
          why: item.why,
          tips: item.tips,
        });
      }

      return intelMap;
    } catch {
      return intelMap;
    }
  }
}
