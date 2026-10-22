import { connectDB } from "@/lib/mongodb";
import { PlaceCache, type IPlaceCacheDocument } from "@/models/PlaceCache";
import type { Place, PlaceDetail } from "@/modules/places/types/place.types";
import {
  hasRichPlaceDetail,
  hydratePlaceDetailPhotos,
} from "@/modules/places/utils/photo.utils";
import { toPlainPlace, toPlainPlaceDetail } from "@/modules/places/utils/place.mapper";
import { PLACE_CACHE_TTL_DAYS } from "@/constants/google-places";

function cacheExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PLACE_CACHE_TTL_DAYS);
  return expiresAt;
}

function mergePlaceWithExisting(existing: PlaceDetail, incoming: Place): PlaceDetail {
  const base = toPlainPlace(incoming);
  const prev = toPlainPlaceDetail(existing);
  return {
    ...prev,
    ...base,
    photoNames: prev.photoNames,
    photoUrls: prev.photoUrls,
    weekdayDescriptions: base.weekdayDescriptions ?? prev.weekdayDescriptions,
    openingPeriods: base.openingPeriods ?? prev.openingPeriods,
    reviews: prev.reviews,
    reviewSummary: prev.reviewSummary,
    richVersion: prev.richVersion,
    googleMapsUri: prev.googleMapsUri,
    googleMapsUrl: prev.googleMapsUrl,
    googleSearchUrl: prev.googleSearchUrl,
    websiteUri: prev.websiteUri,
    priceRange: prev.priceRange,
    userRatingCount: prev.userRatingCount ?? base.userRatingCount,
    priceLevel: prev.priceLevel ?? base.priceLevel,
  };
}

export class PlaceCacheRepository {
  static async findByGoogleId(googlePlaceId: string): Promise<Place | null> {
    await connectDB();
    const doc = await PlaceCache.findOne({
      googlePlaceId,
      expiresAt: { $gt: new Date() },
    }).lean();

    return doc?.place ? toPlainPlace(doc.place as Place) : null;
  }

  static async findDetailByGoogleId(googlePlaceId: string): Promise<PlaceDetail | null> {
    await connectDB();
    const doc = await PlaceCache.findOne({
      googlePlaceId,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!doc?.place) return null;

    const detail = toPlainPlaceDetail(doc.place as PlaceDetail);
    if (!hasRichPlaceDetail(detail)) return null;

    return hydratePlaceDetailPhotos(detail);
  }

  static async findByGoogleIds(googlePlaceIds: string[]): Promise<Place[]> {
    if (googlePlaceIds.length === 0) return [];
    await connectDB();
    const docs = await PlaceCache.find({
      googlePlaceId: { $in: googlePlaceIds },
      expiresAt: { $gt: new Date() },
    }).lean();

    const map = new Map(
      docs.map((d) => [d.googlePlaceId, toPlainPlace(d.place as Place)]),
    );
    return googlePlaceIds
      .map((id) => map.get(id))
      .filter((p): p is Place => p !== undefined);
  }

  static async upsert(googlePlaceId: string, place: Place): Promise<Place> {
    await connectDB();
    const existing = await PlaceCache.findOne({ googlePlaceId }).lean();
    const plain = existing?.place
      ? mergePlaceWithExisting(existing.place as PlaceDetail, { ...place, googlePlaceId })
      : toPlainPlace({ ...place, googlePlaceId });

    await PlaceCache.findOneAndUpdate(
      { googlePlaceId },
      {
        googlePlaceId,
        place: plain,
        fetchedAt: new Date(),
        expiresAt: cacheExpiryDate(),
      },
      { upsert: true, new: true },
    );

    return toPlainPlace(plain);
  }

  static async upsertDetail(googlePlaceId: string, detail: PlaceDetail): Promise<PlaceDetail> {
    await connectDB();
    const existing = await PlaceCache.findOne({ googlePlaceId }).lean();
    const plain = toPlainPlaceDetail({
      ...(existing?.place ? toPlainPlace(existing.place as Place) : {}),
      ...detail,
      googlePlaceId,
    });

    await PlaceCache.findOneAndUpdate(
      { googlePlaceId },
      {
        googlePlaceId,
        place: plain,
        fetchedAt: new Date(),
        richFetchedAt: new Date(),
        expiresAt: cacheExpiryDate(),
      },
      { upsert: true, new: true },
    );

    return hydratePlaceDetailPhotos(plain);
  }

  static async upsertMany(places: Place[]): Promise<Place[]> {
    const results: Place[] = [];
    for (const place of places) {
      if (!place.googlePlaceId) continue;
      results.push(await PlaceCacheRepository.upsert(place.googlePlaceId, place));
    }
    return results;
  }
}

export type { IPlaceCacheDocument };
