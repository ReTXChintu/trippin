import { isTripOwner } from "@/lib/trip-access";
import type { TripMember } from "@/modules/trips/types/trip-member.types";
import {
  addTripMemberSchema,
  removeTripMemberSchema,
} from "@/modules/trips/validators/trip-member.validator";
import { NotificationRepository } from "@/repositories/notification.repository";
import { TripRepository } from "@/repositories/trip.repository";
import { UserRepository } from "@/repositories/user.repository";
import { sendTripMemberAddedEmail, sendTripMemberLeftEmail } from "@/services/email.service";

export type TripMemberActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

async function buildMemberList(ownerId: string, memberIds: string[]): Promise<TripMember[]> {
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
        role: "member",
      });
    }
  }

  return members;
}

export async function getTripMembers(
  tripId: string,
  userId: string,
): Promise<TripMemberActionResult<{ members: TripMember[] }>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const members = await buildMemberList(trip.userId, trip.memberIds);
  return { success: true, data: { members } };
}

export async function addTripMember(
  tripId: string,
  userId: string,
  email: string,
): Promise<TripMemberActionResult<{ members: TripMember[] }>> {
  const parsed = addTripMemberSchema.safeParse({ tripId, email });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  const targetUser = await UserRepository.findByEmail(email.trim());
  if (!targetUser) {
    return {
      success: false,
      error: "No account found with that email. They need to register first.",
    };
  }

  const targetId = targetUser._id.toString();
  if (targetId === trip.userId || trip.memberIds.includes(targetId)) {
    return { success: false, error: "This user is already on the trip" };
  }

  const updated = await TripRepository.addMember(tripId, userId, targetId);
  if (!updated) return { success: false, error: "Failed to add member" };

  const adder = await UserRepository.findById(userId);
  await sendTripMemberAddedEmail({
    toEmail: targetUser.email,
    toName: targetUser.name,
    tripTitle: trip.title,
    tripId: trip.id,
    addedByName: adder?.name ?? "Someone",
  });

  const members = await buildMemberList(updated.userId, updated.memberIds);

  return {
    success: true,
    data: { members },
    message: `${targetUser.name} added to the trip`,
  };
}

export async function removeTripMember(
  tripId: string,
  userId: string,
  memberUserId: string,
): Promise<TripMemberActionResult<{ members: TripMember[] }>> {
  const parsed = removeTripMemberSchema.safeParse({ tripId, memberUserId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  if (trip.userId === memberUserId) {
    return { success: false, error: "The trip owner cannot be removed" };
  }

  const updated = await TripRepository.removeMember(tripId, userId, memberUserId);
  if (!updated) return { success: false, error: "Failed to remove member" };

  const members = await buildMemberList(updated.userId, updated.memberIds);
  return { success: true, data: { members }, message: "Member removed" };
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
