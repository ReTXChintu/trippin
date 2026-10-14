import { z } from "zod";
import type { TransportationMode, TravelStyle, TripStatus } from "@/types";
import { INTEREST_CATEGORIES } from "@/constants/interests";

const travelStyles = ["Relaxed", "Balanced", "Fast Paced"] as const satisfies readonly TravelStyle[];
const transportationModes = [
  "Walking",
  "Cab",
  "Self Drive",
  "Bike",
  "Public Transport",
] as const satisfies readonly TransportationMode[];
const tripStatuses = ["draft", "active", "archived", "completed"] as const satisfies readonly TripStatus[];
const budgetLevels = ["budget", "moderate", "luxury"] as const;

const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const clockTimeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Time must be HH:mm")
  .optional();

const optionalClockTimeSchema = z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  clockTimeSchema,
);

export const tripStaySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional(),
  coordinates: coordinatesSchema.optional(),
  googlePlaceId: z.string().optional(),
  checkInDate: z.string().min(1),
  checkOutDate: z.string().min(1),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  confirmationNumber: z.string().optional(),
  pricePerNight: z.number().optional(),
  currency: z.string().optional(),
  bookingUrl: z.string().optional(),
  notes: z.string().optional(),
  rating: z.number().optional(),
});

export const tripLegSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Leg name is required"),
  baseCity: z.string().min(2, "Base city is required"),
  dayTripAreas: z.array(z.string()).default([]),
  dayTrips: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string(),
        date: z.string().optional(),
        coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
      }),
    )
    .optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  arrivalTime: clockTimeSchema,
  departureTime: clockTimeSchema,
  state: z.string().optional(),
  country: z.string().min(2),
  hotelName: z.string().optional(),
  hotelAddress: z.string().optional(),
  hotelCoordinates: coordinatesSchema.optional(),
  stays: z.array(tripStaySchema).default([]),
  order: z.number().int().min(0),
  discoveryPoolIds: z.array(z.string()).default([]),
  foodPoolIds: z.array(z.string()).default([]),
  marketPoolIds: z.array(z.string()).default([]),
  selectedPlaceIds: z.array(z.string()).default([]),
  aiMatchedPlaceIds: z.array(z.string()).default([]),
  aiSuggestedPlaceNames: z.array(z.string()).default([]),
  destinationBrief: z
    .object({
      specialties: z.array(z.string()),
      localFood: z.array(z.string()),
      markets: z.array(
        z.object({
          placeId: z.string().optional(),
          name: z.string(),
          whatToBuy: z.array(z.string()),
        }),
      ),
      festivals: z.array(z.string()).default([]),
      generalTips: z.array(z.string()),
      generatedAt: z.string().optional(),
    })
    .optional(),
  vehicleRentalSuggestions: z
    .array(
      z.object({
        googlePlaceId: z.string(),
        name: z.string(),
        address: z.string().optional(),
        rating: z.number().optional(),
        userRatingCount: z.number().optional(),
        websiteUri: z.string().optional(),
        googleMapsUrl: z.string().optional(),
        phone: z.string().optional(),
        distanceKm: z.number().optional(),
        vehicleTypes: z.array(z.string()).default(["scooter", "bike"]),
      }),
    )
    .default([]),
});

export const tripLegTransferSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  fromLegId: z.string().min(1),
  toLegId: z.string().min(1),
  label: z.string().min(1),
  estimatedTravelMinutes: z.number().int().positive().optional(),
});

const tripBaseSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  destinationCity: z.string().min(2, "City is required"),
  destinationState: z.string().optional(),
  destinationCountry: z.string().min(2, "Country is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  arrivalTime: optionalClockTimeSchema,
  departureTime: optionalClockTimeSchema,
  hotelName: z.string().optional(),
  hotelAddress: z.string().optional(),
  hotelLat: z.string().optional(),
  hotelLng: z.string().optional(),
  legs: z.array(tripLegSchema).default([]),
  transfers: z.array(tripLegTransferSchema).default([]),
  dailyStartTime: z.string().min(1),
  dailyEndTime: z.string().min(1),
  useFlexibleSchedule: z.boolean().default(false),
  transportationMode: z.enum(transportationModes),
  travelStyle: z.enum(travelStyles),
  budgetLevel: z.enum(budgetLevels).optional(),
  currency: z.string().optional(),
  budgetAmount: z.preprocess(
    (v) => (v === "" || v === null || (typeof v === "number" && Number.isNaN(v)) ? undefined : Number(v)),
    z.number().nonnegative("Budget can't be negative").optional(),
  ),
  interests: z.array(z.string()),
  mustVisitPlaces: z.array(z.string()),
  excludedPlaces: z.array(z.string()),
  notes: z.string().optional(),
  status: z.enum(tripStatuses),
});

export const tripFormSchema = tripBaseSchema;

export const createTripSchema = tripBaseSchema
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be on or after start date",
    path: ["endDate"],
  })
  .refine(
    (data) => {
      if (data.legs.length === 0) return true;
      return data.legs.every((leg) => new Date(leg.endDate) >= new Date(leg.startDate));
    },
    { message: "Each leg end date must be on or after its start date", path: ["legs"] },
  );

export const updateTripSchema = createTripSchema;

export const generateTripPromptSchema = z.object({
  prompt: z.string().min(10, "Please describe your trip in a few words"),
});

export const tripIdSchema = z.object({
  tripId: z.string().min(1),
});

export type TripFormValues = z.input<typeof tripFormSchema>;
export type CreateTripInput = z.output<typeof tripFormSchema>;
export type UpdateTripInput = CreateTripInput;

export function validateInterests(interests: string[]): string[] {
  const valid = new Set<string>(INTEREST_CATEGORIES);
  return interests.filter((i) => valid.has(i));
}

export function buildTripInputFromRaw(raw: Record<string, unknown>) {
  const interests = Array.isArray(raw.interests)
    ? raw.interests.map(String)
    : typeof raw.interests === "string"
      ? raw.interests.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const mustVisitPlaces = Array.isArray(raw.mustVisitPlaces)
    ? raw.mustVisitPlaces.map(String)
    : typeof raw.mustVisitPlaces === "string"
      ? raw.mustVisitPlaces.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const excludedPlaces = Array.isArray(raw.excludedPlaces)
    ? raw.excludedPlaces.map(String)
    : typeof raw.excludedPlaces === "string"
      ? raw.excludedPlaces.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  function parseJsonField<T>(value: unknown, fallback: T): T {
    if (Array.isArray(value)) return value as T;
    if (typeof value === "string" && value.trim()) {
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  return {
    ...raw,
    interests: validateInterests(interests),
    mustVisitPlaces,
    excludedPlaces,
    useFlexibleSchedule:
      raw.useFlexibleSchedule === true ||
      raw.useFlexibleSchedule === "true" ||
      raw.useFlexibleSchedule === "on",
    legs: parseJsonField(raw.legs, []),
    transfers: parseJsonField(raw.transfers, []),
    hotelLat: raw.hotelLat === "" || raw.hotelLat === undefined ? undefined : String(raw.hotelLat),
    hotelLng: raw.hotelLng === "" || raw.hotelLng === undefined ? undefined : String(raw.hotelLng),
  };
}

export { coordinatesSchema };
