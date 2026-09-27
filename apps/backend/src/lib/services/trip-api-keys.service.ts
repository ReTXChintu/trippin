import { UserRepository } from "@/repositories/user.repository";
import { TripRepository } from "@/repositories/trip.repository";
import { decryptApiKey } from "@/lib/crypto/api-key-crypto";
import { DEFAULT_AI_MODELS, type AiProviderName } from "@/constants/ai";
import type { AiConfig } from "@/modules/ai/types/ai-provider.types";
import type { IUserDocument } from "@/models/User";
import type { Trip } from "@/modules/trips/types/trip.types";

export interface UserApiKeys {
  openai?: string;
  gemini?: string;
  googleMaps?: string;
  /** The provider the user picked in Profile (unset = whichever key they have). */
  aiProvider?: AiProviderName;
  openaiModel?: string;
  geminiModel?: string;
}

export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyError";
  }
}

function decryptOrUndefined(encrypted?: string): string | undefined {
  if (!encrypted) return undefined;
  try {
    return decryptApiKey(encrypted);
  } catch {
    return undefined; // corrupt key — treat as not configured
  }
}

export function apiKeysFromUser(user: IUserDocument): UserApiKeys {
  return {
    openai: decryptOrUndefined(user.openaiApiKeyEncrypted),
    gemini: decryptOrUndefined(user.geminiApiKeyEncrypted),
    googleMaps: decryptOrUndefined(user.googleMapsApiKeyEncrypted),
    aiProvider: user.aiProvider,
    openaiModel: user.openaiModel,
    geminiModel: user.geminiModel,
  };
}

export async function getUserApiKeys(userId: string): Promise<UserApiKeys> {
  const user = await UserRepository.findById(userId);
  return user ? apiKeysFromUser(user) : {};
}

export async function getOwnerApiKeysForTrip(tripId: string): Promise<UserApiKeys> {
  const trip = await TripRepository.findById(tripId);
  if (!trip) return {};
  return getUserApiKeys(trip.userId.toString());
}

export async function getOwnerApiKeysForTripDto(trip: Trip): Promise<UserApiKeys> {
  return getUserApiKeys(trip.userId);
}

/** Which AI provider actually runs: the one the user picked if its key is set, otherwise whichever
 * key they do have (OpenAI first). Null when neither key is configured. */
export function resolveAiProvider(
  keys: Pick<UserApiKeys, "aiProvider" | "openai" | "gemini">,
): AiProviderName | null {
  const has = (p: AiProviderName) => Boolean((p === "openai" ? keys.openai : keys.gemini)?.trim());
  if (keys.aiProvider && has(keys.aiProvider)) return keys.aiProvider;
  if (has("openai")) return "openai";
  if (has("gemini")) return "gemini";
  return null;
}

export function resolveAiConfig(keys: UserApiKeys): AiConfig | null {
  const provider = resolveAiProvider(keys);
  if (!provider) return null;
  return provider === "openai"
    ? { provider, apiKey: keys.openai!.trim(), model: keys.openaiModel || DEFAULT_AI_MODELS.openai }
    : { provider, apiKey: keys.gemini!.trim(), model: keys.geminiModel || DEFAULT_AI_MODELS.gemini };
}

export function assertGoogleMapsKey(
  keys: UserApiKeys,
  context: "trip" | "profile" = "trip",
): asserts keys is UserApiKeys & { googleMaps: string } {
  if (!keys.googleMaps?.trim()) {
    throw new ApiKeyError(
      context === "trip"
        ? "Trip owner must add a Google Maps API key in Profile before using place discovery."
        : "Add a Google Maps API key in Profile to use place search and discovery.",
    );
  }
}

/** The AI config to use, or an ApiKeyError telling the user which key is missing. */
export function requireAiConfig(keys: UserApiKeys, context: "trip" | "profile" = "trip"): AiConfig {
  const config = resolveAiConfig(keys);
  if (!config) {
    throw new ApiKeyError(
      context === "trip"
        ? "Trip owner must add an OpenAI or Gemini API key in Profile before using AI features."
        : "Add an OpenAI or Gemini API key in Profile to use AI features.",
    );
  }
  return config;
}
