/** City search for the trip form — Open-Meteo's free geocoder, so it works without any API key. */

const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const MAX_RESULTS = 6;

export interface CityMatch {
  name: string;
  state?: string;
  country: string;
  countryCode?: string;
  lat: number;
  lng: number;
}

interface GeocodingResult {
  name: string;
  admin1?: string;
  country?: string;
  country_code?: string;
  latitude: number;
  longitude: number;
  feature_code?: string;
  population?: number;
}

const cache = new Map<string, { at: number; cities: CityMatch[] }>();

export async function searchCities(query: string): Promise<CityMatch[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.cities;

  const params = new URLSearchParams({ name: q, count: "10", language: "en", format: "json" });
  const response = await fetch(`${GEOCODING_API}?${params.toString()}`);
  if (!response.ok) throw new Error("City search is unavailable right now");
  const data = (await response.json()) as { results?: GeocodingResult[] };

  const seen = new Set<string>();
  const cities = (data.results ?? [])
    // Populated places only (PPL, PPLA, PPLC…) — skips rivers, airports and the like.
    .filter((r) => r.country && (r.feature_code ?? "PPL").startsWith("PPL"))
    .map((r) => ({
      name: r.name,
      state: r.admin1 && r.admin1 !== r.name ? r.admin1 : undefined,
      country: r.country!,
      countryCode: r.country_code,
      lat: r.latitude,
      lng: r.longitude,
    }))
    .filter((c) => {
      const id = `${c.name}|${c.state ?? ""}|${c.country}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, MAX_RESULTS);

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), cities });
  return cities;
}
