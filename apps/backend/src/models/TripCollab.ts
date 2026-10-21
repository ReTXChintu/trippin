import mongoose, { Schema, type Document, type Model } from "mongoose";

/** A shareable "join this trip" link. */
export interface ITripInviteDocument extends Document {
  token: string;
  tripId: mongoose.Types.ObjectId;
  role: "editor" | "viewer";
  createdBy: mongoose.Types.ObjectId;
  expiresAt: Date;
  revoked: boolean;
  uses: number;
  createdAt: Date;
}

const TripInviteSchema = new Schema<ITripInviteDocument>(
  {
    token: { type: String, required: true, unique: true, index: true },
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    role: { type: String, enum: ["editor", "viewer"], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
    uses: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const TripInvite: Model<ITripInviteDocument> =
  mongoose.models.TripInvite ?? mongoose.model<ITripInviteDocument>("TripInvite", TripInviteSchema);

/**
 * Someone added by email who has no Trippin account yet (they may exist only in the identity
 * server). Claimed — turned into trip membership — when they first sign in with that verified email.
 */
export interface IPendingTripMemberDocument extends Document {
  tripId: mongoose.Types.ObjectId;
  /** Lower-cased. */
  email: string;
  role: "editor" | "viewer";
  invitedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PendingTripMemberSchema = new Schema<IPendingTripMemberDocument>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ["editor", "viewer"], default: "editor" },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

PendingTripMemberSchema.index({ tripId: 1, email: 1 }, { unique: true });

export const PendingTripMember: Model<IPendingTripMemberDocument> =
  mongoose.models.PendingTripMember ??
  mongoose.model<IPendingTripMemberDocument>("PendingTripMember", PendingTripMemberSchema);

export const COMMENT_TARGETS = ["trip", "stop", "place"] as const;
export type CommentTarget = (typeof COMMENT_TARGETS)[number];

/** A comment on the trip, a planned stop, or a place. */
export interface ITripCommentDocument extends Document {
  tripId: mongoose.Types.ObjectId;
  targetType: CommentTarget;
  /** stop id / google place id; "" for the trip itself. */
  targetId: string;
  /** Human label of what was commented on, e.g. "Hawa Mahal" — for notifications and lists. */
  targetLabel?: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  text: string;
  createdAt: Date;
}

const TripCommentSchema = new Schema<ITripCommentDocument>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    targetType: { type: String, enum: COMMENT_TARGETS, required: true },
    targetId: { type: String, default: "" },
    targetLabel: { type: String, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

TripCommentSchema.index({ tripId: 1, createdAt: 1 });

export const TripComment: Model<ITripCommentDocument> =
  mongoose.models.TripComment ?? mongoose.model<ITripCommentDocument>("TripComment", TripCommentSchema);
