import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { PlaceDetail } from "@/modules/places/types/place.types";

export interface IPlaceCacheDocument extends Document {
  googlePlaceId: string;
  place: PlaceDetail;
  fetchedAt: Date;
  richFetchedAt?: Date;
  expiresAt: Date;
}

const PlaceSchema = new Schema(
  {
    googlePlaceId: String,
    name: String,
    city: String,
    state: String,
    country: String,
    category: String,
    subCategory: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
    averageVisitDurationMinutes: Number,
    openingTime: String,
    closingTime: String,
    weeklyClosedDays: [String],
    description: String,
    tags: [String],
    rating: Number,
    userRatingCount: Number,
    imageUrl: String,
    recommendedVisitTime: String,
    bestSeason: String,
    entryFee: String,
    priceLevel: String,
    isMustVisit: Boolean,
    source: String,
    formattedAddress: String,
    weekdayDescriptions: [String],
    // Mixed rather than nested schemas: these mirror Google payloads verbatim and are only ever
    // read back whole, never queried.
    openingPeriods: { type: [Schema.Types.Mixed], default: undefined },
    reviews: { type: [Schema.Types.Mixed], default: undefined },
    reviewSummary: String,
    richVersion: Number,
    priceRange: String,
    websiteUri: String,
    googleMapsUri: String,
    googleMapsUrl: String,
    googleSearchUrl: String,
    photoNames: [String],
    photoUrls: [String],
  },
  { _id: false },
);

const PlaceCacheSchema = new Schema<IPlaceCacheDocument>(
  {
    googlePlaceId: { type: String, required: true, unique: true, index: true },
    place: { type: PlaceSchema, required: true },
    fetchedAt: { type: Date, default: Date.now },
    richFetchedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

PlaceCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PlaceCache: Model<IPlaceCacheDocument> =
  mongoose.models.PlaceCache ??
  mongoose.model<IPlaceCacheDocument>("PlaceCache", PlaceCacheSchema);
