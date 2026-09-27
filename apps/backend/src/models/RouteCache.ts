import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IRouteHop {
  distanceMeters: number;
  durationSeconds: number;
}

export interface IRouteCacheDocument extends Document {
  cacheKey: string;
  overviewPolyline: string;
  hops: IRouteHop[];
  fetchedAt: Date;
  expiresAt: Date;
}

const RouteHopSchema = new Schema<IRouteHop>(
  {
    distanceMeters: { type: Number, required: true },
    durationSeconds: { type: Number, required: true },
  },
  { _id: false },
);

const RouteCacheSchema = new Schema<IRouteCacheDocument>(
  {
    cacheKey: { type: String, required: true, unique: true, index: true },
    overviewPolyline: { type: String, required: true },
    hops: { type: [RouteHopSchema], default: [] },
    fetchedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

RouteCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RouteCache: Model<IRouteCacheDocument> =
  mongoose.models.RouteCache ?? mongoose.model<IRouteCacheDocument>("RouteCache", RouteCacheSchema);
