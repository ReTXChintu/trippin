import { UserRepository } from "@/repositories/user.repository";
import { encryptApiKey, maskApiKeyLast4 } from "@/lib/crypto/api-key-crypto";
import type { ApiKeysInput } from "@/modules/auth/validators/auth.validator";

export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

export async function getProfile(userId: string) {
  const user = await UserRepository.findById(userId);
  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    preferences: user.preferences,
    hasOpenaiKey: !!user.openaiApiKeyEncrypted,
    hasGoogleMapsKey: !!user.googleMapsApiKeyEncrypted,
    openaiApiKeyLast4: user.openaiApiKeyLast4,
    googleMapsApiKeyLast4: user.googleMapsApiKeyLast4,
  };
}

export async function updateProfile(
  userId: string,
  data: { name: string; avatar?: string },
): Promise<ActionResult> {
  await UserRepository.updateProfile(userId, {
    name: data.name,
    avatar: data.avatar || undefined,
  });

  return { success: true, message: "Profile updated successfully" };
}

export async function updateApiKeys(
  userId: string,
  input: ApiKeysInput,
): Promise<ActionResult> {
  const { openaiApiKey, googleMapsApiKey, clearOpenai, clearGoogleMaps } = input;

  try {
    if (clearOpenai) {
      await UserRepository.clearOpenAiKey(userId);
    } else if (openaiApiKey?.trim()) {
      await UserRepository.updateApiKeys(userId, {
        openaiApiKeyEncrypted: encryptApiKey(openaiApiKey.trim()),
        openaiApiKeyLast4: maskApiKeyLast4(openaiApiKey),
      });
    }

    if (clearGoogleMaps) {
      await UserRepository.clearGoogleMapsKey(userId);
    } else if (googleMapsApiKey?.trim()) {
      await UserRepository.updateApiKeys(userId, {
        googleMapsApiKeyEncrypted: encryptApiKey(googleMapsApiKey.trim()),
        googleMapsApiKeyLast4: maskApiKeyLast4(googleMapsApiKey),
      });
    }

    return { success: true, message: "API keys updated successfully" };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update API keys",
    };
  }
}
