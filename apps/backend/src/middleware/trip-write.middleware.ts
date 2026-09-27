import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { sendError } from "@/lib/response";
import { TripRepository } from "@/repositories/trip.repository";

/** Things a view-only member may still do on a trip they can see. */
const VIEWER_ALLOWED = [/^\/leave\/?$/, /^\/comments(\/.*)?$/, /^\/votes\/?$/];

/** Mounted on "/trips/:id": view-only members can read everything but not change the trip.
 * (Reads, non-trip paths and unknown trips fall through to the handlers.) */
export async function tripWriteGuard(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  const tripId = req.params.id;
  if (!tripId || !mongoose.isValidObjectId(tripId) || !req.user) return next();
  if (VIEWER_ALLOWED.some((pattern) => pattern.test(req.path))) return next();

  const role = await TripRepository.getRole(tripId, req.user.sub);
  if (role === "viewer") {
    return sendError(res, "You have view-only access to this trip. Ask the owner for edit access.", 403);
  }
  return next();
}
