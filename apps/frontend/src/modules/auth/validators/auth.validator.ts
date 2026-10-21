import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  avatar: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export const apiKeysSchema = z.object({
  openaiApiKey: z.string().optional(),
  geminiApiKey: z.string().optional(),
  googleMapsApiKey: z.string().optional(),
  clearOpenai: z.boolean().optional(),
  clearGemini: z.boolean().optional(),
  clearGoogleMaps: z.boolean().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type ApiKeysInput = z.infer<typeof apiKeysSchema>;
