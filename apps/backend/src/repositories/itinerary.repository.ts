import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import {
  Itinerary as ItineraryModel,
  type IAiItineraryCandidate,
  type IItineraryDay,
  type IItineraryDocument,
  type IOptionalItineraryPlace,
} from "@/models/Itinerary";
import {
  snapshotToState,
  toItineraryDTO,
  toPlainAiCandidate,
  toPlainItineraryDays,
  toPlainOptionalPlaces,
} from "@/modules/itinerary/utils/itinerary.mapper";
import type { AiItineraryCandidate, Itinerary, ItineraryDay, OptionalItineraryPlace } from "@/modules/itinerary/types";

/** How many changes can be undone. */
const HISTORY_LIMIT = 15;

/** Reads only need each snapshot's label (for the Undo button) — never the stored days. */
const WITHOUT_SNAPSHOT_BODIES = { "history.days": 0, "history.optionalPlaces": 0 } as const;

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
    })
      .select(WITHOUT_SNAPSHOT_BODIES)
      .lean();

    if (!doc) return null;
    return toItineraryDTO(doc as unknown as IItineraryDocument);
  }

  static async upsertForTrip(
    tripId: string,
    ownerId: string,
    days: ItineraryDay[],
    optionalPlaces: OptionalItineraryPlace[] = [],
  ): Promise<Itinerary> {
    await connectDB();
    const plainDays = toPlainItineraryDays(days) as IItineraryDay[];
    const plainOptionalPlaces = toPlainOptionalPlaces(optionalPlaces) as IOptionalItineraryPlace[];

    const doc = await ItineraryModel.findOneAndUpdate(
      { tripId: tripObjectId(tripId) },
      {
        $set: {
          days: plainDays,
          optionalPlaces: plainOptionalPlaces,
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
    options?: { clearSummary?: boolean; optionalPlaces?: OptionalItineraryPlace[] },
  ): Promise<Itinerary> {
    await connectDB();
    const plainDays = toPlainItineraryDays(days) as IItineraryDay[];

    const setPayload: Record<string, unknown> = {
      days: plainDays,
      generatedAt: new Date(),
    };
    if (options?.optionalPlaces) {
      setPayload.optionalPlaces = toPlainOptionalPlaces(options.optionalPlaces) as IOptionalItineraryPlace[];
    }

    const updatePayload: Record<string, unknown> = {
      $set: setPayload,
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

  /** Replaces days (and optionally optional places), first pushing `previous` onto the undo
   * history (capped at HISTORY_LIMIT, oldest dropped). */
  static async saveWithHistory(
    tripId: string,
    ownerId: string,
    next: { days: ItineraryDay[]; optionalPlaces?: OptionalItineraryPlace[] },
    previous: { label: string; days: ItineraryDay[]; optionalPlaces: OptionalItineraryPlace[] } | null,
    options?: { clearSummary?: boolean; markGenerated?: boolean },
  ): Promise<Itinerary> {
    await connectDB();

    const setPayload: Record<string, unknown> = { days: toPlainItineraryDays(next.days) as IItineraryDay[] };
    if (next.optionalPlaces) {
      setPayload.optionalPlaces = toPlainOptionalPlaces(next.optionalPlaces) as IOptionalItineraryPlace[];
    }
    if (options?.markGenerated) setPayload.generatedAt = new Date();

    const update: Record<string, unknown> = {
      $set: setPayload,
      $setOnInsert: { tripId: tripObjectId(tripId), userId: tripObjectId(ownerId) },
    };
    if (previous) {
      update.$push = {
        history: {
          $each: [
            {
              label: previous.label,
              days: toPlainItineraryDays(previous.days),
              optionalPlaces: toPlainOptionalPlaces(previous.optionalPlaces),
              createdAt: new Date(),
            },
          ],
          $slice: -HISTORY_LIMIT,
        },
      };
    }
    if (options?.clearSummary) update.$unset = { summary: "", summaryGeneratedAt: "" };

    const doc = await ItineraryModel.findOneAndUpdate({ tripId: tripObjectId(tripId) }, update, {
      upsert: true,
      new: true,
      lean: true,
      projection: WITHOUT_SNAPSHOT_BODIES,
    });
    return toItineraryDTO(doc as unknown as IItineraryDocument);
  }

  /** Restores the most recent snapshot and removes it from history. Null when there's nothing to undo. */
  static async undo(tripId: string): Promise<{ itinerary: Itinerary; label: string } | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(tripId)) return null;

    const doc = await ItineraryModel.findOne({ tripId: tripObjectId(tripId) });
    if (!doc || doc.history.length === 0) return null;

    const snapshot = doc.history[doc.history.length - 1];
    const state = snapshotToState(snapshot);
    doc.days = toPlainItineraryDays(state.days) as IItineraryDay[];
    doc.optionalPlaces = toPlainOptionalPlaces(state.optionalPlaces) as IOptionalItineraryPlace[];
    doc.history = doc.history.slice(0, -1);
    doc.markModified("days");
    doc.markModified("optionalPlaces");
    doc.markModified("history");
    await doc.save();

    return { itinerary: toItineraryDTO(doc.toObject() as IItineraryDocument), label: snapshot.label };
  }

  static async upsertAiCandidate(
    tripId: string,
    ownerId: string,
    candidate: AiItineraryCandidate,
  ): Promise<Itinerary | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(tripId)) return null;

    const plain = toPlainAiCandidate(candidate);
    const plainCandidate: IAiItineraryCandidate = {
      ...plain,
      days: plain.days as unknown as IItineraryDay[],
      optionalPlaces: plain.optionalPlaces as unknown as IOptionalItineraryPlace[],
      generatedAt: new Date(plain.generatedAt),
    };

    const doc = await ItineraryModel.findOneAndUpdate(
      { tripId: tripObjectId(tripId) },
      { $setOnInsert: { tripId: tripObjectId(tripId), userId: tripObjectId(ownerId) } },
      { upsert: true, new: true },
    );

    doc.aiCandidates = [
      ...doc.aiCandidates.filter((c) => c.legId !== candidate.legId),
      plainCandidate,
    ];
    doc.markModified("aiCandidates");
    await doc.save();

    return toItineraryDTO(doc.toObject() as IItineraryDocument);
  }

  static async removeAiCandidate(tripId: string, legId?: string): Promise<Itinerary | null> {
    await connectDB();
    if (!mongoose.isValidObjectId(tripId)) return null;

    const doc = await ItineraryModel.findOne({ tripId: tripObjectId(tripId) });
    if (!doc) return null;

    doc.aiCandidates = doc.aiCandidates.filter((c) => c.legId !== legId);
    doc.markModified("aiCandidates");
    await doc.save();

    return toItineraryDTO(doc.toObject() as IItineraryDocument);
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
