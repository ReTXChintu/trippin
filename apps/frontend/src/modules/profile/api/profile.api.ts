import { api } from "@/lib/api";
import type { IUser } from "@/types";

export interface ProfileDTO extends IUser {
  hasOpenaiKey: boolean;
  hasGoogleMapsKey: boolean;
  openaiApiKeyLast4?: string;
  googleMapsApiKeyLast4?: string;
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
  googleMapsApiKey?: string;
  clearOpenai?: boolean;
  clearGoogleMaps?: boolean;
}): Promise<{ profile: ProfileDTO; message: string }> {
  const res = await api.put("/profile/api-keys", data);
  return res.data.data;
}
