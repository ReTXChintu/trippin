import { connectDB } from "@/lib/mongodb";
import mongoose, { Schema, type Document, type Model } from "mongoose";
import { dailyDetailLimit, dailySearchLimit } from "@/constants/google-places";

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

/** Counts one call and says whether it's allowed. Once over the cap, refused calls aren't counted,
 * so raising the cap in .env takes effect the same day. */
async function checkAndIncrement(userId: string, field: "searchCount" | "detailCount", limit: number): Promise<boolean> {
  if (limit === 0) return true;
  await connectDB();
  const filter = { userId: new mongoose.Types.ObjectId(userId), date: todayKey() };
  const bump = () => ApiUsage.findOneAndUpdate({ ...filter, [field]: { $not: { $gte: limit } } }, { $inc: { [field]: 1 } }, { new: true });
  if (await bump()) return true;
  // No row yet today (or the cap is reached) — create the row if it's missing.
  try {
    await ApiUsage.create({ ...filter, [field]: 1 });
    return true;
  } catch {
    // Another request created it first: try once more against that row.
    return Boolean(await bump());
  }
}

export function checkAndIncrementSearchLimit(userId: string): Promise<boolean> {
  return checkAndIncrement(userId, "searchCount", dailySearchLimit());
}

export function checkAndIncrementDetailLimit(userId: string): Promise<boolean> {
  return checkAndIncrement(userId, "detailCount", dailyDetailLimit());
}

export async function getRemainingSearches(userId: string): Promise<number> {
  await connectDB();
  const date = todayKey();
  const doc = await ApiUsage.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    date,
  });
  const used = doc?.searchCount ?? 0;
  const limit = dailySearchLimit();
  return limit === 0 ? Number.POSITIVE_INFINITY : Math.max(0, limit - used);
}
