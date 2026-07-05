import { connectDB } from "@/lib/mongodb";
import mongoose, { Schema, type Document, type Model } from "mongoose";
import { MAX_DAILY_DETAIL_REQUESTS, MAX_DAILY_SEARCHES_PER_USER } from "@/constants/google-places";

export interface IApiUsageDocument extends Document {
  userId: mongoose.Types.ObjectId;
  date: string;
  searchCount: number;
  detailCount: number;
}

const ApiUsageSchema = new Schema<IApiUsageDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    date: { type: String, required: true },
    searchCount: { type: Number, default: 0 },
    detailCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

ApiUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export const ApiUsage: Model<IApiUsageDocument> =
  mongoose.models.ApiUsage ??
  mongoose.model<IApiUsageDocument>("ApiUsage", ApiUsageSchema);

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function checkAndIncrementSearchLimit(userId: string): Promise<boolean> {
  await connectDB();
  const date = todayKey();
  const uid = new mongoose.Types.ObjectId(userId);

  const doc = await ApiUsage.findOneAndUpdate(
    { userId: uid, date },
    { $inc: { searchCount: 1 } },
    { upsert: true, new: true },
  );

  return doc.searchCount <= MAX_DAILY_SEARCHES_PER_USER;
}

export async function checkAndIncrementDetailLimit(userId: string): Promise<boolean> {
  await connectDB();
  const date = todayKey();
  const uid = new mongoose.Types.ObjectId(userId);

  const doc = await ApiUsage.findOneAndUpdate(
    { userId: uid, date },
    { $inc: { detailCount: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const detailCount = doc.detailCount ?? 0;
  return detailCount <= MAX_DAILY_DETAIL_REQUESTS;
}

export async function getRemainingSearches(userId: string): Promise<number> {
  await connectDB();
  const date = todayKey();
  const doc = await ApiUsage.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    date,
  });
  const used = doc?.searchCount ?? 0;
  return Math.max(0, MAX_DAILY_SEARCHES_PER_USER - used);
}
