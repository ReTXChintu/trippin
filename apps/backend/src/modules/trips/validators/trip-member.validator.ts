import { z } from "zod";

export const addTripMemberSchema = z.object({
  tripId: z.string().min(1),
  email: z.string().email("Enter a valid email address"),
});

export const removeTripMemberSchema = z.object({
  tripId: z.string().min(1),
  memberUserId: z.string().min(1),
});

export const tripMemberTripIdSchema = z.object({
  tripId: z.string().min(1),
});
