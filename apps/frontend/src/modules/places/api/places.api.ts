import { api } from "@/lib/api";
import type { Place, PlaceDetail, PlaceSearchResult } from "@/modules/places/types/place.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import type { VehicleRentalSuggestion } from "@/modules/trips/types/trip-enrichment.types";

export async function searchPlaces(params: {
  query: string;
  city?: string;
  country?: string;
  sessionToken?: string;
  lat?: number;
  lng?: number;
  type?: "places" | "hotels";
  /** Day-trip towns to search as well ("Ujjain,Omkareshwar"). */
  areas?: string;
  /** With lat/lng: only results within this many km. */
  radiusKm?: number;
}): Promise<{ results: PlaceSearchResult[] }> {
  const res = await api.get("/places/search", { params });
  return res.data.data;
}

export interface CityMatch {
  name: string;
  state?: string;
  country: string;
  countryCode?: string;
  lat: number;
  lng: number;
}

export async function searchCities(q: string): Promise<{ cities: CityMatch[] }> {
  const res = await api.get("/places/cities", { params: { q } });
  return res.data.data;
}

export async function getPlaceDetailRich(tripId: string, placeId: string): Promise<{ place: PlaceDetail }> {
  const res = await api.post("/places/search", { tripId, placeId });
  return res.data.data;
}

export async function getPlaceDetails(params: {
  placeId: string;
  city?: string;
  state?: string;
  country?: string;
}): Promise<{ place: Place }> {
  const res = await api.get("/places/details", { params });
  return res.data.data;
}

export function getPhotoUrl(photoName: string, opts?: { tripId?: string; maxHeightPx?: number }): string {
  const baseUrl = api.defaults.baseURL ?? "";
  const params = new URLSearchParams({ name: photoName });
  if (opts?.tripId) params.set("tripId", opts.tripId);
  if (opts?.maxHeightPx) params.set("maxHeightPx", String(opts.maxHeightPx));
  return `${baseUrl}/places/photo?${params.toString()}`;
}

// Trip-scoped places
export async function getTripPlaces(
  tripId: string,
  view: "selected" | "pool" = "selected",
  legId?: string,
): Promise<{ places: Place[] }> {
  const res = await api.get(`/trips/${tripId}/places`, { params: { view, legId } });
  return res.data.data;
}

export async function getTripEatShopPool(
  tripId: string,
): Promise<{ foodPlaces: Place[]; marketPlaces: Place[]; localFood: string[] }> {
  const res = await api.get(`/trips/${tripId}/places`, { params: { view: "eat-shop" } });
  return res.data.data;
}

export async function addPlaceToTrip(tripId: string, legId: string, placeId: string, areaId?: string): Promise<{ places: Place[] }> {
  const res = await api.post(`/trips/${tripId}/places`, { legId, placeId, areaId });
  return res.data.data;
}

export async function bulkAddPlacesToTrip(
  tripId: string,
  legId: string,
  placeIds: string[],
  areaId?: string,
): Promise<{ places: Place[] }> {
  const res = await api.post(`/trips/${tripId}/places`, { action: "bulkAdd", legId, placeIds, areaId });
  return res.data.data;
}

/** Moves picked places to another area of the city ("base" or a day trip id). */
export async function setPlaceArea(tripId: string, legId: string, placeIds: string[], areaId: string): Promise<{ placeAreas: Record<string, string> }> {
  const res = await api.post(`/trips/${tripId}/places`, { action: "setArea", legId, placeIds, areaId });
  return res.data.data;
}

export async function removePlaceFromTrip(
  tripId: string,
  legId: string,
  placeId: string,
): Promise<{ places: Place[] }> {
  const res = await api.delete(`/trips/${tripId}/places`, { params: { legId, placeId } });
  return res.data.data;
}

export async function bulkRemovePlacesFromTrip(
  tripId: string,
  legId: string,
  placeIds: string[],
): Promise<{ places: Place[] }> {
  const res = await api.delete(`/trips/${tripId}/places`, { params: { legId, placeIds: placeIds.join(",") } });
  return res.data.data;
}

export async function addPlaceFromSearch(
  tripId: string,
  legId: string,
  placeId: string,
  areaId?: string,
): Promise<{ places: Place[]; place: Place }> {
  const res = await api.post(`/trips/${tripId}/places/from-search`, { legId, placeId, areaId });
  return res.data.data;
}

export async function discoverPlacesForTrip(
  tripId: string,
  opts?: { forceRefresh?: boolean; legId?: string },
): Promise<{ places: Place[]; legs?: TripLeg[] }> {
  const res = await api.post(`/trips/${tripId}/places/discover`, opts ?? {});
  return res.data.data;
}

export async function discoverVehicleRentalsForLeg(
  tripId: string,
  legId: string,
): Promise<{ vehicleRentalSuggestions: VehicleRentalSuggestion[] }> {
  const res = await api.post(`/trips/${tripId}/places/vehicle-rentals`, { legId });
  return res.data.data;
}

export type AreaSearchCategory = "sights" | "nature" | "food" | "shopping";

export async function searchArea(
  tripId: string,
  params: { legId: string; lat: number; lng: number; radiusMeters: number; category: AreaSearchCategory },
): Promise<{ places: Place[]; added: number }> {
  const res = await api.post(`/trips/${tripId}/places/search-area`, params);
  return res.data.data;
}
