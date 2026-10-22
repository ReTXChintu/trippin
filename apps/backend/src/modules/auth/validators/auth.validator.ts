import { AI_MODEL_ID_PATTERN } from "@/constants/ai";
import { z } from "zod";

/** The Android app's sign-in: the ID token flutter_appauth got from the identity server. */
export const oidcMobileSchema = z.object({
  idToken: z.string().min(1).max(20000),
});

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

const aiModelIdSchema = z.string().trim().regex(AI_MODEL_ID_PATTERN, "Invalid model name");

export const aiSettingsSchema = z.object({
  aiProvider: z.enum(["openai", "gemini"]).optional(),
  openaiModel: aiModelIdSchema.optional(),
  geminiModel: aiModelIdSchema.optional(),
});

export const aiModelsQuerySchema = z.object({ provider: z.enum(["openai", "gemini"]) });

export type ProfileInput = z.infer<typeof profileSchema>;
export type ApiKeysInput = z.infer<typeof apiKeysSchema>;
export type AiSettingsInput = z.infer<typeof aiSettingsSchema>;
