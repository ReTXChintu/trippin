import type { Place, PlaceDetail, PlaceSearchResult } from "@/modules/places/types/place.types";
import { HOTEL_TYPES } from "@/constants/google-places";

interface GoogleDisplayName {
  text?: string;
  languageCode?: string;
}

interface GoogleLocation {
  latitude?: number;
  longitude?: number;
}

interface GoogleOpeningHours {
  weekdayDescriptions?: string[];
}

interface GooglePlaceRaw {
  id?: string;
  name?: string;
  displayName?: GoogleDisplayName;
  formattedAddress?: string;
  location?: GoogleLocation;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  primaryType?: string;
  regularOpeningHours?: GoogleOpeningHours;
  editorialSummary?: { text?: string };
  photos?: { name?: string }[];
  priceLevel?: string;
  priceRange?: { startPrice?: { units?: string }; endPrice?: { units?: string } };
  websiteUri?: string;
  googleMapsUri?: string;
}

export function normalizePlaceId(id: string): string {
  return id.startsWith("places/") ? id.replace("places/", "") : id;
}

export function toPlaceIdPath(id: string): string {
  const normalized = normalizePlaceId(id);
  return `places/${normalized}`;
}

function mapTypeToCategory(types: string[] = [], primaryType?: string): string {
  const type = primaryType ?? types[0] ?? "attraction";
  const categoryMap: Record<string, string> = {
    hindu_temple: "Temples",
    mosque: "Spiritual",
    church: "Spiritual",
    museum: "Museums",
    park: "Nature",
    restaurant: "Food",
    cafe: "Cafes",
    shopping_mall: "Shopping",
    tourist_attraction: "Culture",
    historical_landmark: "History",
    lodging: "Hotel",
    hotel: "Hotel",
    fort: "Forts",
    lake: "Lakes",
  };
  for (const t of [type, ...types]) {
    if (categoryMap[t]) return categoryMap[t];
  }
  return "Culture";
}

function parseOpeningHours(hours?: GoogleOpeningHours): {
  openingTime?: string;
  closingTime?: string;
} {
  const first = hours?.weekdayDescriptions?.[0];
  if (!first) return {};
  const match = first.match(/:\s*([\d:]+\s*[APMapm]+)\s*[–—-]\s*([\d:]+\s*[APMapm]+)/);
  if (match) {
    return { openingTime: match[1].trim(), closingTime: match[2].trim() };
  }
  return {};
}

const PRICE_LEVEL_LABELS: Record<string, string> = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "Inexpensive",
  PRICE_LEVEL_MODERATE: "Moderate",
  PRICE_LEVEL_EXPENSIVE: "Expensive",
  PRICE_LEVEL_VERY_EXPENSIVE: "Very Expensive",
};

function formatPriceLevel(level?: string): string | undefined {
  if (!level) return undefined;
  return PRICE_LEVEL_LABELS[level] ?? level.replace("PRICE_LEVEL_", "").toLowerCase();
}

function formatPriceRange(range?: GooglePlaceRaw["priceRange"]): string | undefined {
  if (!range?.startPrice?.units) return undefined;
  const start = range.startPrice.units;
  const end = range.endPrice?.units;
  return end ? `${start} – ${end}` : `From ${start}`;
}

export function mapSearchResultToPlace(
  result: PlaceSearchResult,
  context: { city?: string; state?: string; country?: string },
): Place {
  const types = result.types ?? [];
  return {
    googlePlaceId: result.googlePlaceId,
    name: result.name,
    city: context.city ?? "",
    state: context.state,
    country: context.country ?? "India",
    category: types.includes("lodging") ? "Hotel" : mapTypeToCategory(types),
    coordinates: result.coordinates,
    rating: result.rating,
    source: "google",
    formattedAddress: result.address,
    tags: types.slice(0, 5),
    averageVisitDurationMinutes: 90,
  };
}

export function mapGoogleToSearchResult(raw: GooglePlaceRaw): PlaceSearchResult | null {
  const id = raw.id ?? raw.name;
  const displayName = raw.displayName?.text;
  if (!id || !displayName) return null;

  return {
    googlePlaceId: normalizePlaceId(id),
    name: displayName,
    address: raw.formattedAddress,
    coordinates:
      raw.location?.latitude !== undefined && raw.location?.longitude !== undefined
        ? { lat: raw.location.latitude, lng: raw.location.longitude }
        : undefined,
    rating: raw.rating,
    types: raw.types,
  };
}

export function mapGoogleToPlace(
  raw: GooglePlaceRaw,
  context: { city?: string; state?: string; country?: string },
): Place {
  const id = raw.id ?? raw.name ?? "";
  const types = raw.types ?? [];
  const primaryType = raw.primaryType;
  const { openingTime, closingTime } = parseOpeningHours(raw.regularOpeningHours);
  const isHotel = types.some((t) => HOTEL_TYPES.includes(t)) || primaryType === "lodging";

  return {
    googlePlaceId: normalizePlaceId(id),
    name: raw.displayName?.text ?? "Unknown",
    city: context.city ?? "",
    state: context.state,
    country: context.country ?? "India",
    category: isHotel ? "Hotel" : mapTypeToCategory(types, primaryType),
    subCategory: primaryType,
    coordinates:
      raw.location?.latitude !== undefined && raw.location?.longitude !== undefined
        ? { lat: raw.location.latitude, lng: raw.location.longitude }
        : undefined,
    averageVisitDurationMinutes: isHotel ? undefined : 90,
    openingTime,
    closingTime,
    description: raw.editorialSummary?.text,
    tags: types.slice(0, 5),
    rating: raw.rating,
    source: "google",
    formattedAddress: raw.formattedAddress,
  };
}

export function mapGoogleToPlaceDetail(
  raw: GooglePlaceRaw,
  context: { city?: string; state?: string; country?: string },
): PlaceDetail {
  const base = mapGoogleToPlace(raw, context);
  const name = base.name;
  const city = context.city ?? base.city;
  const country = context.country ?? base.country;

  const googleMapsUrl =
    raw.googleMapsUri ??
    (base.googlePlaceId
      ? `https://www.google.com/maps/place/?q=place_id:${base.googlePlaceId}`
      : undefined);

  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${name} ${city} ${country}`)}`;

  return {
    ...base,
    userRatingCount: raw.userRatingCount,
    priceLevel: formatPriceLevel(raw.priceLevel),
    priceRange: formatPriceRange(raw.priceRange),
    websiteUri: raw.websiteUri,
    googleMapsUri: raw.googleMapsUri,
    googleMapsUrl,
    googleSearchUrl,
    weekdayDescriptions: raw.regularOpeningHours?.weekdayDescriptions,
    entryFee: formatPriceLevel(raw.priceLevel) ?? formatPriceRange(raw.priceRange),
  };
}

export function buildTextQuery(query: string, city?: string, country?: string): string {
  const parts = [query.trim()];
  if (city && !query.toLowerCase().includes(city.toLowerCase())) {
    parts.push(`in ${city}`);
  }
  if (country && !query.toLowerCase().includes(country.toLowerCase())) {
    parts.push(country);
  }
  return parts.join(" ");
}
