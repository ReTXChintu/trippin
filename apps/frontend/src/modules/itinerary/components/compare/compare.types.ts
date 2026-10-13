import type { ItineraryStop } from "@/modules/itinerary/types";

/** A didn't-fit place dropped onto a merged day; the server places it when the merge is applied. */
export interface PendingOptional {
  placeId: string;
  placeName: string;
  category?: string;
}

export type FinalSource = "system" | "ai" | "custom";

/** One day of the merged plan on the Compare page. */
export interface FinalDayState {
  stops: ItineraryStop[];
  pendingOptional: PendingOptional[];
  dressCode?: string;
  /** Which side the day was taken from; "custom" once stops were dragged/removed by hand. */
  source: FinalSource;
}
