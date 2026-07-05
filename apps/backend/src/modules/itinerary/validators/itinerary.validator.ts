import { z } from "zod";

export const tripIdSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required"),
});

export const reorderStopsSchema = z.object({
  tripId: z.string().min(1),
  dayNumber: z.number().int().min(1),
  stopIds: z.array(z.string().min(1)).min(1),
});
