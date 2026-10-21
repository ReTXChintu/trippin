import { api } from "@/lib/api";
import type { LinkToggles, TripLinksView } from "@/modules/suite/types/suite.types";

/** Link status per app, the live SpendLog / InFrame summaries for the viewer, and promos. */
export async function getTripLinks(tripId: string): Promise<TripLinksView> {
  const res = await api.get(`/trips/${tripId}/links`);
  return res.data.data;
}

/** Owner only. Switching off unlinks — nothing is deleted on either side. `true` on a link in error tries again. */
export async function setTripLinks(tripId: string, toggles: LinkToggles): Promise<TripLinksView> {
  const res = await api.patch(`/trips/${tripId}/links`, toggles);
  return res.data.data;
}
