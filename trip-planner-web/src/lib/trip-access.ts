import type { Trip } from "@/modules/trips/types/trip.types";

export function isTripOwner(trip: Pick<Trip, "userId">, userId: string): boolean {
  return trip.userId === userId;
}

export function isTripMember(trip: Pick<Trip, "userId" | "memberIds">, userId: string): boolean {
  return trip.memberIds.includes(userId);
}

export function canAccessTrip(trip: Pick<Trip, "userId" | "memberIds">, userId: string): boolean {
  return isTripOwner(trip, userId) || isTripMember(trip, userId);
}
