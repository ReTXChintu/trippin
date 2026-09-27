import type { PlaceDetail } from "@/modules/places/types/place.types";

export const DEFAULT_PHOTO_MAX_HEIGHT = 640;
export const FULLSCREEN_PHOTO_MAX_HEIGHT = 1200;

function backendBaseUrl(): string {
  return process.env.BACKEND_URL ?? "http://localhost:4000";
}

export function buildPlacePhotoProxyUrl(
  photoName: string,
  maxHeightPx = DEFAULT_PHOTO_MAX_HEIGHT,
): string {
  return `${backendBaseUrl()}/api/v1/places/photo?name=${encodeURIComponent(photoName)}&maxHeightPx=${maxHeightPx}`;
}

export function buildPlacePhotoProxyUrls(
  photoNames: string[],
  maxHeightPx = DEFAULT_PHOTO_MAX_HEIGHT,
): string[] {
  return photoNames.map((name) => buildPlacePhotoProxyUrl(name, maxHeightPx));
}

/** Current rich-detail field set version (v2 added reviews + review summary). */
export const RICH_DETAIL_VERSION = 2;

export function hasRichPlaceDetail(detail: PlaceDetail): boolean {
  if ((detail.richVersion ?? 1) < RICH_DETAIL_VERSION) return false;
  return Boolean(
    detail.photoNames?.length ||
      detail.photoUrls?.length ||
      detail.weekdayDescriptions?.length ||
      detail.googleMapsUrl ||
      detail.googleMapsUri,
  );
}

export function hydratePlaceDetailPhotos(
  detail: PlaceDetail,
  maxHeightPx = DEFAULT_PHOTO_MAX_HEIGHT,
): PlaceDetail {
  if (!detail.photoNames?.length) {
    return detail;
  }

  const photoUrls = buildPlacePhotoProxyUrls(detail.photoNames, maxHeightPx);
  return {
    ...detail,
    photoUrls,
    imageUrl: photoUrls[0],
  };
}
