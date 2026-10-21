import type { Request, Response } from "express";
import { sendError, sendOk } from "@/lib/response";
import { getTripLinks, setTripLinks } from "@/modules/suite/services/suite-links.service";

/** GET /trips/:id/links — link status per app, live summaries, and promos. */
export async function get(req: Request, res: Response) {
  const result = await getTripLinks(req.params.id, req.user!.sub);
  if (!result.success) return sendError(res, result.error, 404);
  return sendOk(res, result.data);
}

/** PATCH /trips/:id/links { spendlog?: bool, inframe?: bool } — owner only. */
export async function update(req: Request, res: Response) {
  const result = await setTripLinks(req.params.id, req.user!.sub, req.body);
  if (!result.success) {
    const status = result.error.includes("not found") ? 404 : result.error.startsWith("Only the trip owner") ? 403 : 400;
    return sendError(res, result.error, status);
  }
  return sendOk(res, result.data);
}
