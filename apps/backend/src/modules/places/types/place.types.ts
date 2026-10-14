export type PlaceSource = "google" | "ai" | "user";

export interface Coordinates {
  lat: number;
  lng: number;
}

/** One side of a Google `regularOpeningHours.periods` entry. `day` is 0 = Sunday … 6 = Saturday. */
export interface OpeningPeriodPoint {
  day: number;
  hour: number;
  minute: number;
}

/** A Google opening period. A period with no `close` means "open 24 hours". */
export interface OpeningPeriod {
  open: OpeningPeriodPoint;
  close?: OpeningPeriodPoint;
}

export interface PlaceReview {
  rating?: number;
  text: string;
  authorName?: string;
  relativeTime?: string;
}

export interface Place {
  googlePlaceId?: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  category: string;
  subCategory?: string;
  coordinates?: Coordinates;
  averageVisitDurationMinutes?: number;
  openingTime?: string;
  closingTime?: string;
  /** Structured weekly hours — the source of truth for "is it open on this date". */
  openingPeriods?: OpeningPeriod[];
  /** Google's human-readable weekly hours ("Monday: 9:00 AM – 5:00 PM"), Monday first. */
  weekdayDescriptions?: string[];
  weeklyClosedDays?: string[];
  description?: string;
  tags?: string[];
  rating?: number;
  userRatingCount?: number;
  imageUrl?: string;
  recommendedVisitTime?: string;
  bestSeason?: string;
  entryFee?: string;
  priceLevel?: string;
  isMustVisit?: boolean;
  source: PlaceSource;
  formattedAddress?: string;
}

export interface PlaceDetail extends Place {
  priceRange?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  googleMapsUrl?: string;
  googleSearchUrl?: string;
  /** Stable Google photo resource names — used to rebuild proxy URLs from cache. */
  photoNames?: string[];
  photoUrls?: string[];
  reviews?: PlaceReview[];
  /** Bumped when the rich-detail field set grows, so older cache entries get refetched once. */
  richVersion?: number;
  /** Google's AI-generated summary of the place (or its editorial summary as a fallback). */
  reviewSummary?: string;
}

export interface PlaceSearchResult {
  googlePlaceId: string;
  name: string;
  address?: string;
  coordinates?: Coordinates;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
  primaryType?: string;
  openingPeriods?: OpeningPeriod[];
  weekdayDescriptions?: string[];
  photoName?: string;
}

export interface SearchPlacesOptions {
  query: string;
  city?: string;
  country?: string;
  location?: Coordinates;
  limit?: number;
  sessionToken?: string;
  pageToken?: string;
  /** Only return places within this many km of `location` (instead of just preferring them). */
  restrictKm?: number;
  googleMapsApiKey: string;
}

export interface SearchNearbyOptions {
  location: Coordinates;
  radiusMeters: number;
  includedTypes: string[];
  limit?: number;
  googleMapsApiKey: string;
}

export interface SearchPlacesPageResult {
  results: PlaceSearchResult[];
  nextPageToken?: string;
}

export interface DiscoverPlacesParams {
  city: string;
  state?: string;
  country: string;
  /** Additional areas to search (e.g. day-trip towns). */
  searchAreas?: string[];
  interests?: string[];
  travelStyle?: string;
  mustVisitPlaces?: string[];
  excludedPlaces?: string[];
  limit?: number;
  hotelCoordinates?: Coordinates;
  googleMapsApiKey: string;
}

export interface RankPlacesParams {
  places: Place[];
  interests?: string[];
  travelStyle?: string;
  mustVisitPlaces?: string[];
  excludedPlaces?: string[];
  limit?: number;
}
