import mongoose, { Schema, type Document, type Model } from "mongoose";
import { SUITE_APPS, SUITE_EVENT_TYPES, type SuiteApp, type SuiteEvent, type SuiteEventType } from "@/modules/suite/types/suite.types";

/**
 * Events waiting to be delivered to SpendLog / InFrame. Written in the request that changes the
 * trip, delivered by the outbox worker with retries; per (app, trip) strictly in order.
 */
export interface ISuiteOutboxDocument extends Document {
  /** The event's own id — the receiver is idempotent on it. */
  eventId: string;
  app: SuiteApp;
  tripId: string;
  type: SuiteEventType;
  /** The exact body to POST (the trip as it was when the event happened). */
  payload: SuiteEvent;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  nextAttemptAt: Date;
  lastError?: string;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SuiteOutboxSchema = new Schema<ISuiteOutboxDocument>(
  {
    eventId: { type: String, required: true, unique: true },
    app: { type: String, enum: SUITE_APPS, required: true },
    tripId: { type: String, required: true },
    type: { type: String, enum: SUITE_EVENT_TYPES, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["pending", "delivered", "failed"], default: "pending" },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, required: true },
    lastError: { type: String },
    deliveredAt: { type: Date },
  },
  { timestamps: true },
);

SuiteOutboxSchema.index({ status: 1, createdAt: 1 });
SuiteOutboxSchema.index({ app: 1, tripId: 1, createdAt: 1 });
// Delivered events are kept a month for debugging, then dropped.
SuiteOutboxSchema.index({ deliveredAt: 1 }, { expireAfterSeconds: 30 * 86_400 });

export const SuiteOutbox: Model<ISuiteOutboxDocument> =
  mongoose.models.SuiteOutbox ?? mongoose.model<ISuiteOutboxDocument>("SuiteOutbox", SuiteOutboxSchema);
