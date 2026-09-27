export type PlaceSource = "google" | "ai" | "user";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface OpeningPeriodPoint {
  day: number;
  hour: number;
  minute: number;
}

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
  openingPeriods?: OpeningPeriod[];
  /** Google's weekly hours text, Monday first. */
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
  reviews?: PlaceReview[];
  reviewSummary?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  googleMapsUrl?: string;
  googleSearchUrl?: string;
  /** Stable Google photo resource names — used to rebuild proxy URLs from cache. */
  photoNames?: string[];
  photoUrls?: string[];
}

export interface PlaceSearchResult {
  googlePlaceId: string;
  name: string;
  address?: string;
  coordinates?: Coordinates;
  rating?: number;
  types?: string[];
}

export interface SearchPlacesOptions {
  query: string;
  city?: string;
  country?: string;
  location?: Coordinates;
  limit?: number;
  sessionToken?: string;
  pageToken?: string;
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
