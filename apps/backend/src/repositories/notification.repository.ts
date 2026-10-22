import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Notification, type INotificationDocument, type NotificationType } from "@/models/Notification";

export interface NotificationDTO {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  tripId?: string;
  read: boolean;
  createdAt: string;
}

function toDTO(doc: INotificationDocument): NotificationDTO {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    type: doc.type,
    title: doc.title,
    message: doc.message,
    tripId: doc.tripId?.toString(),
    read: doc.read,
    createdAt: doc.createdAt.toISOString(),
  };
}

export class NotificationRepository {
  static async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    tripId?: string;
  }): Promise<NotificationDTO> {
    await connectDB();
    const doc = await Notification.create({
      userId: new mongoose.Types.ObjectId(data.userId),
      type: data.type,
      title: data.title,
      message: data.message,
      tripId: data.tripId ? new mongoose.Types.ObjectId(data.tripId) : undefined,
    });
    return toDTO(doc);
  }

  static async findForUser(userId: string, limit = 20): Promise<NotificationDTO[]> {
    await connectDB();
    const docs = await Notification.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return docs.map((doc) => toDTO(doc as unknown as INotificationDocument));
  }

  static async countUnread(userId: string): Promise<number> {
    await connectDB();
    return Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      read: false,
    });
  }

  static async markRead(id: string, userId: string): Promise<boolean> {
    await connectDB();
    const result = await Notification.updateOne(
      { _id: id, userId: new mongoose.Types.ObjectId(userId) },
      { read: true },
    );
    return result.modifiedCount > 0;
  }

  static async markAllRead(userId: string): Promise<void> {
    await connectDB();
    await Notification.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), read: false },
      { read: true },
    );
  }
}
