import type { Request, Response } from "express";
import { sendError, sendResult } from "@/lib/response";
import {
  getItineraryForTrip,
  getItineraryRoutes,
  generateItinerary,
  generateItinerarySummary,
  generateLegGuide,
  generateAiCandidate,
  getItineraryComparison,
  keepSystemItinerary,
  keepAiItinerary,
  applyMergedDays,
  movePlaceFromOptional,
  reorderItineraryStops,
  moveItineraryStop,
  updateMealSlot,
  setStopLock,
  addStop,
  updateStop,
  removeStop,
  undoItineraryChange,
  setStopStatus,
  replanFromNow,
  aiEditPlan,
  optimizeDayRoute,
} from "@/modules/itinerary/services/itinerary.service";
import { getMealSuggestions } from "@/modules/itinerary/services/itinerary-meals.service";

export async function get(req: Request, res: Response) {
  const result = await getItineraryForTrip(req.user!.sub, req.params.id);
  return sendResult(res, result, 200);
}

export async function getRoutes(req: Request, res: Response) {
  const result = await getItineraryRoutes(req.user!.sub, {
    tripId: req.params.id,
    legId: req.query.legId,
    dayNumber: req.query.dayNumber,
  });
  return sendResult(res, result, 200);
}

export async function mealSuggestions(req: Request, res: Response) {
  const result = await getMealSuggestions(req.user!.sub, {
    tripId: req.params.id,
    dayNumber: req.query.dayNumber,
    stopId: req.query.stopId,
  });
  return sendResult(res, result, 200);
}

export async function act(req: Request, res: Response) {
  const tripId = req.params.id;
  const body = req.body ?? {};
  const action = body.action ?? "generate";
  const userId = req.user!.sub;

  switch (action) {
    case "generate":
      return sendResult(res, await generateItinerary(userId, { tripId, legId: body.legId }));
    case "summarize":
      return sendResult(res, await generateItinerarySummary(userId, { tripId }));
    case "generateAiCandidate":
      return sendResult(res, await generateAiCandidate(userId, { tripId, legId: body.legId, instructions: body.instructions }));
    case "getComparison":
      return sendResult(res, await getItineraryComparison(userId, { tripId, legId: body.legId }));
    case "keepSystem":
      return sendResult(res, await keepSystemItinerary(userId, { tripId, legId: body.legId }));
    case "keepAi":
      return sendResult(res, await keepAiItinerary(userId, { tripId, legId: body.legId }));
    case "applyMergedDays":
      return sendResult(
        res,
        await applyMergedDays(userId, {
          tripId,
          legId: body.legId,
          days: body.days,
          newlyScheduledFromOptional: body.newlyScheduledFromOptional,
        }),
      );
    case "movePlaceToDay":
      return sendResult(
        res,
        await movePlaceFromOptional(userId, {
          tripId,
          placeId: body.placeId,
          toDayNumber: body.toDayNumber,
          legId: body.legId,
          targetIndex: body.targetIndex,
        }),
      );
    case "generateGuide":
      return sendResult(res, await generateLegGuide(userId, { tripId, legId: body.legId }));
    case "reorder":
      return sendResult(
        res,
        await reorderItineraryStops(userId, {
          tripId,
          dayNumber: body.dayNumber,
          stopIds: body.stopIds,
        }),
      );
    case "moveStop":
      return sendResult(
        res,
        await moveItineraryStop(userId, {
          tripId,
          stopId: body.stopId,
          fromDayNumber: body.fromDayNumber,
          toDayNumber: body.toDayNumber,
          targetIndex: body.targetIndex,
        }),
      );
    case "updateMealSlot":
      return sendResult(
        res,
        await updateMealSlot(userId, {
          tripId,
          dayNumber: body.dayNumber,
          stopId: body.stopId,
          arrivalTime: body.arrivalTime,
          departureTime: body.departureTime,
          placeId: body.placeId,
          clearPlace: body.clearPlace,
        }),
      );
    case "setLock":
      return sendResult(
        res,
        await setStopLock(userId, { tripId, dayNumber: body.dayNumber, stopId: body.stopId, locked: body.locked }),
      );
    case "addStop":
      return sendResult(
        res,
        await addStop(userId, {
          tripId,
          dayNumber: body.dayNumber,
          placeId: body.placeId,
          name: body.name,
          fixedStartTime: body.fixedStartTime,
          durationMinutes: body.durationMinutes,
          notes: body.notes,
        }),
      );
    case "updateStop":
      return sendResult(
        res,
        await updateStop(userId, {
          tripId,
          dayNumber: body.dayNumber,
          stopId: body.stopId,
          durationMinutes: body.durationMinutes,
          fixedStartTime: body.fixedStartTime,
          notes: body.notes,
          cost: body.cost,
        }),
      );
    case "removeStop":
      return sendResult(res, await removeStop(userId, { tripId, dayNumber: body.dayNumber, stopId: body.stopId }));
    case "setStatus":
      return sendResult(
        res,
        await setStopStatus(userId, { tripId, dayNumber: body.dayNumber, stopId: body.stopId, status: body.status ?? null }),
      );
    case "replanFromNow":
      return sendResult(res, await replanFromNow(userId, { tripId, dayNumber: body.dayNumber, time: body.time }));
    case "optimizeDay":
      return sendResult(res, await optimizeDayRoute(userId, { tripId, dayNumber: body.dayNumber }));
    case "aiEdit":
      return sendResult(res, await aiEditPlan(userId, { tripId, instruction: body.instruction }));
    case "undo":
      return sendResult(res, await undoItineraryChange(userId, { tripId }));
    default:
      return sendError(res, "Unknown action", 400);
  }
}
