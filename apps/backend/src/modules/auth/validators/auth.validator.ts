import { AI_MODEL_ID_PATTERN } from "@/constants/ai";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
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

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ApiKeysInput = z.infer<typeof apiKeysSchema>;
export type AiSettingsInput = z.infer<typeof aiSettingsSchema>;
