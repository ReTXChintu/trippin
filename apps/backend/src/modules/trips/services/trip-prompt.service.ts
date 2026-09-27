import { TripRepository } from "@/repositories/trip.repository";
import { parseTripPrompt } from "@/services/nlp-trip-parser.service";
import { getAIProvider } from "@/lib/ai";
import { getUserApiKeys, resolveAiConfig } from "@/lib/services/trip-api-keys.service";
import { INTEREST_CATEGORIES } from "@/constants/interests";
import { defaultCurrencyFor } from "@/utils/currency";
import { createEmptyLeg, newTripLegId, syncTripDatesFromLegs } from "@/modules/trips/utils/trip-leg.utils";
import type { AiTripDraft } from "@/modules/ai/types";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg, TripLegTransfer } from "@/modules/trips/types/trip-leg.types";
import type { ActionResult } from "@/modules/trips/services/trip.service";

/** Trips drafted without a date start two weeks out — far enough to plan, close enough to feel real. */
const DEFAULT_LEAD_DAYS = 14;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

interface DraftCity {
  city: string;
  state?: string;
  country: string;
  days: number;
}

/** Consecutive legs: each city gets its days, and moving on happens on the first day of the next
 * city (the previous leg ends the day before) — the same convention the trip form uses. */
export function buildLegsFromCities(cities: DraftCity[], startDate: string): { legs: TripLeg[]; transfers: TripLegTransfer[] } {
  const legs: TripLeg[] = [];
  const transfers: TripLegTransfer[] = [];
  let cursor = startDate;

  cities.forEach((c, order) => {
    const leg: TripLeg = {
      ...createEmptyLeg(order, c.country),
      name: c.city,
      baseCity: c.city,
      state: c.state,
      startDate: cursor,
      endDate: addDays(cursor, Math.max(c.days, 1) - 1),
    };
    const prev = legs[legs.length - 1];
    if (prev) {
      transfers.push({
        id: newTripLegId(),
        date: leg.startDate,
        fromLegId: prev.id,
        toLegId: leg.id,
        label: `Travel from ${prev.baseCity} to ${leg.baseCity}`,
      });
    }
    legs.push(leg);
    cursor = addDays(leg.endDate, 1);
  });

  return { legs, transfers };
}

function pickStartDate(requested: string | undefined, today: string): string {
  if (requested && requested >= today) return requested;
  return addDays(today, DEFAULT_LEAD_DAYS);
}

async function draftWithAi(userId: string, prompt: string, today: string): Promise<AiTripDraft | null> {
  const config = resolveAiConfig(await getUserApiKeys(userId));
  if (!config) return null;
  try {
    return await getAIProvider(config).draftTrip(prompt, { today, interestOptions: [...INTEREST_CATEGORIES] });
  } catch (err) {
    console.warn("[trip-prompt] AI draft failed, using the rule-based parser:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Creates a draft trip from one sentence. With an AI key this understands any destination, several
 * cities and dates ("10 days in Japan in April — Tokyo, Kyoto, Osaka"); without one it falls back
 * to the built-in keyword parser. */
export async function createTripFromPrompt(
  userId: string,
  prompt: string,
): Promise<ActionResult<{ trip: Trip; confidence: number; usedAi: boolean }>> {
  const today = isoDate(new Date());
  const source = `Generated from: "${prompt.slice(0, 200)}"`;

  const ai = await draftWithAi(userId, prompt, today);
  if (ai) {
    const cities = ai.cities.map((c) => ({ ...c, country: c.country || ai.cities.find((x) => x.country)?.country || "" }));
    const { legs, transfers } = buildLegsFromCities(cities, pickStartDate(ai.startDate, today));
    const synced = syncTripDatesFromLegs(legs, transfers)!;
    const country = legs[0].country;

    const trip = await TripRepository.create({
      userId,
      title: ai.title,
      destinationCity: synced.destinationCity,
      destinationState: legs[0].state,
      destinationCountry: country,
      startDate: new Date(synced.startDate),
      endDate: new Date(synced.endDate),
      legs,
      transfers,
      travelStyle: ai.travelStyle ?? "Balanced",
      transportationMode: ai.transportationMode ?? "Cab",
      budgetLevel: ai.budgetLevel,
      currency: defaultCurrencyFor(country),
      interests: ai.interests,
      notes: [ai.notes, source].filter(Boolean).join("\n"),
      status: "draft",
    });
    return { success: true, data: { trip, confidence: 0.9, usedAi: true }, message: "Trip draft created" };
  }

  const { draft, confidence, companions } = parseTripPrompt(prompt);
  if (!draft.destinationCity) {
    return {
      success: false,
      error: "Couldn't work out where you're going. Name a city (e.g. \"4 days in Lisbon\") — or add an OpenAI or Gemini key in Profile so AI can read any request.",
    };
  }

  // The keyword parser can't read dates, only a length ("3 days").
  const start = pickStartDate(undefined, today);
  const days = Math.min(Math.max(draft.durationDays ?? 3, 1), 30);
  const country = draft.destinationCountry ?? "";
  const { legs, transfers } = buildLegsFromCities(
    [{ city: draft.destinationCity, state: draft.destinationState, country, days }],
    start,
  );
  const notes = [companions.length > 0 ? `Traveling with: ${companions.join(", ")}` : null, source].filter(Boolean).join("\n");

  const trip = await TripRepository.create({
    userId,
    title: draft.title ?? `${draft.destinationCity} Trip`,
    destinationCity: draft.destinationCity,
    destinationState: draft.destinationState,
    destinationCountry: country,
    startDate: new Date(legs[0].startDate),
    endDate: new Date(legs[0].endDate),
    legs,
    transfers,
    travelStyle: draft.travelStyle ?? "Balanced",
    interests: draft.interests ?? [],
    currency: defaultCurrencyFor(country),
    notes,
    status: "draft",
    transportationMode: companions.includes("parents") ? "Cab" : "Walking",
  });

  return {
    success: true,
    data: { trip, confidence, usedAi: false },
    message: `Trip draft created (${Math.round(confidence * 100)}% confidence)`,
  };
}
