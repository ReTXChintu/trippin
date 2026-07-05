import { z } from "zod";
import { SEARCH_MIN_QUERY_LENGTH } from "@/constants/google-places";

export const searchQuerySchema = z.object({
  query: z.string().min(SEARCH_MIN_QUERY_LENGTH, "Enter at least 3 characters"),
  city: z.string().optional(),
  country: z.string().optional(),
  sessionToken: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

export const placeIdSchema = z.object({
  placeId: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

export const geocodeSchema = z.object({
  address: z.string().min(3, "Address is required"),
});

export const discoverTripPlacesSchema = z.object({
  tripId: z.string().min(1),
  forceRefresh: z.boolean().optional(),
  legId: z.string().optional(),
});

export const tripPlaceSchema = z.object({
  tripId: z.string().min(1),
  placeId: z.string().min(1),
});

export const placeDetailSchema = z.object({
  placeId: z.string().min(1),
  tripId: z.string().min(1),
});

export const bulkAddPlacesSchema = z.object({
  tripId: z.string().min(1),
  placeIds: z.array(z.string().min(1)).min(1),
});

export const bulkRemovePlacesSchema = z.object({
  tripId: z.string().min(1),
  placeIds: z.array(z.string().min(1)).min(1),
});
