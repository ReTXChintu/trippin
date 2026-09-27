import type { Request, Response } from "express";
import { sendError, sendOk, sendResult } from "@/lib/response";
import { UserRepository } from "@/repositories/user.repository";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripStatus } from "@/types";
import { generateTripPromptSchema } from "@/modules/trips/validators/trip.validator";
import {
  createTripFromRaw,
  updateTripFromRaw,
  deleteTrip,
  duplicateTrip,
  archiveTrip,
  shareTrip,
  unshareTrip,
  generateTripFromPrompt,
  getTrips,
  getTripById,
  removeLegFromTrip,
} from "@/modules/trips/services/trip.service";

async function enrichTripWithOwnerKeys(trip: Trip) {
  const owner = await UserRepository.findById(trip.userId);
  return {
    ...trip,
    ownerApiKeys: {
      hasOpenaiKey: !!owner?.openaiApiKeyEncrypted,
      hasAiKey: !!(owner?.openaiApiKeyEncrypted || owner?.geminiApiKeyEncrypted),
      hasGoogleMapsKey: !!owner?.googleMapsApiKeyEncrypted,
    },
  };
}

export async function list(req: Request, res: Response) {
  const status = (req.query.status as TripStatus | undefined) ?? undefined;
  const trips = await getTrips(req.user!.sub, status);
  return sendOk(res, { trips });
}

export async function create(req: Request, res: Response) {
  const result = await createTripFromRaw(req.user!.sub, req.body);
  if (!result.success) return sendError(res, result.error, 400);
  return sendOk(res, result.data, 201);
}

export async function getById(req: Request, res: Response) {
  const trip = await getTripById(req.params.id, req.user!.sub);
  if (!trip) return sendError(res, "Trip not found", 404);
  return sendOk(res, { trip: await enrichTripWithOwnerKeys(trip) });
}

export async function update(req: Request, res: Response) {
  const result = await updateTripFromRaw(req.params.id, req.user!.sub, req.body);
  if (!result.success) {
    return sendError(res, result.error, result.error.includes("not found") ? 404 : 400);
  }
  return sendOk(res, result.data);
}

export async function remove(req: Request, res: Response) {
  const result = await deleteTrip(req.params.id, req.user!.sub);
  if (!result.success) {
    return sendError(res, result.error, result.error.includes("owner") ? 403 : 404);
  }
  return sendOk(res, { message: result.message });
}

export async function removeLeg(req: Request, res: Response) {
  const result = await removeLegFromTrip(req.params.id, req.user!.sub, req.params.legId);
  if (!result.success) {
    return sendError(res, result.error, result.error.includes("not found") ? 404 : 400);
  }
  return sendOk(res, result.data);
}

export async function archive(req: Request, res: Response) {
  const result = await archiveTrip(req.params.id, req.user!.sub);
  if (!result.success) return sendError(res, result.error, 404);
  return sendOk(res, result.data);
}

export async function duplicate(req: Request, res: Response) {
  const result = await duplicateTrip(req.params.id, req.user!.sub);
  if (!result.success) return sendError(res, result.error, 404);
  return sendOk(res, result.data, 201);
}

export async function share(req: Request, res: Response) {
  const result = await shareTrip(req.params.id, req.user!.sub);
  if (!result.success) return sendError(res, result.error, 404);
  return sendOk(res, result.data);
}

export async function unshare(req: Request, res: Response) {
  const result = await unshareTrip(req.params.id, req.user!.sub);
  if (!result.success) return sendError(res, result.error, 404);
  return sendOk(res, result.data);
}

export async function generateFromPrompt(req: Request, res: Response) {
  const parsed = generateTripPromptSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.issues[0]?.message ?? "Invalid prompt", 400);
  }

  const result = await generateTripFromPrompt(req.user!.sub, parsed.data.prompt);
  return sendResult(res, result, 201);
}
