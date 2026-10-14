import { api } from "@/lib/api";
import type { IUser } from "@/types";

export type AiProviderName = "openai" | "gemini";

export interface ProfileDTO extends IUser {
  hasOpenaiKey: boolean;
  hasGeminiKey: boolean;
  hasGoogleMapsKey: boolean;
  openaiApiKeyLast4?: string;
  geminiApiKeyLast4?: string;
  googleMapsApiKeyLast4?: string;
  /** Shared keys the server provides when the user hasn't added their own. */
  serverKeys?: { openai: boolean; gemini: boolean; googleMaps: boolean };
  ai: {
    preferredProvider: AiProviderName | null;
    /** What actually runs given the keys present; null = no AI key. */
    activeProvider: AiProviderName | null;
    openaiModel: string;
    geminiModel: string;
  };
}

export interface AiModelOption {
  id: string;
  label: string;
  note?: string;
  recommended: boolean;
}

export interface GoogleUsageLine {
  sku: string;
  label: string;
  tier: string;
  today: number;
  month: number;
  freePerMonth: number;
  usdPer1000: number;
  estimatedUsd: number;
}

export interface GoogleUsage {
  /** Whose key the user's trips run on. */
  source: "own" | "server" | "none";
  month: string;
  today: string;
  lines: GoogleUsageLine[];
  estimatedUsd: number;
  pricing: { sku: string; label: string; tier: string; freePerMonth: number; usdPer1000: number }[];
}

export async function getGoogleUsage(): Promise<GoogleUsage> {
  const res = await api.get("/profile/google-usage");
  return res.data.data;
}

export async function getProfile(): Promise<{ profile: ProfileDTO }> {
  const res = await api.get("/profile");
  return res.data.data;
}

export async function updateProfile(data: {
  name: string;
  avatar?: string;
}): Promise<{ profile: ProfileDTO; message: string }> {
  const res = await api.patch("/profile", data);
  return res.data.data;
}

export async function updateApiKeys(data: {
  openaiApiKey?: string;
  geminiApiKey?: string;
  googleMapsApiKey?: string;
  clearOpenai?: boolean;
  clearGemini?: boolean;
  clearGoogleMaps?: boolean;
}): Promise<{ profile: ProfileDTO; message: string }> {
  const res = await api.put("/profile/api-keys", data);
  return res.data.data;
}

export async function updateAiSettings(data: {
  aiProvider?: AiProviderName;
  openaiModel?: string;
  geminiModel?: string;
}): Promise<{ profile: ProfileDTO; message: string }> {
  const res = await api.put("/profile/ai-settings", data);
  return res.data.data;
}

export async function listAiModels(provider: AiProviderName): Promise<{ models: AiModelOption[]; live: boolean }> {
  const res = await api.get("/profile/ai-models", { params: { provider } });
  return res.data.data;
}
