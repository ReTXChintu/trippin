import { createHash } from "crypto";
import { connectDB } from "@/lib/mongodb";
import { PlacePhotoCache, type IPlacePhotoCacheDocument } from "@/models/PlacePhotoCache";
import { PLACE_CACHE_TTL_DAYS } from "@/constants/google-places";

export function buildPhotoCacheKey(photoName: string, maxHeightPx: number): string {
  return createHash("sha256").update(`${photoName}|${maxHeightPx}`).digest("hex");
}

export class PlacePhotoCacheRepository {
  static async find(
    photoName: string,
    maxHeightPx: number,
  ): Promise<{ contentType: string; data: Buffer } | null> {
    await connectDB();
    const key = buildPhotoCacheKey(photoName, maxHeightPx);
    const doc = await PlacePhotoCache.findOne({
      key,
      expiresAt: { $gt: new Date() },
    }).lean<IPlacePhotoCacheDocument>();

    if (!doc?.data) return null;
    return {
      contentType: doc.contentType,
      data: Buffer.from(doc.data.buffer),
    };
  }

  static async upsert(
    photoName: string,
    maxHeightPx: number,
    contentType: string,
    data: Buffer,
  ): Promise<void> {
    await connectDB();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + PLACE_CACHE_TTL_DAYS);

    await PlacePhotoCache.findOneAndUpdate(
      { key: buildPhotoCacheKey(photoName, maxHeightPx) },
      {
        key: buildPhotoCacheKey(photoName, maxHeightPx),
        photoName,
        maxHeightPx,
        contentType,
        data,
        fetchedAt: new Date(),
        expiresAt,
      },
      { upsert: true },
    );
  }
}

export type { IPlacePhotoCacheDocument };
