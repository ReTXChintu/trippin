import type { Request, Response } from "express";
import { sendError, sendOk, sendResult } from "@/lib/response";
import {
  aiModelsQuerySchema,
  aiSettingsSchema,
  apiKeysSchema,
  profileSchema,
} from "@/modules/auth/validators/auth.validator";
import {
  getProfile,
  listAiModels,
  updateAiSettings,
  updateApiKeys,
  updateProfile,
} from "@/modules/profile/services/profile.service";
import { getGoogleUsageSummary } from "@/modules/profile/services/google-usage.service";
import { getUserApiKeys } from "@/lib/services/trip-api-keys.service";
import { UserRepository } from "@/repositories/user.repository";

export async function getProfileHandler(req: Request, res: Response) {
  const profile = await getProfile(req.user!.sub);
  if (!profile) {
    return sendError(res, "Profile not found", 404);
  }
  return sendOk(res, { profile });
}

export async function updateProfileHandler(req: Request, res: Response) {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const result = await updateProfile(req.user!.sub, parsed.data);
  if (!result.success) {
    return sendError(res, result.error, 400);
  }

  const profile = await getProfile(req.user!.sub);
  return sendOk(res, { profile, message: result.message });
}

export async function updateApiKeysHandler(req: Request, res: Response) {
  const parsed = apiKeysSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const result = await updateApiKeys(req.user!.sub, parsed.data);
  if (!result.success) {
    return sendError(res, result.error, 400);
  }

  const profile = await getProfile(req.user!.sub);
  return sendOk(res, { profile, message: result.message });
}

export async function updateAiSettingsHandler(req: Request, res: Response) {
  const parsed = aiSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const result = await updateAiSettings(req.user!.sub, parsed.data);
  if (!result.success) {
    return sendError(res, result.error, 400);
  }

  const profile = await getProfile(req.user!.sub);
  return sendOk(res, { profile, message: result.message });
}

export async function listAiModelsHandler(req: Request, res: Response) {
  const parsed = aiModelsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, parsed.error.issues[0]?.message ?? "Invalid provider", 400);
  }
  return sendResult(res, await listAiModels(req.user!.sub, parsed.data.provider));
}

/** This month's Google Maps calls made with the key the user's trips run on. */
export async function googleUsageHandler(req: Request, res: Response) {
  const user = await UserRepository.findById(req.user!.sub);
  const keys = await getUserApiKeys(req.user!.sub);
  const source = user?.googleMapsApiKeyEncrypted ? "own" : "none";
  const usage = await getGoogleUsageSummary(keys.googleMaps);
  return sendOk(res, { source, ...usage });
}
