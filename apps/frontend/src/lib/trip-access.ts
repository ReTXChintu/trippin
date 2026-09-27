import type { Trip } from "@/modules/trips/types/trip.types";

export function isTripOwner(trip: Pick<Trip, "userId">, userId: string): boolean {
  return trip.userId === userId;
}

export function isTripMember(trip: Pick<Trip, "userId" | "memberIds">, userId: string): boolean {
  return trip.memberIds.includes(userId);
}

export type TripRole = "owner" | "editor" | "viewer";

export function getTripRole(trip: Pick<Trip, "userId" | "memberIds" | "viewerIds">, userId: string): TripRole | null {
  if (trip.userId === userId) return "owner";
  if (!trip.memberIds.includes(userId)) return null;
  return (trip.viewerIds ?? []).includes(userId) ? "viewer" : "editor";
}

export function canEditTrip(trip: Pick<Trip, "userId" | "memberIds" | "viewerIds">, userId: string): boolean {
  const role = getTripRole(trip, userId);
  return role === "owner" || role === "editor";
}

export function canAccessTrip(trip: Pick<Trip, "userId" | "memberIds">, userId: string): boolean {
  return isTripOwner(trip, userId) || isTripMember(trip, userId);
}
