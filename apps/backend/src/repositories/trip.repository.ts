import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Trip as TripModel, type ITripDocument } from "@/models/Trip";
import { toTripDTO, toTripSummary } from "@/modules/trips/utils/trip.mapper";
import type { Trip, TripStats } from "@/modules/trips/types/trip.types";
import type { TripStatus, TransportationMode, TravelStyle } from "@/types";
import { generatePublicSlug } from "@/utils/trip.utils";

import type { TripLeg, TripLegTransfer } from "@/modules/trips/types/trip-leg.types";
import type { VehicleRentalSuggestion } from "@/modules/trips/types/trip-enrichment.types";
import type { ChecklistItem, TripBooking } from "@/modules/trips/types/trip-extras.types";

export interface CreateTripData {
  userId: string;
  title: string;
  destinationCity: string;
  destinationState?: string;
  destinationCountry: string;
  startDate: Date;
  endDate: Date;
  arrivalTime?: string;
  departureTime?: string;
  hotelName?: string;
  hotelAddress?: string;
  hotelCoordinates?: { lat: number; lng: number };
  legs?: TripLeg[];
  transfers?: TripLegTransfer[];
  dailyStartTime?: string;
  dailyEndTime?: string;
  useFlexibleSchedule?: boolean;
  transportationMode?: TransportationMode;
  travelStyle?: TravelStyle;
  budgetLevel?: "budget" | "moderate" | "luxury";
  currency?: string;
  budgetAmount?: number;
  interests?: string[];
  mustVisitPlaces?: string[];
  excludedPlaces?: string[];
  notes?: string;
  status?: TripStatus;
}

export type UpdateTripData = Partial<Omit<CreateTripData, "userId">> & {
  isPublic?: boolean;
  publicSlug?: string;
  discoveredPlaceIds?: string[];
  discoveryPoolIds?: string[];
  foodPoolIds?: string[];
  marketPoolIds?: string[];
  destinationBrief?: TripLeg["destinationBrief"];
  vehicleRentalSuggestions?: VehicleRentalSuggestion[];
  legs?: TripLeg[];
  transfers?: TripLegTransfer[];
  memberIds?: string[];
  bookings?: TripBooking[];
  checklist?: ChecklistItem[];
};

export type TripListField = "bookings" | "checklist";

function toObjectId(userId: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(userId);
}

function userAccessFilter(userId: string): Record<string, unknown> {
  const uid = toObjectId(userId);
  return { $or: [{ userId: uid }, { memberIds: uid }] };
}

export class TripRepository {
  static async create(data: CreateTripData): Promise<Trip> {
    await connectDB();
    const doc = await TripModel.create({
      ...data,
      userId: toObjectId(data.userId),
      memberIds: [],
    });
    return toTripDTO(doc.toObject() as ITripDocument);
  }

  static async findById(id: string): Promise<ITripDocument | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(id)) return null;
    return TripModel.findById(id);
  }

  /** Returns trip if user is owner or member. */
  static async findByIdForUser(id: string, userId: string): Promise<Trip | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await TripModel.findOne({ _id: id, ...userAccessFilter(userId) }).lean();
    if (!doc) return null;
    return toTripDTO(doc as unknown as ITripDocument);
  }

  /** Returns trip only if user is the owner. */
  static async findByIdForOwner(id: string, userId: string): Promise<Trip | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await TripModel.findOne({ _id: id, userId: toObjectId(userId) }).lean();
    if (!doc) return null;
    return toTripDTO(doc as unknown as ITripDocument);
  }

  static async findByPublicSlug(slug: string): Promise<Trip | null> {
    await connectDB();
    const doc = await TripModel.findOne({ publicSlug: slug, isPublic: true }).lean();
    return doc ? toTripDTO(doc as unknown as ITripDocument) : null;
  }

  static async findByUser(
    userId: string,
    options?: { status?: TripStatus; limit?: number },
  ): Promise<Trip[]> {
    await connectDB();
    const filter: Record<string, unknown> = userAccessFilter(userId);
    if (options?.status) filter.status = options.status;

    const docs = await TripModel.find(filter)
      .sort({ updatedAt: -1 })
      .limit(options?.limit ?? 100)
      .lean();
    return docs.map((doc) => toTripDTO(doc as unknown as ITripDocument));
  }

  static async findUpcoming(userId: string, limit = 5): Promise<Trip[]> {
    await connectDB();
    const now = new Date();
    const docs = await TripModel.find({
      ...userAccessFilter(userId),
      status: { $in: ["draft", "active"] },
      endDate: { $gte: now },
    })
      .sort({ startDate: 1 })
      .limit(limit)
      .lean();
    return docs.map((doc) => toTripDTO(doc as unknown as ITripDocument));
  }

  static async findRecent(userId: string, limit = 5): Promise<Trip[]> {
    await connectDB();
    const docs = await TripModel.find(userAccessFilter(userId))
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();
    return docs.map((doc) => toTripDTO(doc as unknown as ITripDocument));
  }

  static async getStats(userId: string): Promise<TripStats> {
    await connectDB();
    const access = userAccessFilter(userId);
    const now = new Date();

    const [totalTrips, upcomingTrips, completedTrips, archivedTrips] =
      await Promise.all([
        TripModel.countDocuments(access),
        TripModel.countDocuments({
          ...access,
          status: { $in: ["draft", "active"] },
          endDate: { $gte: now },
        }),
        TripModel.countDocuments({ ...access, status: "completed" }),
        TripModel.countDocuments({ ...access, status: "archived" }),
      ]);

    return { totalTrips, upcomingTrips, completedTrips, archivedTrips };
  }

  /** Owner or member can update trip details. */
  /** Sets a member's role: viewers are listed in viewerIds, editors aren't. */
  static async setMemberRole(tripId: string, memberUserId: string, role: "editor" | "viewer"): Promise<Trip | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(tripId) || !mongoose.isValidObjectId(memberUserId)) return null;
    const update =
      role === "viewer"
        ? { $addToSet: { viewerIds: toObjectId(memberUserId) } }
        : { $pull: { viewerIds: toObjectId(memberUserId) } };
    const doc = await TripModel.findOneAndUpdate({ _id: tripId, memberIds: toObjectId(memberUserId) }, update, { new: true }).lean();
    return doc ? toTripDTO(doc as unknown as ITripDocument) : null;
  }

  /** Access check without loading the whole trip: "owner" | "editor" | "viewer" | null. */
  static async getRole(tripId: string, userId: string): Promise<"owner" | "editor" | "viewer" | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(tripId) || !mongoose.isValidObjectId(userId)) return null;
    const doc = await TripModel.findById(tripId).select({ userId: 1, memberIds: 1, viewerIds: 1 }).lean();
    if (!doc) return null;
    if (String(doc.userId) === userId) return "owner";
    if (!(doc.memberIds ?? []).some((id) => String(id) === userId)) return null;
    return (doc.viewerIds ?? []).some((id) => String(id) === userId) ? "viewer" : "editor";
  }

  static async setVote(tripId: string, userId: string, placeId: string, voted: boolean): Promise<Trip | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(tripId)) return null;
    const update = voted ? { $addToSet: { votes: { placeId, userId } } } : { $pull: { votes: { placeId, userId } } };
    const doc = await TripModel.findOneAndUpdate({ _id: tripId, ...userAccessFilter(userId) }, update, { new: true }).lean();
    return doc ? toTripDTO(doc as unknown as ITripDocument) : null;
  }

  /** Appends one item to an embedded list (bookings, checklist) without rewriting the others. */
  static async addListItem<T extends { id: string }>(
    tripId: string,
    userId: string,
    field: TripListField,
    item: T,
  ): Promise<Trip | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(tripId)) return null;
    const doc = await TripModel.findOneAndUpdate(
      { _id: tripId, ...userAccessFilter(userId) },
      { $push: { [field]: item } },
      { new: true, runValidators: true },
    ).lean();
    return doc ? toTripDTO(doc as unknown as ITripDocument) : null;
  }

  /** Replaces one embedded list item by id. Null when the trip or item isn't found. */
  static async replaceListItem<T extends { id: string }>(
    tripId: string,
    userId: string,
    field: TripListField,
    item: T,
  ): Promise<Trip | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(tripId)) return null;
    const doc = await TripModel.findOneAndUpdate(
      { _id: tripId, ...userAccessFilter(userId), [`${field}.id`]: item.id },
      { $set: { [`${field}.$`]: item } },
      { new: true, runValidators: true },
    ).lean();
    return doc ? toTripDTO(doc as unknown as ITripDocument) : null;
  }

  static async removeListItem(tripId: string, userId: string, field: TripListField, itemId: string): Promise<Trip | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(tripId)) return null;
    const doc = await TripModel.findOneAndUpdate(
      { _id: tripId, ...userAccessFilter(userId) },
      { $pull: { [field]: { id: itemId } } },
      { new: true },
    ).lean();
    return doc ? toTripDTO(doc as unknown as ITripDocument) : null;
  }

  static async update(
    id: string,
    userId: string,
    data: UpdateTripData,
  ): Promise<Trip | null> {
    await connectDB();
    const doc = await TripModel.findOneAndUpdate(
      { _id: id, ...userAccessFilter(userId) },
      data,
      { new: true },
    ).lean();
    return doc ? toTripDTO(doc as unknown as ITripDocument) : null;
  }

  /** Only the owner can delete a trip. */
  static async delete(id: string, userId: string): Promise<boolean> {
    await connectDB();
    const result = await TripModel.deleteOne({
      _id: id,
      userId: toObjectId(userId),
    });
    return result.deletedCount > 0;
  }

  static async duplicate(id: string, userId: string): Promise<Trip | null> {
    const original = await TripRepository.findByIdForUser(id, userId);
    if (!original) return null;

    return TripRepository.create({
      userId,
      title: `${original.title} (Copy)`,
      destinationCity: original.destinationCity,
      destinationState: original.destinationState,
      destinationCountry: original.destinationCountry,
      startDate: new Date(original.startDate),
      endDate: new Date(original.endDate),
      arrivalTime: original.arrivalTime,
      departureTime: original.departureTime,
      hotelName: original.hotelName,
      hotelAddress: original.hotelAddress,
      hotelCoordinates: original.hotelCoordinates,
      legs: original.legs,
      transfers: original.transfers,
      dailyStartTime: original.dailyStartTime,
      dailyEndTime: original.dailyEndTime,
      useFlexibleSchedule: original.useFlexibleSchedule,
      transportationMode: original.transportationMode,
      travelStyle: original.travelStyle,
      budgetLevel: original.budgetLevel,
      interests: original.interests,
      mustVisitPlaces: original.mustVisitPlaces,
      excludedPlaces: original.excludedPlaces,
      notes: original.notes,
      status: "draft",
    });
  }

  static async archive(id: string, userId: string): Promise<Trip | null> {
    return TripRepository.update(id, userId, { status: "archived" });
  }

  static async enableSharing(id: string, userId: string): Promise<Trip | null> {
    const trip = await TripRepository.findByIdForUser(id, userId);
    if (!trip) return null;

    const publicSlug = trip.publicSlug ?? generatePublicSlug(trip.title);
    return TripRepository.update(id, userId, { isPublic: true, publicSlug });
  }

  static async disableSharing(id: string, userId: string): Promise<Trip | null> {
    return TripRepository.update(id, userId, { isPublic: false });
  }

  static async addMember(
    tripId: string,
    requesterId: string,
    memberUserId: string,
  ): Promise<Trip | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(tripId) || !mongoose.isValidObjectId(memberUserId)) {
      return null;
    }

    const trip = await TripRepository.findByIdForUser(tripId, requesterId);
    if (!trip) return null;

    if (trip.userId === memberUserId || trip.memberIds.includes(memberUserId)) {
      return trip;
    }

    const doc = await TripModel.findOneAndUpdate(
      { _id: tripId, ...userAccessFilter(requesterId) },
      { $addToSet: { memberIds: toObjectId(memberUserId) } },
      { new: true },
    ).lean();

    return doc ? toTripDTO(doc as unknown as ITripDocument) : null;
  }

  static async removeMember(
    tripId: string,
    requesterId: string,
    memberUserId: string,
  ): Promise<Trip | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(tripId) || !mongoose.isValidObjectId(memberUserId)) {
      return null;
    }

    const trip = await TripRepository.findByIdForUser(tripId, requesterId);
    if (!trip) return null;
    if (trip.userId === memberUserId) return null;

    const doc = await TripModel.findOneAndUpdate(
      { _id: tripId, ...userAccessFilter(requesterId) },
      { $pull: { memberIds: toObjectId(memberUserId), viewerIds: toObjectId(memberUserId) } },
      { new: true },
    ).lean();

    return doc ? toTripDTO(doc as unknown as ITripDocument) : null;
  }

  static async leaveTrip(tripId: string, userId: string): Promise<Trip | null> {
    const trip = await TripRepository.findByIdForUser(tripId, userId);
    if (!trip || trip.userId === userId) return null;
    return TripRepository.removeMember(tripId, userId, userId);
  }
}

export { toTripSummary };
