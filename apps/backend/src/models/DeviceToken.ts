import mongoose, { Schema, type Document, type Model } from "mongoose";

/** A phone's Firebase Cloud Messaging token, for push notifications to its signed-in user. */
export interface IDeviceTokenDocument extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  platform: string;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceTokenSchema = new Schema<IDeviceTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // One owner per token: a phone signed in as someone else moves to them.
    token: { type: String, required: true, unique: true },
    platform: { type: String, default: "android" },
    lastSeenAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

export const DeviceToken: Model<IDeviceTokenDocument> =
  mongoose.models.DeviceToken ?? mongoose.model<IDeviceTokenDocument>("DeviceToken", DeviceTokenSchema);
