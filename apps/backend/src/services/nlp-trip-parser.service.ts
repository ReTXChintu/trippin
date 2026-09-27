import { addDays, format } from "date-fns";
import type { TravelStyle } from "@/types";
import type { TripDraft } from "@/modules/trips/types/trip.types";
import {
  COMPANION_KEYWORDS,
  DURATION_PATTERNS,
  HOTEL_AREA_PATTERNS,
  INTEREST_KEYWORDS,
  KNOWN_CITIES,
  TRAVEL_STYLE_KEYWORDS,
  DEFAULT_COUNTRY,
  DEFAULT_STATE,
} from "@/constants/nlp";

export interface ParsedTripPrompt {
  draft: TripDraft;
  companions: string[];
  confidence: number;
  rawExtractions: Record<string, string | number | string[] | undefined>;
}

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function extractCity(text: string): {
  city?: string;
  state?: string;
  country?: string;
} {
  const normalized = normalize(text);

  for (const city of KNOWN_CITIES) {
    if (normalized.includes(city.name.toLowerCase())) {
      return { city: city.name, state: city.state, country: city.country };
    }
  }

  const inCityMatch = normalized.match(
    /(?:in|to|visit|explore|trip to)\s+([a-z\s]+?)(?:\s+for|\s+with|,|\.|$)/i,
  );
  if (inCityMatch?.[1]) {
    const candidate = inCityMatch[1].trim();
    const known = KNOWN_CITIES.find((c) =>
      candidate.includes(c.name.toLowerCase()),
    );
    if (known) {
      return { city: known.name, state: known.state, country: known.country };
    }
    const capitalized = candidate
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return { city: capitalized, state: DEFAULT_STATE, country: DEFAULT_COUNTRY };
  }

  return {};
}

function extractDuration(text: string): number | undefined {
  for (const pattern of DURATION_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const days = parseInt(match[1], 10);
      if (days > 0 && days <= 30) return days;
    }
  }
  return undefined;
}

function extractInterests(text: string): string[] {
  const normalized = normalize(text);
  const found = new Set<string>();

  for (const [category, keywords] of Object.entries(INTEREST_KEYWORDS)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      found.add(category);
    }
  }

  const likeMatch = normalized.match(/(?:like|love|enjoy|interested in)\s+([^.!,]+)/i);
  if (likeMatch?.[1]) {
    const segment = likeMatch[1];
    for (const [category, keywords] of Object.entries(INTEREST_KEYWORDS)) {
      if (keywords.some((kw) => segment.includes(kw))) {
        found.add(category);
      }
    }
  }

  return Array.from(found);
}

function extractTravelStyle(text: string): TravelStyle | undefined {
  const normalized = normalize(text);

  for (const [style, keywords] of Object.entries(TRAVEL_STYLE_KEYWORDS)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      return style as TravelStyle;
    }
  }

  return undefined;
}

function extractCompanions(text: string): string[] {
  const normalized = normalize(text);
  const found: string[] = [];

  for (const [companion, keywords] of Object.entries(COMPANION_KEYWORDS)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      found.push(companion);
    }
  }

  return found;
}

function extractHotelArea(text: string): string | undefined {
  for (const pattern of HOTEL_AREA_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/\s+for\s+\d+\s+days?/i, "").trim();
    }
  }
  return undefined;
}

function buildTitle(city?: string, durationDays?: number): string {
  if (city && durationDays) {
    return `${durationDays}-Day ${city} Trip`;
  }
  if (city) return `${city} Trip`;
  return "New Trip";
}

function computeConfidence(extractions: ParsedTripPrompt["rawExtractions"]): number {
  let score = 0;
  if (extractions.destinationCity) score += 0.35;
  if (extractions.durationDays) score += 0.25;
  if (Array.isArray(extractions.interests) && extractions.interests.length > 0) score += 0.2;
  if (extractions.travelStyle) score += 0.1;
  if (extractions.hotelArea) score += 0.1;
  return Math.min(score, 1);
}

export function parseTripPrompt(prompt: string): ParsedTripPrompt {
  const trimmed = prompt.trim();
  const { city, state, country } = extractCity(trimmed);
  const durationDays = extractDuration(trimmed);
  const interests = extractInterests(trimmed);
  const travelStyle = extractTravelStyle(trimmed);
  const companions = extractCompanions(trimmed);
  const hotelArea = extractHotelArea(trimmed);

  const today = new Date();
  const startDate = format(today, "yyyy-MM-dd");
  const endDate = durationDays
    ? format(addDays(today, durationDays - 1), "yyyy-MM-dd")
    : format(addDays(today, 1), "yyyy-MM-dd");

  const rawExtractions: ParsedTripPrompt["rawExtractions"] = {
    destinationCity: city,
    destinationState: state,
    destinationCountry: country,
    durationDays,
    interests,
    travelStyle,
    hotelArea,
    companions,
  };

  const draft: TripDraft = {
    title: buildTitle(city, durationDays),
    destinationCity: city,
    destinationState: state,
    destinationCountry: country ?? DEFAULT_COUNTRY,
    startDate,
    endDate,
    hotelName: hotelArea,
    hotelAddress: hotelArea,
    travelStyle: travelStyle ?? (companions.includes("parents") ? "Relaxed" : "Balanced"),
    interests,
    durationDays: durationDays ?? 2,
  };

  return {
    draft,
    companions,
    confidence: computeConfidence(rawExtractions),
    rawExtractions,
  };
}
