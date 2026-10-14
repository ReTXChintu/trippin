import type {
  LegDestinationBrief,
  VehicleRentalSuggestion,
} from "@/modules/trips/types/trip-enrichment.types";

/** A booked (or shortlisted-and-chosen) place to sleep. Nights run checkInDate → checkOutDate,
 * so a stay covers every date d with checkInDate <= d < checkOutDate. */
export interface TripStay {
  id: string;
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  googlePlaceId?: string;
  checkInDate: string;
  checkOutDate: string;
  /** HH:mm */
  checkInTime?: string;
  /** HH:mm */
  checkOutTime?: string;
  confirmationNumber?: string;
  pricePerNight?: number;
  currency?: string;
  bookingUrl?: string;
  notes?: string;
  rating?: number;
}

/** A day out from a city's base, coming back to the same stay the same evening. */
export interface TripDayTrip {
  id: string;
  /** Town or area, e.g. "Ujjain". */
  name: string;
  /** YYYY-MM-DD — the day you've fixed for it; omitted = the planner picks a day. */
  date?: string;
  /** Centre of the area; filled in from a city lookup when missing. */
  coordinates?: { lat: number; lng: number };
}

export interface TripLeg {
  id: string;
  name: string;
  baseCity: string;
  dayTripAreas: string[];
  /** Day trips with optional fixed days. `dayTripAreas` mirrors their names for older clients. */
  dayTrips?: TripDayTrip[];
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
  /** Where you sleep during this leg. The legacy hotel* fields mirror the first stay. */
  stays: TripStay[];
  order: number;
  discoveryPoolIds: string[];
  foodPoolIds: string[];
  marketPoolIds: string[];
  selectedPlaceIds: string[];
  /** googlePlaceIds within discoveryPoolIds that an AI suggestion matched on the last discovery run. */
  aiMatchedPlaceIds: string[];
  /** AI-suggested place names that didn't match any Google-discovered place — search & add manually. */
  aiSuggestedPlaceNames: string[];
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
