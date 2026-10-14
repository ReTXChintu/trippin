import { UserRepository } from "@/repositories/user.repository";
import { encryptApiKey, maskApiKeyLast4 } from "@/lib/crypto/api-key-crypto";
import type { AiSettingsInput, ApiKeysInput } from "@/modules/auth/validators/auth.validator";
import { apiKeysFromUser, resolveAiProvider, serverApiKeys } from "@/lib/services/trip-api-keys.service";
import { listAvailableModels, type AiModelOption } from "@/modules/ai/services/llm-client";
import { DEFAULT_AI_MODELS, type AiProviderName } from "@/constants/ai";

export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

export async function getProfile(userId: string) {
  const user = await UserRepository.findById(userId);
  if (!user) {
    return null;
  }
  const server = serverApiKeys();

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    preferences: user.preferences,
    hasOpenaiKey: !!user.openaiApiKeyEncrypted,
    hasGeminiKey: !!user.geminiApiKeyEncrypted,
    hasGoogleMapsKey: !!user.googleMapsApiKeyEncrypted,
    openaiApiKeyLast4: user.openaiApiKeyLast4,
    geminiApiKeyLast4: user.geminiApiKeyLast4,
    googleMapsApiKeyLast4: user.googleMapsApiKeyLast4,
    /** Keys this server provides for everyone — used when the user hasn't added their own. */
    serverKeys: { openai: !!server.openai, gemini: !!server.gemini },
    ai: {
      /** What the user picked (may be unset). */
      preferredProvider: user.aiProvider ?? null,
      /** What actually runs, given which keys exist. */
      activeProvider: resolveAiProvider({
        aiProvider: user.aiProvider,
        openai: user.openaiApiKeyEncrypted || server.openai,
        gemini: user.geminiApiKeyEncrypted || server.gemini,
      }),
      openaiModel: user.openaiModel || DEFAULT_AI_MODELS.openai,
      geminiModel: user.geminiModel || DEFAULT_AI_MODELS.gemini,
    },
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
  const { openaiApiKey, geminiApiKey, googleMapsApiKey, clearOpenai, clearGemini, clearGoogleMaps } = input;

  try {
    if (clearOpenai) {
      await UserRepository.clearOpenAiKey(userId);
    } else if (openaiApiKey?.trim()) {
      await UserRepository.updateApiKeys(userId, {
        openaiApiKeyEncrypted: encryptApiKey(openaiApiKey.trim()),
        openaiApiKeyLast4: maskApiKeyLast4(openaiApiKey),
      });
    }

    if (clearGemini) {
      await UserRepository.clearGeminiKey(userId);
    } else if (geminiApiKey?.trim()) {
      await UserRepository.updateApiKeys(userId, {
        geminiApiKeyEncrypted: encryptApiKey(geminiApiKey.trim()),
        geminiApiKeyLast4: maskApiKeyLast4(geminiApiKey),
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

export async function updateAiSettings(userId: string, input: AiSettingsInput): Promise<ActionResult> {
  const user = await UserRepository.findById(userId);
  if (!user) return { success: false, error: "Profile not found" };

  if (input.aiProvider) {
    const hasKey = input.aiProvider === "openai" ? user.openaiApiKeyEncrypted : user.geminiApiKeyEncrypted;
    if (!hasKey) {
      return {
        success: false,
        error: `Add a${input.aiProvider === "openai" ? "n OpenAI" : " Gemini"} API key before choosing it.`,
      };
    }
  }

  await UserRepository.updateAiSettings(userId, input);
  return { success: true, message: "AI settings saved" };
}

export async function listAiModels(
  userId: string,
  provider: AiProviderName,
): Promise<ActionResult<{ models: AiModelOption[]; live: boolean }>> {
  const user = await UserRepository.findById(userId);
  if (!user) return { success: false, error: "Profile not found" };

  const keys = apiKeysFromUser(user);
  const apiKey = provider === "openai" ? keys.openai : keys.gemini;
  if (!apiKey) {
    return { success: false, error: `Add a${provider === "openai" ? "n OpenAI" : " Gemini"} API key first.` };
  }

  return { success: true, data: await listAvailableModels(provider, apiKey) };
}
