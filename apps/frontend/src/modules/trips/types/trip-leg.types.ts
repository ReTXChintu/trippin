import type {
  LegDestinationBrief,
  VehicleRentalSuggestion,
} from "@/modules/trips/types/trip-enrichment.types";

export interface TripLeg {
  id: string;
  name: string;
  baseCity: string;
  dayTripAreas: string[];
  startDate: string;
  endDate: string;
  /** HH:mm — when you reach this leg (first sightseeing day only). */
  arrivalTime?: string;
  /** HH:mm — when you leave on leg.endDate. Morning checkout skips sightseeing that day. */
  departureTime?: string;
  state?: string;
  country: string;
  hotelName?: string;
  hotelAddress?: string;
  hotelCoordinates?: { lat: number; lng: number };
  order: number;
  discoveryPoolIds: string[];
  foodPoolIds: string[];
  marketPoolIds: string[];
  destinationBrief?: LegDestinationBrief;
  vehicleRentalSuggestions: VehicleRentalSuggestion[];
}

export interface TripLegTransfer {
  id: string;
  date: string;
  fromLegId: string;
  toLegId: string;
  label: string;
  estimatedTravelMinutes?: number;
}

export type TripDayPlan =
  | { type: "transfer"; transfer: TripLegTransfer }
  | { type: "sightseeing"; leg: TripLeg; transferOnDay?: TripLegTransfer }
  | { type: "free" };
