import type {
  OpeningPeriod,
  Place,
  PlaceDetail,
  PlaceReview,
  PlaceSearchResult,
} from "@/modules/places/types/place.types";
import { HOTEL_TYPES } from "@/constants/google-places";

interface GoogleDisplayName {
  text?: string;
  languageCode?: string;
}

interface GoogleLocation {
  latitude?: number;
  longitude?: number;
}

interface GooglePeriodPoint {
  day?: number;
  hour?: number;
  minute?: number;
}

interface GoogleOpeningHours {
  weekdayDescriptions?: string[];
  periods?: Array<{ open?: GooglePeriodPoint; close?: GooglePeriodPoint }>;
}

interface GoogleReview {
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  authorAttribution?: { displayName?: string };
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
  reviews?: GoogleReview[];
  generativeSummary?: { overview?: { text?: string } };
}

export function normalizePlaceId(id: string): string {
  return id.startsWith("places/") ? id.replace("places/", "") : id;
}

export function toPlaceIdPath(id: string): string {
  const normalized = normalizePlaceId(id);
  return `places/${normalized}`;
}

function mapPeriodPoint(point?: GooglePeriodPoint) {
  if (point?.day == null) return undefined;
  return { day: point.day, hour: point.hour ?? 0, minute: point.minute ?? 0 };
}

export function mapOpeningPeriods(hours?: GoogleOpeningHours): OpeningPeriod[] | undefined {
  if (!hours?.periods?.length) return undefined;
  const periods: OpeningPeriod[] = [];
  for (const period of hours.periods) {
    const open = mapPeriodPoint(period.open);
    if (!open) continue;
    const close = mapPeriodPoint(period.close);
    periods.push(close ? { open, close } : { open });
  }
  return periods.length > 0 ? periods : undefined;
}

const MAX_REVIEWS = 5;
const MAX_REVIEW_CHARS = 600;

function mapReviews(reviews?: GoogleReview[]): PlaceReview[] | undefined {
  const mapped = (reviews ?? [])
    .map((r): PlaceReview | null => {
      const text = (r.text?.text ?? r.originalText?.text ?? "").trim();
      if (!text) return null;
      return {
        rating: r.rating,
        text: text.length > MAX_REVIEW_CHARS ? `${text.slice(0, MAX_REVIEW_CHARS).trimEnd()}…` : text,
        authorName: r.authorAttribution?.displayName,
        relativeTime: r.relativePublishTimeDescription,
      };
    })
    .filter((r): r is PlaceReview => r !== null)
    .slice(0, MAX_REVIEWS);
  return mapped.length > 0 ? mapped : undefined;
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
    category: types.includes("lodging") ? "Hotel" : mapTypeToCategory(types, result.primaryType),
    subCategory: result.primaryType,
    coordinates: result.coordinates,
    rating: result.rating,
    userRatingCount: result.userRatingCount,
    priceLevel: result.priceLevel,
    openingPeriods: result.openingPeriods,
    weekdayDescriptions: result.weekdayDescriptions,
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
    userRatingCount: raw.userRatingCount,
    priceLevel: formatPriceLevel(raw.priceLevel),
    types: raw.types,
    primaryType: raw.primaryType,
    openingPeriods: mapOpeningPeriods(raw.regularOpeningHours),
    weekdayDescriptions: raw.regularOpeningHours?.weekdayDescriptions,
    photoName: raw.photos?.[0]?.name,
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
    openingPeriods: mapOpeningPeriods(raw.regularOpeningHours),
    weekdayDescriptions: raw.regularOpeningHours?.weekdayDescriptions,
    description: raw.editorialSummary?.text,
    tags: types.slice(0, 5),
    rating: raw.rating,
    userRatingCount: raw.userRatingCount,
    priceLevel: formatPriceLevel(raw.priceLevel),
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
    reviews: mapReviews(raw.reviews),
    reviewSummary: raw.generativeSummary?.overview?.text ?? raw.editorialSummary?.text,
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
