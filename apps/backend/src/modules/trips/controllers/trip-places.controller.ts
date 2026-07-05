import type { Request, Response } from "express";
import { sendError, sendResult } from "@/lib/response";
import {
  getTripDiscoveryPool,
  getTripSelectedPlaces,
  addPlaceToTrip,
  removePlaceFromTrip,
  bulkAddPlacesToTrip,
  bulkRemovePlacesFromTrip,
  addPlaceFromSearch,
  discoverPlacesForTrip,
} from "@/modules/places/services/places-actions.service";

export async function list(req: Request, res: Response) {
  const tripId = req.params.id;
  const view = (req.query.view as string | undefined) ?? "selected";

  const result =
    view === "pool"
      ? await getTripDiscoveryPool(req.user!.sub, tripId)
      : await getTripSelectedPlaces(req.user!.sub, tripId);
  return sendResult(res, result);
}

export async function add(req: Request, res: Response) {
  const tripId = req.params.id;
  const body = req.body ?? {};

  if (body.action === "bulkAdd" && Array.isArray(body.placeIds)) {
    const result = await bulkAddPlacesToTrip(req.user!.sub, { tripId, placeIds: body.placeIds });
    return sendResult(res, result);
  }

  if (body.placeId) {
    const result = await addPlaceToTrip(req.user!.sub, { tripId, placeId: body.placeId });
    return sendResult(res, result);
  }

  return sendError(res, "placeId or bulkAdd action required", 400);
}

export async function remove(req: Request, res: Response) {
  const tripId = req.params.id;
  const placeId = req.query.placeId as string | undefined;
  const placeIdsParam = req.query.placeIds as string | undefined;

  if (placeIdsParam) {
    const placeIds = placeIdsParam.split(",").filter(Boolean);
    const result = await bulkRemovePlacesFromTrip(req.user!.sub, { tripId, placeIds });
    return sendResult(res, result);
  }

  if (!placeId) {
    return sendError(res, "placeId query param is required", 400);
  }

  const result = await removePlaceFromTrip(req.user!.sub, { tripId, placeId });
  return sendResult(res, result);
}

export async function addFromSearch(req: Request, res: Response) {
  const tripId = req.params.id;
  const result = await addPlaceFromSearch(req.user!.sub, { tripId, placeId: req.body?.placeId });
  return sendResult(res, result);
}

export async function discover(req: Request, res: Response) {
  const tripId = req.params.id;
  const body = req.body ?? {};
  const result = await discoverPlacesForTrip(req.user!.sub, {
    tripId,
    forceRefresh: body.forceRefresh ?? false,
    legId: body.legId,
  });
  return sendResult(res, result);
}
