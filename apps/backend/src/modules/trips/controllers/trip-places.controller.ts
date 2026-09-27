import type { Request, Response } from "express";
import { sendError, sendResult } from "@/lib/response";
import {
  getTripDiscoveryPool,
  getTripSelectedPlaces,
  getTripEatShopPool,
  addPlaceToTrip,
  removePlaceFromTrip,
  bulkAddPlacesToTrip,
  bulkRemovePlacesFromTrip,
  addPlaceFromSearch,
  discoverPlacesForTrip,
  discoverVehicleRentalsForLeg,
  searchAreaForLeg,
} from "@/modules/places/services/places-actions.service";

export async function list(req: Request, res: Response) {
  const tripId = req.params.id;
  const view = (req.query.view as string | undefined) ?? "selected";

  if (view === "pool") {
    return sendResult(res, await getTripDiscoveryPool(req.user!.sub, tripId));
  }
  if (view === "eat-shop") {
    return sendResult(res, await getTripEatShopPool(req.user!.sub, tripId));
  }

  const legId = req.query.legId as string | undefined;
  if (!legId) {
    return sendError(res, "legId query param is required", 400);
  }
  return sendResult(res, await getTripSelectedPlaces(req.user!.sub, tripId, legId));
}

export async function add(req: Request, res: Response) {
  const tripId = req.params.id;
  const body = req.body ?? {};

  if (!body.legId) {
    return sendError(res, "legId is required", 400);
  }

  if (body.action === "bulkAdd" && Array.isArray(body.placeIds)) {
    const result = await bulkAddPlacesToTrip(req.user!.sub, {
      tripId,
      legId: body.legId,
      placeIds: body.placeIds,
    });
    return sendResult(res, result);
  }

  if (body.placeId) {
    const result = await addPlaceToTrip(req.user!.sub, { tripId, legId: body.legId, placeId: body.placeId });
    return sendResult(res, result);
  }

  return sendError(res, "placeId or bulkAdd action required", 400);
}

export async function remove(req: Request, res: Response) {
  const tripId = req.params.id;
  const legId = req.query.legId as string | undefined;
  const placeId = req.query.placeId as string | undefined;
  const placeIdsParam = req.query.placeIds as string | undefined;

  if (!legId) {
    return sendError(res, "legId query param is required", 400);
  }

  if (placeIdsParam) {
    const placeIds = placeIdsParam.split(",").filter(Boolean);
    const result = await bulkRemovePlacesFromTrip(req.user!.sub, { tripId, legId, placeIds });
    return sendResult(res, result);
  }

  if (!placeId) {
    return sendError(res, "placeId query param is required", 400);
  }

  const result = await removePlaceFromTrip(req.user!.sub, { tripId, legId, placeId });
  return sendResult(res, result);
}

export async function addFromSearch(req: Request, res: Response) {
  const tripId = req.params.id;
  const legId = req.body?.legId as string | undefined;
  if (!legId) {
    return sendError(res, "legId is required", 400);
  }
  const result = await addPlaceFromSearch(req.user!.sub, { tripId, legId, placeId: req.body?.placeId });
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

export async function discoverVehicleRentals(req: Request, res: Response) {
  const tripId = req.params.id;
  const legId = req.body?.legId as string | undefined;
  if (!legId) {
    return sendError(res, "legId is required", 400);
  }
  const result = await discoverVehicleRentalsForLeg(req.user!.sub, { tripId, legId });
  return sendResult(res, result);
}

export async function searchArea(req: Request, res: Response) {
  const result = await searchAreaForLeg(req.user!.sub, req.params.id, req.body ?? {});
  return sendResult(res, result);
}
