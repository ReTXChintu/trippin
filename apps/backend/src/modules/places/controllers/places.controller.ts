import type { Request, Response } from "express";
import { sendError, sendOk, sendResult } from "@/lib/response";
import { searchCities } from "@/modules/places/services/city-lookup.service";
import {
  searchPlaces,
  searchHotels,
  getPlaceDetails,
  getPlaceDetailRich,
} from "@/modules/places/services/places-actions.service";

export async function search(req: Request, res: Response) {
  const type = (req.query.type as string | undefined) ?? "places";

  const input = {
    query: (req.query.query as string) ?? "",
    city: (req.query.city as string) ?? undefined,
    country: (req.query.country as string) ?? undefined,
    sessionToken: (req.query.sessionToken as string) ?? undefined,
    lat: req.query.lat ? Number(req.query.lat) : undefined,
    lng: req.query.lng ? Number(req.query.lng) : undefined,
    areas: (req.query.areas as string) ?? undefined,
    radiusKm: req.query.radiusKm ? Number(req.query.radiusKm) : undefined,
  };

  const result = type === "hotels" ? await searchHotels(req.user!.sub, input) : await searchPlaces(req.user!.sub, input);
  return sendResult(res, result);
}

export async function cities(req: Request, res: Response) {
  try {
    return sendOk(res, { cities: await searchCities(String(req.query.q ?? "")) });
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : "City search failed", 502);
  }
}

export async function getDetailRich(req: Request, res: Response) {
  const { tripId, placeId } = req.body ?? {};
  if (!tripId || !placeId) {
    return sendError(res, "tripId and placeId are required", 400);
  }
  const result = await getPlaceDetailRich(req.user!.sub, tripId, placeId);
  return sendResult(res, result);
}

export async function getDetails(req: Request, res: Response) {
  const input = {
    placeId: req.query.placeId as string | undefined,
    city: req.query.city as string | undefined,
    state: req.query.state as string | undefined,
    country: req.query.country as string | undefined,
  };
  const result = await getPlaceDetails(req.user!.sub, input);
  return sendResult(res, result);
}
