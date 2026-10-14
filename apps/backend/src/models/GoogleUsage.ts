import mongoose, { Schema, type Document, type Model } from "mongoose";

/** Google Maps calls Trippin made with one key on one day (Pacific time, like Google's billing). */
export interface IGoogleUsageDocument extends Document {
  /** Hash of the key — the key itself is never stored here. */
  keyHash: string;
  /** YYYY-MM-DD */
  date: string;
  /** SKU id → calls. */
  counts: Map<string, number>;
}

const GoogleUsageSchema = new Schema<IGoogleUsageDocument>(
  {
    keyHash: { type: String, required: true },
    date: { type: String, required: true },
    counts: { type: Map, of: Number, default: {} },
  },
  { timestamps: true },
);

GoogleUsageSchema.index({ keyHash: 1, date: 1 }, { unique: true });

export const GoogleUsage: Model<IGoogleUsageDocument> =
  mongoose.models.GoogleUsage ?? mongoose.model<IGoogleUsageDocument>("GoogleUsage", GoogleUsageSchema);
