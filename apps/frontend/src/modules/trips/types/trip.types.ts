import type { TripStatus, TravelStyle, TransportationMode } from "@/types";
import type { TripLeg, TripLegTransfer } from "@/modules/trips/types/trip-leg.types";
import type { ChecklistItem, TripBooking } from "@/modules/trips/types/trip-extras.types";
import type {
  LegDestinationBrief,
  VehicleRentalSuggestion,
} from "@/modules/trips/types/trip-enrichment.types";
import type { TripLinks } from "@/modules/suite/types/suite.types";
/** Someone on a trip — sent with trip lists (owner first). */
export interface TripPerson {
  id: string;
  name: string;
  avatar?: string;
}

export interface Trip {
  /** Only in lists (dashboard, My trips): the people on the trip, owner first. */
  people?: TripPerson[];
  /** Only in lists: whether a day-by-day plan exists and how many edits since. */
  planInfo?: { hasPlan: boolean; edits: number };
  id: string;
  userId: string;
  memberIds: string[];
  /** Members with view-only access. */
  viewerIds: string[];
  /** placeId → user ids who voted for it. */
  placeVotes: Record<string, string[]>;
  title: string;
  destinationCity: string;
  destinationState?: string;
  destinationCountry: string;
  startDate: string;
  endDate: string;
  /** HH:mm — when you reach the destination (first day). Used when trip has no legs. */
  arrivalTime?: string;
  /** HH:mm — when you leave on the last day. Used when trip has no legs. */
  departureTime?: string;
  hotelName?: string;
  hotelAddress?: string;
  hotelCoordinates?: { lat: number; lng: number };
  legs: TripLeg[];
  transfers: TripLegTransfer[];
  dailyStartTime: string;
  dailyEndTime: string;
  /** When true, ignore fixed daily start — schedule each stop at its best/preferred visit time. */
  useFlexibleSchedule: boolean;
  transportationMode: TransportationMode;
  travelStyle: TravelStyle;
  budgetLevel?: "budget" | "moderate" | "luxury";
  currency: string;
  budgetAmount?: number;
  bookings: TripBooking[];
  checklist: ChecklistItem[];
  interests: string[];
  mustVisitPlaces: string[];
  excludedPlaces: string[];
  discoveryPoolIds: string[];
  foodPoolIds: string[];
  marketPoolIds: string[];
  destinationBrief?: LegDestinationBrief;
  vehicleRentalSuggestions: VehicleRentalSuggestion[];
  notes?: string;
  status: TripStatus;
  isPublic: boolean;
  publicSlug?: string;
  /** SpendLog / InFrame links (absent on trips from older servers and on the public page). */
  links?: TripLinks;
  createdAt: string;
  updatedAt: string;
}

export interface TripDraft {
  title?: string;
  destinationCity?: string;
  destinationState?: string;
  destinationCountry?: string;
  startDate?: string;
  endDate?: string;
  hotelName?: string;
  hotelAddress?: string;
  travelStyle?: TravelStyle;
  interests?: string[];
  durationDays?: number;
}

export interface TripStats {
  totalTrips: number;
  upcomingTrips: number;
  activeTrips?: number;
  completedTrips: number;
  archivedTrips: number;
}
