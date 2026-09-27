import type { Request, Response } from "express";
import { sendResult } from "@/lib/response";
import { searchHotelsForLeg, updateLegStays } from "@/modules/trips/services/trip-stays.service";

export async function updateStays(req: Request, res: Response) {
  const result = await updateLegStays(req.user!.sub, req.params.id, req.params.legId, req.body ?? {});
  return sendResult(res, result);
}

export async function searchHotels(req: Request, res: Response) {
  const result = await searchHotelsForLeg(req.user!.sub, req.params.id, req.params.legId, req.body ?? {});
  return sendResult(res, result);
}
