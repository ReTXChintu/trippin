import mongoose, { Schema, type Document, type Model } from "mongoose";

export type NotificationType = "trip_member_left" | "trip_member_added";

export interface INotificationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  tripId?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["trip_member_left", "trip_member_added"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    tripId: { type: Schema.Types.ObjectId, ref: "Trip" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification: Model<INotificationDocument> =
  mongoose.models.Notification ??
  mongoose.model<INotificationDocument>("Notification", NotificationSchema);
