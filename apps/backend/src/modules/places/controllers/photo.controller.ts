import type { Request, Response } from "express";
import { GooglePlacesProvider } from "@/modules/places/services/google-places.provider";
import { PlacePhotoCacheRepository } from "@/repositories/place-photo-cache.repository";
import {
  ApiKeyError,
  assertGoogleMapsKey,
  getOwnerApiKeysForTrip,
  getUserApiKeys,
} from "@/lib/services/trip-api-keys.service";
import { sendError } from "@/lib/response";

export async function getPhoto(req: Request, res: Response) {
  const photoName = req.query.name as string | undefined;
  const tripId = req.query.tripId as string | undefined;
  const maxHeightPx = Number.parseInt((req.query.maxHeightPx as string) ?? "400", 10) || 400;

  if (!photoName) {
    return sendError(res, "Missing photo name", 400);
  }

  try {
    const cached = await PlacePhotoCacheRepository.find(photoName, maxHeightPx);
    if (cached) {
      res.set({
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=86400",
        "X-Photo-Cache": "hit",
      });
      return res.send(cached.data);
    }

    const keys = tripId ? await getOwnerApiKeysForTrip(tripId) : await getUserApiKeys(req.user!.sub);
    assertGoogleMapsKey(keys, tripId ? "trip" : "profile");

    const provider = new GooglePlacesProvider(keys.googleMaps);
    const photoUri = await provider.getPlacePhotoMediaUrl(photoName, maxHeightPx);

    const imageResponse = await fetch(photoUri);
    if (!imageResponse.ok) {
      return sendError(res, "Failed to fetch image", 502);
    }

    const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    await PlacePhotoCacheRepository.upsert(photoName, maxHeightPx, contentType, buffer);

    res.set({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "X-Photo-Cache": "miss",
    });
    return res.send(buffer);
  } catch (err) {
    const status = err instanceof ApiKeyError ? 403 : 500;
    return sendError(res, err instanceof Error ? err.message : "Photo proxy failed", status);
  }
}
