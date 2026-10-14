/** Field masks — Essentials/Pro only; avoids Enterprise SKU charges. */
export const PLACES_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.types",
  "places.primaryType",
  "places.regularOpeningHours",
].join(",");

/** Nearby restaurant / hotel searches also want one photo reference per result for cards. */
export const PLACES_NEARBY_FIELD_MASK = [PLACES_SEARCH_FIELD_MASK, "places.photos"].join(",");

export const PLACE_DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "priceLevel",
  "types",
  "primaryType",
  "regularOpeningHours",
  "editorialSummary",
  "photos",
].join(",");

export const AUTocomplete_FIELD_MASK = [
  "suggestions.placePrediction.placeId",
  "suggestions.placePrediction.text",
  "suggestions.placePrediction.structuredFormat",
].join(",");

export const PLACES_API_BASE = "https://places.googleapis.com/v1";
export const GEOCODING_API_BASE = "https://maps.googleapis.com/maps/api/geocode/json";
export const DIRECTIONS_API_BASE = "https://maps.googleapis.com/maps/api/directions/json";

export const PLACE_CACHE_TTL_DAYS = 30;
/** Roads change rarely and this app plans ahead rather than routing live traffic, so route
 * geometry/distance can be cached far longer than place details. */
export const ROUTE_CACHE_TTL_DAYS = 30;
export const SEARCH_MIN_QUERY_LENGTH = 3;
export const SEARCH_DEBOUNCE_MS = 400;
export const MAX_SEARCH_RESULTS = 20;
export const MAX_SEARCH_PAGES = 3;
export const MAX_DISCOVERY_POOL_SIZE = 120;
export const MAX_DISCOVERY_QUERIES = 5;
/** Per-user daily caps on Google calls, from .env (0 = no cap). Read on use, after .env loads. */
function envLimit(key: string, fallback: number): number {
  const n = Number(process.env[key]);
  return Number.isFinite(n) && n >= 0 && process.env[key]?.trim() ? n : fallback;
}
export const dailySearchLimit = () => envLimit("PLACES_DAILY_SEARCH_LIMIT", 100);
export const dailyDetailLimit = () => envLimit("PLACES_DAILY_DETAIL_LIMIT", 50);
export const MAX_PLACE_PHOTOS = 6;

export const PLACE_DETAILS_RICH_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "types",
  "primaryType",
  "regularOpeningHours",
  "photos",
  "priceLevel",
  "priceRange",
  "websiteUri",
  "googleMapsUri",
  "editorialSummary",
  "reviews",
  "generativeSummary",
].join(",");

export const HOTEL_TYPES = ["lodging", "hotel", "guest_house"];

export const FOOD_SEARCH_QUERIES = [
  "best local food",
  "famous restaurants",
  "street food",
] as const;

export const MARKET_SEARCH_QUERIES = [
  "local bazaar market",
  "shopping market souvenirs",
  "famous market",
] as const;

export const VEHICLE_RENTAL_SEARCH_QUERIES = [
  "bike rental scooter",
  "two wheeler rental",
  "motorcycle rental",
] as const;

/** Restaurants suggested for a meal slot: searched within this radius of where you'll be. */
export const MEAL_SUGGESTION_RADIUS_METERS = 1500;
export const MAX_MEAL_SUGGESTIONS = 12;
export const RESTAURANT_TYPES = ["restaurant", "cafe", "bakery", "meal_takeaway"];

export const MAX_HOTEL_SEARCH_RESULTS = 20;

export const MAX_FOOD_POOL_SIZE = 20;
export const MAX_MARKET_POOL_SIZE = 15;
export const MAX_VEHICLE_RENTAL_SUGGESTIONS = 6;

export const INTEREST_TO_SEARCH_QUERY: Record<string, string> = {
  History: "historical sites",
  Culture: "cultural attractions",
  Temples: "temples",
  Food: "restaurants local food",
  Nature: "parks nature",
  Adventure: "adventure activities",
  Photography: "scenic viewpoints",
  Shopping: "markets shopping",
  Nightlife: "nightlife",
  Architecture: "architecture landmarks",
  Spiritual: "spiritual places",
  Museums: "museums",
  Wildlife: "wildlife sanctuary",
  Forts: "forts palaces",
  Lakes: "lakes",
  Cafes: "cafes",
};
