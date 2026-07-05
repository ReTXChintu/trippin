import { api } from "@/lib/api";
import type { Place, PlaceDetail, PlaceSearchResult } from "@/modules/places/types/place.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";

export async function searchPlaces(params: {
  query: string;
  city?: string;
  country?: string;
  sessionToken?: string;
  lat?: number;
  lng?: number;
  type?: "places" | "hotels";
}): Promise<{ results: PlaceSearchResult[] }> {
  const res = await api.get("/places/search", { params });
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
export async function getTripPlaces(tripId: string, view: "selected" | "pool" = "selected"): Promise<{ places: Place[] }> {
  const res = await api.get(`/trips/${tripId}/places`, { params: { view } });
  return res.data.data;
}

export async function addPlaceToTrip(tripId: string, placeId: string): Promise<{ places: Place[] }> {
  const res = await api.post(`/trips/${tripId}/places`, { placeId });
  return res.data.data;
}

export async function bulkAddPlacesToTrip(tripId: string, placeIds: string[]): Promise<{ places: Place[] }> {
  const res = await api.post(`/trips/${tripId}/places`, { action: "bulkAdd", placeIds });
  return res.data.data;
}

export async function removePlaceFromTrip(tripId: string, placeId: string): Promise<{ places: Place[] }> {
  const res = await api.delete(`/trips/${tripId}/places`, { params: { placeId } });
  return res.data.data;
}

export async function bulkRemovePlacesFromTrip(tripId: string, placeIds: string[]): Promise<{ places: Place[] }> {
  const res = await api.delete(`/trips/${tripId}/places`, { params: { placeIds: placeIds.join(",") } });
  return res.data.data;
}

export async function addPlaceFromSearch(tripId: string, placeId: string): Promise<{ places: Place[]; place: Place }> {
  const res = await api.post(`/trips/${tripId}/places/from-search`, { placeId });
  return res.data.data;
}

export async function discoverPlacesForTrip(
  tripId: string,
  opts?: { forceRefresh?: boolean; legId?: string },
): Promise<{ places: Place[]; legs?: TripLeg[] }> {
  const res = await api.post(`/trips/${tripId}/places/discover`, opts ?? {});
  return res.data.data;
}
