import { z } from "zod";

export const tripIdSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required"),
  legId: z.string().optional(),
});

export const optimizeDaySchema = z.object({
  tripId: z.string().min(1),
  /** Omit to optimize every day. */
  dayNumber: z.number().int().min(1).optional(),
});

export const aiCandidateSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required"),
  legId: z.string().optional(),
  /** Free-text wishes for the AI ("keep Amber Fort and Hawa Mahal on day 1"). */
  instructions: z.string().trim().max(1000, "Keep instructions under 1000 characters").optional(),
});

export const generateLegGuideSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required"),
  legId: z.string().min(1, "Leg is required"),
});

export const getRoutesSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required"),
  legId: z.string().optional(),
  dayNumber: z.coerce.number().int().min(1).optional(),
});

export const reorderStopsSchema = z.object({
  tripId: z.string().min(1),
  dayNumber: z.number().int().min(1),
  stopIds: z.array(z.string().min(1)).min(1),
});

export const moveStopSchema = z
  .object({
    tripId: z.string().min(1),
    stopId: z.string().min(1),
    fromDayNumber: z.number().int().min(1),
    toDayNumber: z.number().int().min(1),
    targetIndex: z.number().int().min(0).optional(),
  })
  .refine((data) => data.fromDayNumber !== data.toDayNumber, {
    message: "Source and destination day must be different",
    path: ["toDayNumber"],
  });

const timeStringSchema = z.string().regex(/^\d{2}:\d{2}$/, "Invalid time");

export const updateMealSlotSchema = z
  .object({
    tripId: z.string().min(1),
    dayNumber: z.number().int().min(1),
    stopId: z.string().min(1),
    arrivalTime: timeStringSchema.optional(),
    departureTime: timeStringSchema.optional(),
    placeId: z.string().min(1).optional(),
    clearPlace: z.boolean().optional(),
  })
  .refine((data) => !(data.placeId && data.clearPlace), {
    message: "Cannot assign a place and clear it in the same request",
    path: ["placeId"],
  });

const coordinatesSchema = z.object({ lat: z.number(), lng: z.number() });

const visitIntelSchema = z.object({
  bestTime: z.string().optional(),
  avoidTime: z.string().optional(),
  hypeLevel: z.enum(["overhyped", "worth-it", "hidden-gem"]).optional(),
  why: z.string().optional(),
  tips: z.array(z.string()).optional(),
  entryFee: z.string().optional(),
});

const itineraryStopSchema = z.object({
  id: z.string().min(1),
  placeId: z.string(),
  placeName: z.string(),
  sequence: z.number(),
  arrivalTime: z.string(),
  departureTime: z.string(),
  visitDurationMinutes: z.number(),
  travelDurationMinutes: z.number(),
  coordinates: coordinatesSchema.optional(),
  category: z.string().optional(),
  stopType: z.enum(["sight", "transfer", "food", "market", "meal", "return", "activity"]).optional(),
  legId: z.string().optional(),
  notes: z.string().optional(),
  visitIntel: visitIntelSchema.optional(),
  aiNotes: z.string().optional(),
  mealType: z.enum(["breakfast", "lunch", "tiffin", "dinner"]).optional(),
  locked: z.boolean().optional(),
  userAdded: z.boolean().optional(),
  fixedStartTime: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  openingHoursToday: z.string().optional(),
  travelSource: z.enum(["route", "estimate"]).optional(),
  travelDistanceKm: z.number().optional(),
  cost: z.number().optional(),
  status: z.enum(["done", "skipped"]).optional(),
});

const itineraryDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  date: z.string().min(1),
  stops: z.array(itineraryStopSchema),
  legId: z.string().optional(),
  legName: z.string().optional(),
  dayType: z.enum(["sightseeing", "transfer", "free"]).optional(),
  transferLabel: z.string().optional(),
  dressCode: z.string().optional(),
});

export const applyMergedDaysSchema = z.object({
  tripId: z.string().min(1),
  legId: z.string().optional(),
  days: z.array(itineraryDaySchema).min(1),
  newlyScheduledFromOptional: z
    .array(z.object({ date: z.string().min(1), placeId: z.string().min(1) }))
    .optional(),
});

export const movePlaceToDaySchema = z.object({
  tripId: z.string().min(1),
  placeId: z.string().min(1),
  toDayNumber: z.number().int().min(1),
  legId: z.string().optional(),
  /** Position among the day's movable stops (everything except travel/return); omitted = best fit. */
  targetIndex: z.number().int().min(0).optional(),
});

export const setStopLockSchema = z.object({
  tripId: z.string().min(1),
  dayNumber: z.number().int().min(1),
  stopId: z.string().min(1),
  locked: z.boolean(),
});

export const addStopSchema = z
  .object({
    tripId: z.string().min(1),
    dayNumber: z.number().int().min(1),
    /** A Google place to visit — or omit it and give a free-text `name` (e.g. "Cooking class"). */
    placeId: z.string().min(1).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    fixedStartTime: timeStringSchema.optional(),
    durationMinutes: z.number().int().min(10).max(12 * 60).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((data) => data.placeId || data.name, {
    message: "Pick a place or enter a name",
    path: ["name"],
  });

export const updateStopSchema = z.object({
  tripId: z.string().min(1),
  dayNumber: z.number().int().min(1),
  stopId: z.string().min(1),
  durationMinutes: z.number().int().min(5).max(12 * 60).optional(),
  /** null clears a previously fixed time. */
  fixedStartTime: timeStringSchema.nullable().optional(),
  notes: z.string().max(1000).optional(),
  /** null clears the cost. */
  cost: z.number().min(0).max(10_000_000).nullable().optional(),
});

export const removeStopSchema = z.object({
  tripId: z.string().min(1),
  dayNumber: z.number().int().min(1),
  stopId: z.string().min(1),
});

export const mealSuggestionsSchema = z.object({
  tripId: z.string().min(1),
  dayNumber: z.coerce.number().int().min(1),
  stopId: z.string().min(1),
});

export const setStopStatusSchema = z.object({
  tripId: z.string().min(1),
  dayNumber: z.number().int().min(1),
  stopId: z.string().min(1),
  /** null = back to planned */
  status: z.enum(["done", "skipped"]).nullable(),
});

export const aiEditPlanSchema = z.object({
  tripId: z.string().min(1),
  instruction: z.string().trim().min(3, "Tell the AI what to change").max(500, "Keep it under 500 characters"),
});

export const replanFromNowSchema = z.object({
  tripId: z.string().min(1),
  dayNumber: z.number().int().min(1),
  /** HH:mm — the traveller's current local time at the destination. */
  time: timeStringSchema,
});
