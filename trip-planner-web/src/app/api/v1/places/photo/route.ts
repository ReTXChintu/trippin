import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { GooglePlacesProvider } from "@/modules/places/services/google-places.provider";
import { PlacePhotoCacheRepository } from "@/repositories/place-photo-cache.repository";
import {
  ApiKeyError,
  assertGoogleMapsKey,
  getOwnerApiKeysForTrip,
  getUserApiKeys,
} from "@/lib/services/trip-api-keys.service";
import { jsonError } from "@/lib/api/response";

export const GET = withAuth(async (request, auth, _context) => {
  const photoName = request.nextUrl.searchParams.get("name");
  const tripId = request.nextUrl.searchParams.get("tripId");
  const maxHeight = request.nextUrl.searchParams.get("maxHeightPx") ?? "400";
  const maxHeightPx = Number.parseInt(maxHeight, 10) || 400;

  if (!photoName) {
    return jsonError("Missing photo name", 400);
  }

  try {
    const cached = await PlacePhotoCacheRepository.find(photoName, maxHeightPx);
    if (cached) {
      return new NextResponse(new Uint8Array(cached.data), {
        headers: {
          "Content-Type": cached.contentType,
          "Cache-Control": "public, max-age=86400",
          "X-Photo-Cache": "hit",
        },
      });
    }

    const keys = tripId
      ? await getOwnerApiKeysForTrip(tripId)
      : await getUserApiKeys(auth.sub);
    assertGoogleMapsKey(keys, tripId ? "trip" : "profile");

    const provider = new GooglePlacesProvider(keys.googleMaps);
    const photoUri = await provider.getPlacePhotoMediaUrl(photoName, maxHeightPx);

    const imageResponse = await fetch(photoUri);
    if (!imageResponse.ok) {
      return jsonError("Failed to fetch image", 502);
    }

    const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    await PlacePhotoCacheRepository.upsert(photoName, maxHeightPx, contentType, buffer);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "X-Photo-Cache": "miss",
      },
    });
  } catch (err) {
    const status = err instanceof ApiKeyError ? 403 : 500;
    return jsonError(err instanceof Error ? err.message : "Photo proxy failed", status);
  }
});
