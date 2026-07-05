import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { GooglePlacesProvider } from "@/modules/places/services/google-places.provider";
import { PlacePhotoCacheRepository } from "@/repositories/place-photo-cache.repository";
import {
  ApiKeyError,
  assertGoogleMapsKey,
  getOwnerApiKeysForTrip,
  getUserApiKeys,
} from "@/lib/services/trip-api-keys.service";

/** Proxy place photos so the browser can load them without exposing the API key. */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const photoName = request.nextUrl.searchParams.get("name");
  const tripId = request.nextUrl.searchParams.get("tripId");
  const maxHeight = request.nextUrl.searchParams.get("maxHeightPx") ?? "400";
  const maxHeightPx = Number.parseInt(maxHeight, 10) || 400;

  if (!photoName) {
    return NextResponse.json({ error: "Missing photo name" }, { status: 400 });
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
      : await getUserApiKeys(session.user.id);
    assertGoogleMapsKey(keys, tripId ? "trip" : "profile");

    const provider = new GooglePlacesProvider(keys.googleMaps);
    const photoUri = await provider.getPlacePhotoMediaUrl(photoName, maxHeightPx);

    const imageResponse = await fetch(photoUri);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Photo proxy failed" },
      { status },
    );
  }
}
