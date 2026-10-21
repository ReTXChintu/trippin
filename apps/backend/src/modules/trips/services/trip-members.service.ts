import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { isTripOwner } from "@/lib/trip-access";
import { Trip as TripModel } from "@/models/Trip";
import { PendingTripMember as PendingTripMemberModel } from "@/models/TripCollab";
import type { PendingTripMember, TripMember } from "@/modules/trips/types/trip-member.types";
import {
  addTripMemberSchema,
  removeTripMemberSchema,
} from "@/modules/trips/validators/trip-member.validator";
import { NotificationRepository } from "@/repositories/notification.repository";
import { TripRepository } from "@/repositories/trip.repository";
import { UserRepository } from "@/repositories/user.repository";
import {
  sendTripInviteEmail,
  sendTripMemberAddedEmail,
  sendTripMemberLeftEmail,
} from "@/services/email.service";
import { emitTripEvent } from "@/modules/suite/services/suite-events.service";

export type TripMemberActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

export type TripMembersData = { members: TripMember[]; pending: PendingTripMember[]; invited?: boolean };

export async function buildMemberList(ownerId: string, memberIds: string[], viewerIds: string[] = []): Promise<TripMember[]> {
  const owner = await UserRepository.findById(ownerId);
  const members: TripMember[] = [];

  if (owner) {
    members.push({
      id: owner._id.toString(),
      name: owner.name,
      email: owner.email,
      role: "owner",
    });
  }

  for (const memberId of memberIds) {
    const user = await UserRepository.findById(memberId);
    if (user) {
      members.push({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: viewerIds.includes(memberId) ? "viewer" : "editor",
      });
    }
  }

  return members;
}

export async function getTripMembers(
  tripId: string,
  userId: string,
): Promise<TripMemberActionResult<TripMembersData>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const members = await buildMemberList(trip.userId, trip.memberIds, trip.viewerIds);
  return { success: true, data: { members, pending: await listPendingMembers(tripId) } };
}

/** People added by email who haven't signed in to Trippin yet. */
export async function listPendingMembers(tripId: string): Promise<PendingTripMember[]> {
  if (!mongoose.isValidObjectId(tripId)) return [];
  await connectDB();
  const docs = await PendingTripMemberModel.find({ tripId: new mongoose.Types.ObjectId(tripId) }).sort({ createdAt: 1 }).lean();
  return docs.map((d) => ({ email: d.email, role: d.role, invitedAt: new Date(d.createdAt).toISOString() }));
}

export async function addTripMember(
  tripId: string,
  userId: string,
  email: string,
): Promise<TripMemberActionResult<TripMembersData>> {
  const parsed = addTripMemberSchema.safeParse({ tripId, email });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const adder = await UserRepository.findById(userId);
  const targetUser = await UserRepository.findByEmail(normalizedEmail);

  if (!targetUser) {
    // Not on Trippin yet (they may only have an account on the identity server): remember the
    // invite; it's claimed when they first sign in with this email, verified.
    await connectDB();
    await PendingTripMemberModel.updateOne(
      { tripId: new mongoose.Types.ObjectId(tripId), email: normalizedEmail },
      { $setOnInsert: { role: "editor", invitedBy: new mongoose.Types.ObjectId(userId) } },
      { upsert: true },
    );
    await sendTripInviteEmail({
      toEmail: normalizedEmail,
      tripTitle: trip.title,
      tripId: trip.id,
      addedByName: adder?.name ?? "Someone",
    });
    const members = await buildMemberList(trip.userId, trip.memberIds, trip.viewerIds);
    return {
      success: true,
      data: { members, pending: await listPendingMembers(tripId), invited: true },
      message: `Invite sent to ${normalizedEmail}`,
    };
  }

  const targetId = targetUser._id.toString();
  if (targetId === trip.userId || trip.memberIds.includes(targetId)) {
    return { success: false, error: "This user is already on the trip" };
  }

  const updated = await TripRepository.addMember(tripId, userId, targetId);
  if (!updated) return { success: false, error: "Failed to add member" };
  await emitTripEvent(tripId, "trip.members_changed");

  await sendTripMemberAddedEmail({
    toEmail: targetUser.email,
    toName: targetUser.name,
    tripTitle: trip.title,
    tripId: trip.id,
    addedByName: adder?.name ?? "Someone",
  });

  const members = await buildMemberList(updated.userId, updated.memberIds, updated.viewerIds);

  return {
    success: true,
    data: { members, pending: await listPendingMembers(tripId) },
    message: `${targetUser.name} added to the trip`,
  };
}

/** Withdraws an email invite that hasn't been claimed yet: the owner, or whoever sent it. */
export async function removePendingTripMember(
  tripId: string,
  userId: string,
  email: string,
): Promise<TripMemberActionResult<TripMembersData>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  await connectDB();
  const filter: Record<string, unknown> = { tripId: new mongoose.Types.ObjectId(tripId), email: email.trim().toLowerCase() };
  if (!isTripOwner(trip, userId)) filter.invitedBy = new mongoose.Types.ObjectId(userId);
  const res = await PendingTripMemberModel.deleteOne(filter);
  if (res.deletedCount === 0) return { success: false, error: "Invite not found" };

  const members = await buildMemberList(trip.userId, trip.memberIds, trip.viewerIds);
  return { success: true, data: { members, pending: await listPendingMembers(tripId) }, message: "Invite withdrawn" };
}

/**
 * Turns the email invites for `email` into trip membership. Runs at every sign-in, and only with
 * an email the identity server has verified. Returns the ids of the trips joined.
 */
export async function claimPendingMemberships(userId: string, email: string): Promise<string[]> {
  await connectDB();
  const pending = await PendingTripMemberModel.find({ email: email.trim().toLowerCase() });
  if (pending.length === 0) return [];

  const joiner = await UserRepository.findById(userId);
  const who = joiner?.name ?? email;
  const uid = new mongoose.Types.ObjectId(userId);
  const joined: string[] = [];

  for (const invite of pending) {
    const trip = await TripModel.findById(invite.tripId).select({ title: 1, userId: 1, memberIds: 1 }).lean();
    const onTrip = trip && (String(trip.userId) === userId || (trip.memberIds ?? []).some((id) => String(id) === userId));
    if (trip && !onTrip) {
      const addToSet: Record<string, unknown> = { memberIds: uid };
      if (invite.role === "viewer") addToSet.viewerIds = uid;
      await TripModel.updateOne({ _id: invite.tripId }, { $addToSet: addToSet });
      joined.push(String(invite.tripId));
      await emitTripEvent(String(invite.tripId), "trip.members_changed");

      await NotificationRepository.create({
        userId: String(trip.userId),
        type: "trip_member_joined",
        title: `${who} joined your trip`,
        message: `${who} (${email}) signed in to Trippin and joined "${trip.title}".`,
        tripId: String(invite.tripId),
      });
    }
    await PendingTripMemberModel.deleteOne({ _id: invite._id });
  }

  return joined;
}

export async function removeTripMember(
  tripId: string,
  userId: string,
  memberUserId: string,
): Promise<TripMemberActionResult<TripMembersData>> {
  const parsed = removeTripMemberSchema.safeParse({ tripId, memberUserId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  if (trip.userId === memberUserId) {
    return { success: false, error: "The trip owner cannot be removed" };
  }
  if (!isTripOwner(trip, userId)) {
    return { success: false, error: "Only the trip owner can remove people (you can leave the trip yourself)" };
  }

  const updated = await TripRepository.removeMember(tripId, userId, memberUserId);
  if (!updated) return { success: false, error: "Failed to remove member" };
  await emitTripEvent(tripId, "trip.members_changed");

  const members = await buildMemberList(updated.userId, updated.memberIds, updated.viewerIds);
  return { success: true, data: { members, pending: await listPendingMembers(tripId) }, message: "Member removed" };
}

export async function leaveTrip(tripId: string, userId: string): Promise<TripMemberActionResult> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  if (isTripOwner(trip, userId)) {
    return { success: false, error: "Trip owners cannot leave their own trip. Delete it instead." };
  }

  const leaver = await UserRepository.findById(userId);
  const owner = await UserRepository.findById(trip.userId);
  if (!leaver) return { success: false, error: "User not found" };

  const updated = await TripRepository.leaveTrip(tripId, userId);
  if (!updated) return { success: false, error: "Failed to leave trip" };
  await emitTripEvent(tripId, "trip.members_changed");

  if (owner) {
    await NotificationRepository.create({
      userId: owner._id.toString(),
      type: "trip_member_left",
      title: `${leaver.name} left your trip`,
      message: `${leaver.name} (${leaver.email}) left "${trip.title}".`,
      tripId: trip.id,
    });

    await sendTripMemberLeftEmail({
      toEmail: owner.email,
      toName: owner.name,
      tripTitle: trip.title,
      tripId: trip.id,
      memberName: leaver.name,
      memberEmail: leaver.email,
    });
  }

  return { success: true, message: "You left the trip" };
}

/** Owner only: make a member an editor or view-only. */
export async function setTripMemberRole(
  tripId: string,
  userId: string,
  memberUserId: string,
  role: unknown,
): Promise<TripMemberActionResult<TripMembersData>> {
  if (role !== "editor" && role !== "viewer") return { success: false, error: "Role must be editor or viewer" };
  const trip = await TripRepository.findByIdForOwner(tripId, userId);
  if (!trip) return { success: false, error: "Only the trip owner can change roles" };
  if (!trip.memberIds.includes(memberUserId)) return { success: false, error: "That person isn't on the trip" };

  const updated = await TripRepository.setMemberRole(tripId, memberUserId, role);
  if (!updated) return { success: false, error: "Failed to update role" };
  await emitTripEvent(tripId, "trip.members_changed");
  const members = await buildMemberList(updated.userId, updated.memberIds, updated.viewerIds);
  return { success: true, data: { members, pending: await listPendingMembers(tripId) }, message: role === "viewer" ? "Now view-only" : "Can now edit" };
}
