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
