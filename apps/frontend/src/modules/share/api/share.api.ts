import { api } from "@/lib/api";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { Itinerary } from "@/modules/itinerary/types";

export async function getSharedTrip(slug: string): Promise<{ trip: Trip; itinerary: Itinerary | null }> {
  const res = await api.get(`/share/${slug}`);
  return res.data.data;
}
