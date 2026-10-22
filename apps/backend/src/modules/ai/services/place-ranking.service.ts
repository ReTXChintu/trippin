import type { Place, RankPlacesParams } from "@/modules/places/types/place.types";

const INTEREST_TAG_MAP: Record<string, string[]> = {
  History: ["historical_landmark", "museum", "monument"],
  Temples: ["hindu_temple", "mosque", "place_of_worship"],
  Food: ["restaurant", "food"],
  Nature: ["park", "natural_feature"],
  Photography: ["tourist_attraction", "point_of_interest"],
  Museums: ["museum"],
  Forts: ["fort", "historical_landmark"],
  Lakes: ["lake"],
  Cafes: ["cafe"],
};

function scorePlace(place: Place, params: RankPlacesParams): number {
  let score = place.rating ?? 3;

  const nameLower = place.name.toLowerCase();
  const tags = [...(place.tags ?? []), place.category, place.subCategory ?? ""];

  for (const must of params.mustVisitPlaces ?? []) {
    if (nameLower.includes(must.toLowerCase())) score += 10;
  }

  for (const excluded of params.excludedPlaces ?? []) {
    if (nameLower.includes(excluded.toLowerCase())) score -= 100;
  }

  for (const interest of params.interests ?? []) {
    const keywords = INTEREST_TAG_MAP[interest] ?? [interest.toLowerCase()];
    if (
      tags.some((t) => keywords.some((k) => t.toLowerCase().includes(k))) ||
      place.category === interest
    ) {
      score += 3;
    }
  }

  if (params.travelStyle === "Relaxed" && (place.averageVisitDurationMinutes ?? 90) > 120) {
    score -= 1;
  }
  if (params.travelStyle === "Fast Paced" && (place.averageVisitDurationMinutes ?? 90) <= 60) {
    score += 1;
  }

  return score;
}

export function rankPlacesRuleBased(params: RankPlacesParams): Place[] {
  const excluded = new Set(
    (params.excludedPlaces ?? []).map((e) => e.toLowerCase()),
  );

  return [...params.places]
    .filter((p) => !excluded.has(p.name.toLowerCase()))
    .map((p) => ({ place: p, score: scorePlace(p, params) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, params.limit ?? 20)
    .map(({ place }) => place);
}

export function estimateVisitDuration(place: Place, travelStyle?: string): number {
  if (place.category === "Food" || place.category === "Cafes") return 60;
  if (place.category === "Shopping") return 90;

  const base = place.averageVisitDurationMinutes ?? 90;
  if (travelStyle === "Relaxed") return Math.min(base + 30, 180);
  if (travelStyle === "Fast Paced") return Math.max(base - 30, 45);
  return base;
}
