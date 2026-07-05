import type { Request, Response } from "express";
import { sendError, sendOk } from "@/lib/response";
import { profileSchema, apiKeysSchema } from "@/modules/auth/validators/auth.validator";
import { getProfile, updateProfile, updateApiKeys } from "@/modules/profile/services/profile.service";

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
