import type { Request, Response } from "express";
import { sendError, sendOk } from "@/lib/response";
import {
  getTripMembers,
  addTripMember,
  removeTripMember,
  removePendingTripMember,
  leaveTrip,
} from "@/modules/trips/services/trip-members.service";

export async function list(req: Request, res: Response) {
  const result = await getTripMembers(req.params.id, req.user!.sub);
  if (!result.success) return sendError(res, result.error, 404);
  return sendOk(res, result.data);
}

export async function add(req: Request, res: Response) {
  const result = await addTripMember(req.params.id, req.user!.sub, req.body.email);
  if (!result.success) return sendError(res, result.error, 400);
  return sendOk(res, result.data);
}

export async function remove(req: Request, res: Response) {
  // ?email= withdraws an invite to someone who hasn't signed in yet.
  const email = req.query.email;
  if (typeof email === "string" && email) {
    const result = await removePendingTripMember(req.params.id, req.user!.sub, email);
    if (!result.success) return sendError(res, result.error, 400);
    return sendOk(res, result.data);
  }
  const memberUserId = req.query.memberUserId as string | undefined;
  if (!memberUserId) {
    return sendError(res, "memberUserId or email query param is required", 400);
  }
  const result = await removeTripMember(req.params.id, req.user!.sub, memberUserId);
  if (!result.success) return sendError(res, result.error, 400);
  return sendOk(res, result.data);
}

export async function leave(req: Request, res: Response) {
  const result = await leaveTrip(req.params.id, req.user!.sub);
  if (!result.success) return sendError(res, result.error, 400);
  return sendOk(res, { message: result.message });
}
