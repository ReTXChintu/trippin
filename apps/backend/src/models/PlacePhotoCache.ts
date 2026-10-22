import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IPlacePhotoCacheDocument extends Document {
  key: string;
  photoName: string;
  maxHeightPx: number;
  contentType: string;
  data: Buffer;
  fetchedAt: Date;
  expiresAt: Date;
}

const PlacePhotoCacheSchema = new Schema<IPlacePhotoCacheDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    photoName: { type: String, required: true },
    maxHeightPx: { type: Number, required: true },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true },
    fetchedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

PlacePhotoCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PlacePhotoCache: Model<IPlacePhotoCacheDocument> =
  mongoose.models.PlacePhotoCache ??
  mongoose.model<IPlacePhotoCacheDocument>("PlacePhotoCache", PlacePhotoCacheSchema);
