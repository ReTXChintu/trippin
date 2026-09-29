import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Itinerary } from "@/models/Itinerary";
import { User } from "@/models/User";
import type { Trip } from "@/modules/trips/types/trip.types";

export interface TripPerson {
  id: string;
  name: string;
  avatar?: string;
}

/** A trip as shown in lists (dashboard, My trips): who's on it, and how far the plan has got. */
export type TripListItem = Trip & {
  people: TripPerson[];
  planInfo: { hasPlan: boolean; edits: number };
};

const MAX_PEOPLE = 6;

/** Adds the people on each trip (owner first) and its plan status, in two queries for the whole list. */
export async function withListExtras(trips: Trip[]): Promise<TripListItem[]> {
  if (trips.length === 0) return [];
  await connectDB();

  const personIds = [...new Set(trips.flatMap((t) => [t.userId, ...(t.memberIds ?? [])]))].filter((id) => mongoose.isValidObjectId(id));
  const tripIds = trips.map((t) => t.id).filter((id) => mongoose.isValidObjectId(id));

  const [users, plans] = await Promise.all([
    User.find({ _id: { $in: personIds } }).select({ name: 1, avatar: 1 }).lean(),
    Itinerary.aggregate<{ _id: mongoose.Types.ObjectId; days: number; edits: number }>([
      { $match: { tripId: { $in: tripIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
      { $project: { _id: "$tripId", days: { $size: { $ifNull: ["$days", []] } }, edits: { $size: { $ifNull: ["$history", []] } } } },
    ]),
  ]);

  const people = new Map<string, TripPerson>(users.map((u) => [String(u._id), { id: String(u._id), name: u.name, avatar: u.avatar || undefined }]));
  const planByTrip = new Map(plans.map((p) => [String(p._id), { hasPlan: p.days > 0, edits: p.edits }]));

  return trips.map((trip) => ({
    ...trip,
    people: [trip.userId, ...(trip.memberIds ?? [])]
      .map((id) => people.get(id))
      .filter((p): p is TripPerson => Boolean(p))
      .slice(0, MAX_PEOPLE),
    planInfo: planByTrip.get(trip.id) ?? { hasPlan: false, edits: 0 },
  }));
}
