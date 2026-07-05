/** Field masks — Essentials/Pro only; avoids Enterprise SKU charges. */
export const PLACES_SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.types",
  "places.primaryType",
  "places.regularOpeningHours",
].join(",");

export const PLACE_DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
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

export const PLACE_CACHE_TTL_DAYS = 30;
export const SEARCH_MIN_QUERY_LENGTH = 3;
export const SEARCH_DEBOUNCE_MS = 400;
export const MAX_SEARCH_RESULTS = 20;
export const MAX_SEARCH_PAGES = 3;
export const MAX_DISCOVERY_POOL_SIZE = 120;
export const MAX_DISCOVERY_QUERIES = 5;
export const MAX_DAILY_SEARCHES_PER_USER = 100;
export const MAX_DAILY_DETAIL_REQUESTS = 50;
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
