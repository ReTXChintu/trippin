import type { PlaceDetail } from "@/modules/places/types/place.types";

export const DEFAULT_PHOTO_MAX_HEIGHT = 640;
export const FULLSCREEN_PHOTO_MAX_HEIGHT = 1200;

export function buildPlacePhotoProxyUrl(
  photoName: string,
  maxHeightPx = DEFAULT_PHOTO_MAX_HEIGHT,
): string {
  return `/api/places/photo?name=${encodeURIComponent(photoName)}&maxHeightPx=${maxHeightPx}`;
}

export function buildPlacePhotoProxyUrls(
  photoNames: string[],
  maxHeightPx = DEFAULT_PHOTO_MAX_HEIGHT,
): string[] {
  return photoNames.map((name) => buildPlacePhotoProxyUrl(name, maxHeightPx));
}

export function hasRichPlaceDetail(detail: PlaceDetail): boolean {
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
