import type { Place, RankPlacesParams } from "@/modules/places/types/place.types";
import type {
  AIProvider,
  AiConfig,
  AiItineraryCandidateResult,
  GenerateAiItineraryParams,
  GenerateLegBriefParams,
  GenerateSummaryParams,
  AiTripDraft,
  PlanEditInput,
  PlanEditOperation,
  PlanEditProposal,
  SuggestPlacesParams,
} from "../types/ai-provider.types";
import { buildRuleBasedLegBrief } from "@/modules/itinerary/services/itinerary-enrichment.service";
import type { LegDestinationBrief } from "@/modules/trips/types/trip-enrichment.types";
import {
  estimateVisitDuration as ruleBasedDuration,
  rankPlacesRuleBased,
} from "./place-ranking.service";
import { generateRuleBasedSummary } from "@/modules/itinerary/services/itinerary-summary.service";
import { createLlmClient, parseJsonAnswer, type LlmClient } from "./llm-client";

/** The app's AI features, provider-agnostic: prompts live here, the OpenAI/Gemini transport lives in
 * llm-client. Every method degrades to a rule-based (or empty) result when the model call fails. */
export class LlmAIProvider implements AIProvider {
  private readonly client: LlmClient;

  constructor(config: AiConfig) {
    if (!config.apiKey?.trim()) throw new Error("An AI API key is required.");
    this.client = createLlmClient({ ...config, apiKey: config.apiKey.trim() });
  }

  async draftTrip(prompt: string, context: { today: string; interestOptions: string[] }): Promise<AiTripDraft | null> {
    const parsed = parseJsonAnswer<Partial<AiTripDraft>>(
      await this.client.complete({
        json: true,
        temperature: 0.3,
        system:
          'Turn a traveller\'s one-line request into a trip outline. Return JSON: { "title": string, "startDate": "YYYY-MM-DD" | null, ' +
          '"cities": [{ "city": string, "state": string | null, "country": string, "days": number }], "interests": string[], ' +
          '"travelStyle": "Relaxed" | "Balanced" | "Fast Paced" | null, "transportationMode": "Walking" | "Cab" | "Self Drive" | "Bike" | "Public Transport" | null, ' +
          '"budgetLevel": "budget" | "moderate" | "luxury" | null, "notes": string | null }. ' +
          "cities: the base cities in visiting order (real city names with their country); days = full days to spend there, summing to the trip length. " +
          "If the request names a region or country but no cities, choose 1–3 sensible base cities. " +
          `startDate: only if the request gives a date or month (resolve relative to today, ${context.today}; a month alone means the first weekend of that month in the future); otherwise null. ` +
          `interests: pick only from ${JSON.stringify(context.interestOptions)}. ` +
          "notes: who is travelling and any needs (kids, elderly parents, wheelchair…), else null. title: short and friendly, e.g. \"Kyoto & Osaka in spring\".",
        user: prompt,
      }),
    );
    if (!parsed?.cities?.length) return null;

    const cities = parsed.cities
      .filter((c) => c && typeof c.city === "string" && c.city.trim())
      .map((c) => ({
        city: c.city.trim(),
        state: c.state?.trim() || undefined,
        country: (c.country ?? "").trim(),
        days: Math.min(Math.max(Math.round(Number(c.days) || 1), 1), 30),
      }))
      .slice(0, 8);
    if (cities.length === 0) return null;

    const allowed = new Set(context.interestOptions);
    return {
      title: (parsed.title ?? "").trim() || `${cities.map((c) => c.city).join(" & ")} trip`,
      startDate: typeof parsed.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.startDate) ? parsed.startDate : undefined,
      cities,
      interests: (parsed.interests ?? []).filter((i): i is string => typeof i === "string" && allowed.has(i)),
      travelStyle: parsed.travelStyle ?? undefined,
      transportationMode: parsed.transportationMode ?? undefined,
      budgetLevel: parsed.budgetLevel ?? undefined,
      notes: parsed.notes?.trim() || undefined,
    };
  }

  async planEdits(input: PlanEditInput): Promise<PlanEditProposal | null> {
    const parsed = parseJsonAnswer<{ summary?: string; operations?: unknown[] }>(
      await this.client.complete({
        json: true,
        temperature: 0.2,
        system:
          "You adjust a traveller's day-by-day itinerary. Return JSON: { \"summary\": string, \"operations\": Operation[] } where Operation is one of " +
          '{ "op": "move", "stopId": string, "toDayNumber": number } | { "op": "remove", "stopId": string } | ' +
          '{ "op": "add", "placeId": string, "dayNumber": number } | { "op": "setDuration", "stopId": string, "minutes": number } | ' +
          '{ "op": "lock", "stopId": string } | { "op": "reorder", "dayNumber": number, "stopIds": string[] }. ' +
          "Only use stop ids and place ids from the input — never invent any. Don't touch stops of type transfer or return. " +
          "Make the smallest set of changes that does what was asked. A 'lighter' day means fewer or shorter visits (move extras to a lighter day rather than deleting unless asked). " +
          "reorder must list every stop id of that day in the new order. Times are recalculated automatically — don't try to set clock times. " +
          "summary: one or two plain sentences telling the traveller what you changed (or why you couldn't).",
        user: JSON.stringify(input),
      }),
    );
    if (!parsed) return null;

    const ops: PlanEditOperation[] = [];
    for (const raw of parsed.operations ?? []) {
      const o = raw as Record<string, unknown>;
      if (o.op === "move" && typeof o.stopId === "string" && Number.isInteger(o.toDayNumber)) ops.push({ op: "move", stopId: o.stopId, toDayNumber: o.toDayNumber as number });
      else if (o.op === "remove" && typeof o.stopId === "string") ops.push({ op: "remove", stopId: o.stopId });
      else if (o.op === "add" && typeof o.placeId === "string" && Number.isInteger(o.dayNumber)) ops.push({ op: "add", placeId: o.placeId, dayNumber: o.dayNumber as number });
      else if (o.op === "setDuration" && typeof o.stopId === "string" && typeof o.minutes === "number") ops.push({ op: "setDuration", stopId: o.stopId, minutes: o.minutes });
      else if (o.op === "lock" && typeof o.stopId === "string") ops.push({ op: "lock", stopId: o.stopId });
      else if (o.op === "reorder" && Number.isInteger(o.dayNumber) && Array.isArray(o.stopIds)) {
        ops.push({ op: "reorder", dayNumber: o.dayNumber as number, stopIds: (o.stopIds as unknown[]).filter((x): x is string => typeof x === "string") });
      }
    }
    return { summary: (parsed.summary ?? "").trim() || "Done.", operations: ops.slice(0, 30) };
  }

  async rankPlaces(params: RankPlacesParams): Promise<Place[]> {
    const answer = parseJsonAnswer<{ orderedIds?: string[] }>(
      await this.client.complete({
        json: true,
        temperature: 0.2,
        system:
          'You rank travel attractions for an itinerary. Return JSON: { "orderedIds": ["googlePlaceId", ...] }. Only include IDs from the input list. Respect excluded places and prioritize must-visit and interests.',
        user: JSON.stringify({
          interests: params.interests,
          travelStyle: params.travelStyle,
          mustVisit: params.mustVisitPlaces,
          excluded: params.excludedPlaces,
          limit: params.limit ?? 20,
          places: params.places.map((p) => ({ id: p.googlePlaceId, name: p.name, category: p.category, rating: p.rating })),
        }),
      }),
    );
    if (!answer) return rankPlacesRuleBased(params);

    const idOrder = answer.orderedIds ?? [];
    const placeMap = new Map(params.places.map((p) => [p.googlePlaceId, p]));
    const ranked = idOrder.map((id) => placeMap.get(id)).filter((p): p is Place => p !== undefined);
    const remaining = params.places.filter((p) => p.googlePlaceId && !idOrder.includes(p.googlePlaceId));
    return [...ranked, ...remaining].slice(0, params.limit ?? 20);
  }

  async estimateVisitDuration(place: Place, travelStyle?: string): Promise<number> {
    return ruleBasedDuration(place, travelStyle);
  }

  async generateSummary(params: GenerateSummaryParams): Promise<string> {
    const text = await this.client.complete({
      temperature: 0.6,
      maxTokens: 600,
      system:
        "Write a friendly, concise travel itinerary summary (2-4 paragraphs). Highlight the trip vibe, key attractions per day, and practical tips. Use plain text, no markdown headers.",
      user: JSON.stringify({
        title: params.trip.title,
        destination: [params.trip.destinationCity, params.trip.destinationState, params.trip.destinationCountry]
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
          stops: d.stops.map((s) => ({ name: s.placeName, time: `${s.arrivalTime}-${s.departureTime}`, category: s.category })),
        })),
      }),
    });
    return text || generateRuleBasedSummary(params.trip, params.days);
  }

  async generateLegBrief(params: GenerateLegBriefParams): Promise<LegDestinationBrief> {
    const fallback = buildRuleBasedLegBrief(params.leg, params.places, params.foodPlaces, params.marketPlaces);

    const parsed = parseJsonAnswer<Partial<LegDestinationBrief>>(
      await this.client.complete({
        json: true,
        temperature: 0.4,
        system:
          'Return JSON for a travel leg guide: { "specialties": string[], "localFood": string[], "markets": [{ "placeId": string?, "name": string, "whatToBuy": string[] }], "festivals": string[], "generalTips": string[] }. Use only real place names from input. specialties = what the region is known for. localFood = dishes to try. markets = shopping areas with what to buy. festivals = well-known local festivals/events worth timing a visit around — only include ones you are confident actually exist for this destination, otherwise return an empty array.',
        user: JSON.stringify({
          leg: params.leg.name || params.leg.baseCity,
          baseCity: params.leg.baseCity,
          dayTripAreas: params.leg.dayTripAreas,
          country: params.leg.country,
          interests: params.trip.interests,
          sights: params.places.slice(0, 15).map((p) => ({ id: p.googlePlaceId, name: p.name, category: p.category })),
          foodPlaces: params.foodPlaces.slice(0, 8).map((p) => p.name),
          marketPlaces: params.marketPlaces.slice(0, 6).map((p) => ({ id: p.googlePlaceId, name: p.name })),
        }),
      }),
    );
    if (!parsed) return fallback;

    return {
      specialties: parsed.specialties ?? fallback.specialties,
      localFood: parsed.localFood ?? fallback.localFood,
      markets: parsed.markets?.length ? parsed.markets : fallback.markets,
      festivals: parsed.festivals ?? fallback.festivals,
      generalTips: parsed.generalTips ?? fallback.generalTips,
      generatedAt: new Date().toISOString(),
    };
  }

  async suggestPlaces(params: SuggestPlacesParams): Promise<string[]> {
    const parsed = parseJsonAnswer<{ places?: unknown[] }>(
      await this.client.complete({
        json: true,
        temperature: 0.4,
        system:
          'Suggest real, verifiable places worth visiting for a trip. Return JSON: { "places": string[] }. Each entry is just the place name (no descriptions), as it would appear on Google Maps. Only suggest places that genuinely exist — never invent names.',
        user: JSON.stringify({
          city: params.city,
          state: params.state,
          country: params.country,
          interests: params.interests,
          travelStyle: params.travelStyle,
          limit: params.limit ?? 15,
        }),
      }),
    );
    return (parsed?.places ?? []).filter((name): name is string => typeof name === "string" && name.trim().length > 0);
  }

  async generateAiItineraryCandidate(params: GenerateAiItineraryParams): Promise<AiItineraryCandidateResult> {
    const parsed = parseJsonAnswer<Partial<AiItineraryCandidateResult>>(
      await this.client.complete({
        json: true,
        temperature: 0.5,
        system:
          'Design an alternative day-by-day sightseeing plan. Return JSON: { "days": [{ "date": "YYYY-MM-DD", "placeIds": ["id1","id2"], "dressCode": string }], "stopNotes": [{ "placeId": "id1", "bestTime": string?, "avoidTime": string?, "hypeLevel": "overhyped"|"worth-it"|"hidden-gem"?, "why": string?, "tips": string[]?, "entryFee": string? }] }. ' +
          "Only use placeIds from the input list — never invent places. Assign each place to exactly one date; it's fine to leave out places that don't fit well. Group nearby places on the same date and order placeIds within a day in a sensible visiting sequence starting near the stay, minimizing backtracking. Each date has limited daily hours (given) — favor fewer well-paced stops over overpacking a day. dressCode is a 1-2 sentence practical outfit suggestion for that day's activities/season/destination, geared toward good photos. stopNotes give practical best-time-to-visit, crowd-avoidance, and hype-level guidance per place; entryFee is the typical adult entry fee in local currency, short (e.g. \"Free\", \"₹50 Indians / ₹600 foreigners\", \"Free; special darshan ₹250\") — omit it if you don't know. " +
          "Places of a day trip (input dayTrips: a town visited from the base and back the same day) go together on ONE date — the given date when there is one — and never mixed with base-city places. If the input has \"instructions\" (the traveller's own words), follow them first — they override every guideline above except: only given placeIds, only given dates. \"Day 1\" means the first date in the list, and so on; match place names loosely. Also return \"pinnedPlaceIds\": the placeIds the instructions explicitly tie to a particular date (empty if none), and \"instructionNote\": one or two plain sentences telling the traveller how you applied the instructions, mentioning anything you couldn't do and why (e.g. a place that isn't in their list). Without instructions return pinnedPlaceIds: [] and instructionNote: null.",
        user: JSON.stringify({
          destination: params.leg?.baseCity ?? params.trip.destinationCity,
          country: params.leg?.country ?? params.trip.destinationCountry,
          interests: params.trip.interests,
          travelStyle: params.trip.travelStyle,
          mustVisitPlaces: params.trip.mustVisitPlaces,
          excludedPlaces: params.trip.excludedPlaces,
          dates: params.eligibleDates.map((d, i) => ({ ...d, dayNumber: i + 1 })),
          instructions: params.instructions || undefined,
          // Day trips from the base: their places belong together on one day (fixed dates must be kept).
          dayTrips: (params.leg ? [params.leg] : params.trip.legs).flatMap((l) =>
            (l.dayTrips ?? []).map((d) => ({ from: l.baseCity, town: d.name, date: d.date ?? null })),
          ),
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
      }),
    );
    const known = new Set(params.places.map((p) => p.googlePlaceId).filter(Boolean));
    return {
      days: parsed?.days ?? [],
      stopNotes: parsed?.stopNotes ?? [],
      pinnedPlaceIds: (parsed?.pinnedPlaceIds ?? []).filter((id): id is string => typeof id === "string" && known.has(id)),
      instructionNote: typeof parsed?.instructionNote === "string" && parsed.instructionNote.trim() ? parsed.instructionNote.trim() : undefined,
    };
  }
}
