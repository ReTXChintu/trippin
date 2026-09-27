import type { Place } from "@/modules/places/types/place.types";

const SIMILARITY_THRESHOLD = 0.5;

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(name: string): Set<string> {
  return new Set(normalize(name).split(" ").filter(Boolean));
}

function tokenSetSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

interface Candidate {
  id: string;
  normalized: string;
  tokens: Set<string>;
}

/**
 * Matches AI-suggested place names against Google-discovered places already fetched for this
 * discovery run — purely in-memory, no extra API calls. Normalize + exact match, then substring
 * containment either direction, then token-set similarity as a fallback for reordered/misspelled
 * names. Pool sizes are small (tens of places, ~15 AI suggestions), so this is cheap.
 */
export function matchAiSuggestionsToPlaces(
  suggestedNames: string[],
  places: Place[],
): { matchedIds: string[]; unmatchedNames: string[] } {
  const candidates: Candidate[] = places
    .filter((p): p is Place & { googlePlaceId: string } => Boolean(p.googlePlaceId && p.name))
    .map((p) => ({
      id: p.googlePlaceId,
      normalized: normalize(p.name),
      tokens: tokenize(p.name),
    }));

  const matchedIds = new Set<string>();
  const unmatchedNames: string[] = [];

  for (const suggested of suggestedNames) {
    const normalizedSuggested = normalize(suggested);
    if (!normalizedSuggested) continue;

    let match = candidates.find((c) => c.normalized === normalizedSuggested);

    if (!match) {
      match = candidates.find(
        (c) =>
          c.normalized.includes(normalizedSuggested) || normalizedSuggested.includes(c.normalized),
      );
    }

    if (!match) {
      const suggestedTokens = tokenize(suggested);
      let bestScore = 0;
      let bestCandidate: Candidate | undefined;
      for (const c of candidates) {
        const score = tokenSetSimilarity(suggestedTokens, c.tokens);
        if (score > bestScore) {
          bestScore = score;
          bestCandidate = c;
        }
      }
      if (bestCandidate && bestScore >= SIMILARITY_THRESHOLD) {
        match = bestCandidate;
      }
    }

    if (match) {
      matchedIds.add(match.id);
    } else {
      unmatchedNames.push(suggested);
    }
  }

  return { matchedIds: Array.from(matchedIds), unmatchedNames };
}
