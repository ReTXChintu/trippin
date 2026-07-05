import { UserRepository } from "@/repositories/user.repository";
import { TripRepository } from "@/repositories/trip.repository";
import { decryptApiKey } from "@/lib/crypto/api-key-crypto";
import type { Trip } from "@/modules/trips/types/trip.types";

export interface UserApiKeys {
  openai?: string;
  googleMaps?: string;
}

export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyError";
  }
}

export async function getUserApiKeys(userId: string): Promise<UserApiKeys> {
  const user = await UserRepository.findById(userId);
  if (!user) return {};

  const keys: UserApiKeys = {};
  if (user.openaiApiKeyEncrypted) {
    try {
      keys.openai = decryptApiKey(user.openaiApiKeyEncrypted);
    } catch {
      /* ignore corrupt key */
    }
  }
  if (user.googleMapsApiKeyEncrypted) {
    try {
      keys.googleMaps = decryptApiKey(user.googleMapsApiKeyEncrypted);
    } catch {
      /* ignore corrupt key */
    }
  }
  return keys;
}

export async function getOwnerApiKeysForTrip(tripId: string): Promise<UserApiKeys> {
  const trip = await TripRepository.findById(tripId);
  if (!trip) return {};
  return getUserApiKeys(trip.userId.toString());
}

export async function getOwnerApiKeysForTripDto(trip: Trip): Promise<UserApiKeys> {
  return getUserApiKeys(trip.userId);
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

export function assertOpenAiKey(
  keys: UserApiKeys,
  context: "trip" | "profile" = "trip",
): asserts keys is UserApiKeys & { openai: string } {
  if (!keys.openai?.trim()) {
    throw new ApiKeyError(
      context === "trip"
        ? "Trip owner must add an OpenAI API key in Profile before using AI features."
        : "Add an OpenAI API key in Profile to use AI features.",
    );
  }
}
