import { randomBytes } from "crypto";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { COMMENT_TARGETS, PendingTripMember, TripComment, TripInvite, type ITripCommentDocument } from "@/models/TripCollab";
import { Trip as TripModel } from "@/models/Trip";
import { NotificationRepository } from "@/repositories/notification.repository";
import { TripRepository } from "@/repositories/trip.repository";
import { UserRepository } from "@/repositories/user.repository";
import type { Trip } from "@/modules/trips/types/trip.types";
import { emitTripEvent } from "@/modules/suite/services/suite-events.service";

type Result<T> = { success: true; data: T; message?: string } | { success: false; error: string };

const INVITE_TTL_DAYS = 14;
const oid = (id: string) => new mongoose.Types.ObjectId(id);

function frontendUrl(): string {
  return (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/$/, "");
}

// ---------------------------------------------------------------------------------------------
// Invite links
// ---------------------------------------------------------------------------------------------

export interface InviteLink {
  role: "editor" | "viewer";
  url: string;
  expiresAt: string;
  uses: number;
}

/** Owners and editors can hand out links. One live link per role; `reset` replaces it. */
export async function getOrCreateInvite(userId: string, tripId: string, raw: unknown): Promise<Result<InviteLink>> {
  const parsed = z.object({ role: z.enum(["editor", "viewer"]), reset: z.boolean().optional() }).safeParse(raw);
  if (!parsed.success) return { success: false, error: "Pick editor or viewer" };

  const role = await TripRepository.getRole(tripId, userId);
  if (role !== "owner" && role !== "editor") return { success: false, error: "Only the owner or editors can invite people" };

  await connectDB();
  const filter = { tripId: oid(tripId), role: parsed.data.role, revoked: false, expiresAt: { $gt: new Date() } };
  if (parsed.data.reset) await TripInvite.updateMany(filter, { revoked: true });

  let invite = parsed.data.reset ? null : await TripInvite.findOne(filter).sort({ createdAt: -1 });
  if (!invite) {
    invite = await TripInvite.create({
      token: randomBytes(18).toString("base64url"),
      tripId: oid(tripId),
      role: parsed.data.role,
      createdBy: oid(userId),
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
    });
  }

  return {
    success: true,
    data: {
      role: invite.role,
      url: `${frontendUrl()}/invite/${invite.token}`,
      expiresAt: invite.expiresAt.toISOString(),
      uses: invite.uses,
    },
  };
}

async function liveInvite(token: string) {
  await connectDB();
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) return null;
  return TripInvite.findOne({ token, revoked: false, expiresAt: { $gt: new Date() } });
}

export interface InvitePreview {
  tripId: string;
  tripTitle: string;
  invitedBy: string;
  role: "editor" | "viewer";
  /** False for anonymous viewers — they log in first. */
  alreadyMember: boolean;
  dates: string;
  startDate: string;
  endDate: string;
  /** Base cities in visiting order. */
  route: string[];
  /** Owner plus members. */
  travellers: number;
  expiresAt: string;
}

/** What an invite link leads to. Public: the unguessable token is the permission to see this much. */
export async function previewInvite(userId: string | null, token: string): Promise<Result<InvitePreview>> {
  const invite = await liveInvite(token);
  if (!invite) return { success: false, error: "This invite link has expired or was reset. Ask for a new one." };
  const trip = await TripModel.findById(invite.tripId)
    .select({ title: 1, userId: 1, memberIds: 1, startDate: 1, endDate: 1, legs: 1, destinationCity: 1 })
    .lean();
  if (!trip) return { success: false, error: "This trip no longer exists" };
  const inviter = await UserRepository.findById(String(invite.createdBy));
  const alreadyMember = userId !== null && (String(trip.userId) === userId || (trip.memberIds ?? []).some((id) => String(id) === userId));
  const legs = [...(trip.legs ?? [])].sort((a, b) => a.order - b.order);
  const start = new Date(trip.startDate).toISOString().slice(0, 10);
  const end = new Date(trip.endDate).toISOString().slice(0, 10);
  return {
    success: true,
    data: {
      tripId: String(trip._id),
      tripTitle: trip.title,
      invitedBy: inviter?.name ?? "Someone",
      role: invite.role,
      alreadyMember,
      dates: `${start} → ${end}`,
      startDate: start,
      endDate: end,
      route: legs.length > 0 ? legs.map((l) => l.baseCity).filter(Boolean) : [trip.destinationCity].filter(Boolean),
      travellers: 1 + (trip.memberIds ?? []).length,
      expiresAt: invite.expiresAt.toISOString(),
    },
  };
}

export async function acceptInvite(userId: string, token: string): Promise<Result<{ tripId: string }>> {
  const invite = await liveInvite(token);
  if (!invite) return { success: false, error: "This invite link has expired or was reset. Ask for a new one." };
  const tripId = String(invite.tripId);

  const existingRole = await TripRepository.getRole(tripId, userId);
  if (existingRole) return { success: true, data: { tripId }, message: "You're already on this trip" };

  const update: Record<string, unknown> = { $addToSet: { memberIds: oid(userId) } };
  if (invite.role === "viewer") (update.$addToSet as Record<string, unknown>).viewerIds = oid(userId);
  const trip = await TripModel.findByIdAndUpdate(tripId, update, { returnDocument: "after" }).select({ title: 1, userId: 1 }).lean();
  if (!trip) return { success: false, error: "This trip no longer exists" };
  await TripInvite.updateOne({ _id: invite._id }, { $inc: { uses: 1 } });
  await emitTripEvent(tripId, "trip.members_changed");

  const joiner = await UserRepository.findById(userId);
  await NotificationRepository.create({
    userId: String(trip.userId),
    type: "trip_member_joined",
    title: `${joiner?.name ?? "Someone"} joined your trip`,
    message: `${joiner?.name ?? "Someone"} joined "${trip.title}" with an invite link (${invite.role === "viewer" ? "view only" : "can edit"}).`,
    tripId,
  });

  return { success: true, data: { tripId }, message: `You joined "${trip.title}"` };
}

// ---------------------------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------------------------

export async function votePlace(userId: string, tripId: string, raw: unknown): Promise<Result<{ trip: Trip }>> {
  const parsed = z.object({ placeId: z.string().min(1).max(200), voted: z.boolean() }).safeParse(raw);
  if (!parsed.success) return { success: false, error: "Invalid vote" };
  const trip = await TripRepository.setVote(tripId, userId, parsed.data.placeId, parsed.data.voted);
  if (!trip) return { success: false, error: "Trip not found" };
  return { success: true, data: { trip } };
}

// ---------------------------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------------------------

export interface CommentDTO {
  id: string;
  targetType: (typeof COMMENT_TARGETS)[number];
  targetId: string;
  targetLabel?: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

function toComment(doc: ITripCommentDocument): CommentDTO {
  return {
    id: String(doc._id),
    targetType: doc.targetType,
    targetId: doc.targetId,
    targetLabel: doc.targetLabel,
    userId: String(doc.userId),
    userName: doc.userName,
    text: doc.text,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}

export async function listComments(userId: string, tripId: string): Promise<Result<{ comments: CommentDTO[] }>> {
  if (!(await TripRepository.getRole(tripId, userId))) return { success: false, error: "Trip not found" };
  await connectDB();
  const docs = await TripComment.find({ tripId: oid(tripId) }).sort({ createdAt: 1 }).limit(1000);
  return { success: true, data: { comments: docs.map(toComment) } };
}

const commentSchema = z.object({
  targetType: z.enum(COMMENT_TARGETS),
  targetId: z.string().max(200).default(""),
  targetLabel: z.string().trim().max(120).optional(),
  text: z.string().trim().min(1, "Write something").max(2000),
});

export async function addComment(userId: string, tripId: string, raw: unknown): Promise<Result<{ comment: CommentDTO }>> {
  const parsed = commentSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid comment" };
  if (!(await TripRepository.getRole(tripId, userId))) return { success: false, error: "Trip not found" };

  const user = await UserRepository.findById(userId);
  await connectDB();
  const doc = await TripComment.create({ ...parsed.data, tripId: oid(tripId), userId: oid(userId), userName: user?.name ?? "Someone" });

  // Let everyone else on the trip know.
  const trip = await TripModel.findById(tripId).select({ title: 1, userId: 1, memberIds: 1 }).lean();
  if (trip) {
    const others = [String(trip.userId), ...(trip.memberIds ?? []).map(String)].filter((id) => id !== userId);
    const about = parsed.data.targetLabel ? ` on ${parsed.data.targetLabel}` : "";
    const preview = parsed.data.text.length > 140 ? `${parsed.data.text.slice(0, 140)}…` : parsed.data.text;
    await Promise.all(
      others.map((id) =>
        NotificationRepository.create({
          userId: id,
          type: "trip_comment",
          title: `${doc.userName} commented${about}`,
          message: `"${preview}" — ${trip.title}`,
          tripId,
        }),
      ),
    );
  }

  return { success: true, data: { comment: toComment(doc) } };
}

export async function deleteComment(userId: string, tripId: string, commentId: string): Promise<Result<{ id: string }>> {
  if (!mongoose.isValidObjectId(commentId)) return { success: false, error: "Comment not found" };
  const role = await TripRepository.getRole(tripId, userId);
  if (!role) return { success: false, error: "Trip not found" };
  await connectDB();
  // Your own comments, or any comment if you own the trip.
  const filter: Record<string, unknown> = { _id: oid(commentId), tripId: oid(tripId) };
  if (role !== "owner") filter.userId = oid(userId);
  const res = await TripComment.deleteOne(filter);
  if (res.deletedCount === 0) return { success: false, error: "Comment not found" };
  return { success: true, data: { id: commentId } };
}

export async function deleteCollabDataForTrip(tripId: string): Promise<void> {
  if (!mongoose.isValidObjectId(tripId)) return;
  await connectDB();
  await Promise.all([
    TripComment.deleteMany({ tripId: oid(tripId) }),
    TripInvite.deleteMany({ tripId: oid(tripId) }),
    PendingTripMember.deleteMany({ tripId: oid(tripId) }),
  ]);
}
