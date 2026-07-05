import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import {
  Itinerary as ItineraryModel,
  type IItineraryDay,
  type IItineraryDocument,
} from "@/models/Itinerary";
import { toItineraryDTO, toPlainItineraryDays } from "@/modules/itinerary/utils/itinerary.mapper";
import type { Itinerary, ItineraryDay } from "@/modules/itinerary/types";

function tripObjectId(tripId: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(tripId);
}

export class ItineraryRepository {
  static async findByTripId(tripId: string): Promise<Itinerary | null> {
    return ItineraryRepository.findByTripIdOnly(tripId);
  }

  static async findByTripIdOnly(tripId: string): Promise<Itinerary | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(tripId)) return null;

    const doc = await ItineraryModel.findOne({
      tripId: tripObjectId(tripId),
    }).lean();

    if (!doc) return null;
    return toItineraryDTO(doc as unknown as IItineraryDocument);
  }

  static async upsertForTrip(
    tripId: string,
    ownerId: string,
    days: ItineraryDay[],
  ): Promise<Itinerary> {
    await connectDB();
    const plainDays = toPlainItineraryDays(days) as IItineraryDay[];

    const doc = await ItineraryModel.findOneAndUpdate(
      { tripId: tripObjectId(tripId) },
      {
        $set: {
          days: plainDays,
          generatedAt: new Date(),
        },
        $setOnInsert: {
          tripId: tripObjectId(tripId),
          userId: tripObjectId(ownerId),
        },
      },
      { upsert: true, new: true, lean: true },
    );

    return toItineraryDTO(doc as unknown as IItineraryDocument);
  }

  static async updateDayStops(
    tripId: string,
    _ownerId: string,
    dayNumber: number,
    stops: ItineraryDay["stops"],
  ): Promise<Itinerary | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(tripId)) return null;

    const doc = await ItineraryModel.findOne({
      tripId: tripObjectId(tripId),
    });

    if (!doc) return null;

    const dayIndex = doc.days.findIndex((d) => d.dayNumber === dayNumber);
    if (dayIndex === -1) return null;

    doc.days[dayIndex].stops = stops;
    doc.markModified("days");
    await doc.save();

    return toItineraryDTO(doc.toObject() as IItineraryDocument);
  }

  static async upsertDays(
    tripId: string,
    ownerId: string,
    days: ItineraryDay[],
    options?: { clearSummary?: boolean },
  ): Promise<Itinerary> {
    await connectDB();
    const plainDays = toPlainItineraryDays(days) as IItineraryDay[];

    const updatePayload: Record<string, unknown> = {
      $set: {
        days: plainDays,
        generatedAt: new Date(),
      },
      $setOnInsert: {
        tripId: tripObjectId(tripId),
        userId: tripObjectId(ownerId),
      },
    };

    if (options?.clearSummary) {
      updatePayload.$unset = { summary: "", summaryGeneratedAt: "" };
    }

    const doc = await ItineraryModel.findOneAndUpdate(
      { tripId: tripObjectId(tripId) },
      updatePayload,
      { upsert: true, new: true, lean: true },
    );

    return toItineraryDTO(doc as unknown as IItineraryDocument);
  }

  static async updateSummary(
    tripId: string,
    _ownerId: string,
    summary: string,
  ): Promise<Itinerary | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(tripId)) return null;

    const doc = await ItineraryModel.findOneAndUpdate(
      { tripId: tripObjectId(tripId) },
      {
        $set: {
          summary,
          summaryGeneratedAt: new Date(),
        },
      },
      { new: true, lean: true },
    );

    if (!doc) return null;
    return toItineraryDTO(doc as unknown as IItineraryDocument);
  }

  static async deleteByTripId(tripId: string): Promise<void> {
    await connectDB();
    if (!mongoose.isValidObjectId(tripId)) return;

    await ItineraryModel.deleteOne({
      tripId: tripObjectId(tripId),
    });
  }
}
