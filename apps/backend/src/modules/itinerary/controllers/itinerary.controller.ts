import type { Request, Response } from "express";
import { sendError, sendResult } from "@/lib/response";
import {
  getItineraryForTrip,
  generateItinerary,
  generateItinerarySummary,
  optimizeItinerary,
  enrichItinerary,
  reorderItineraryStops,
} from "@/modules/itinerary/services/itinerary.service";

export async function get(req: Request, res: Response) {
  const result = await getItineraryForTrip(req.user!.sub, req.params.id);
  return sendResult(res, result, 200);
}

export async function act(req: Request, res: Response) {
  const tripId = req.params.id;
  const body = req.body ?? {};
  const action = body.action ?? "generate";
  const userId = req.user!.sub;

  switch (action) {
    case "generate":
      return sendResult(res, await generateItinerary(userId, { tripId }));
    case "summarize":
      return sendResult(res, await generateItinerarySummary(userId, { tripId }));
    case "optimize":
      return sendResult(res, await optimizeItinerary(userId, { tripId }));
    case "enrich":
      return sendResult(res, await enrichItinerary(userId, { tripId }));
    case "reorder":
      return sendResult(
        res,
        await reorderItineraryStops(userId, {
          tripId,
          dayNumber: body.dayNumber,
          stopIds: body.stopIds,
        }),
      );
    default:
      return sendError(res, "Unknown action", 400);
  }
}
