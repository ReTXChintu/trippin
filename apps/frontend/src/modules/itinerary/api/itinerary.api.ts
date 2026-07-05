import { api } from "@/lib/api";
import type { Itinerary } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";

export async function getItinerary(tripId: string): Promise<{ itinerary: Itinerary | null }> {
  const res = await api.get(`/trips/${tripId}/itinerary`);
  return res.data.data;
}

export async function generateItinerary(tripId: string): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "generate" });
  return res.data.data;
}

export async function summarizeItinerary(tripId: string): Promise<{ itinerary: Itinerary; summary: string }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "summarize" });
  return res.data.data;
}

export async function optimizeItinerary(tripId: string): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "optimize" });
  return res.data.data;
}

export async function enrichItinerary(tripId: string): Promise<{ itinerary: Itinerary; trip: Trip }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "enrich" });
  return res.data.data;
}

export async function reorderItineraryStops(
  tripId: string,
  dayNumber: number,
  stopIds: string[],
): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "reorder", dayNumber, stopIds });
  return res.data.data;
}
