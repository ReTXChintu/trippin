import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IVisitIntel {
  bestTime?: string;
  avoidTime?: string;
  hypeLevel?: "overhyped" | "worth-it" | "hidden-gem";
  why?: string;
  tips?: string[];
}

export interface IItineraryStop {
  id: string;
  placeId: string;
  placeName: string;
  sequence: number;
  arrivalTime: string;
  departureTime: string;
  visitDurationMinutes: number;
  travelDurationMinutes: number;
  coordinates?: { lat: number; lng: number };
  category?: string;
  stopType?: "sight" | "transfer" | "food" | "market";
  legId?: string;
  notes?: string;
  visitIntel?: IVisitIntel;
  aiNotes?: string;
}

export interface IItineraryDay {
  dayNumber: number;
  date: string;
  stops: IItineraryStop[];
  legId?: string;
  legName?: string;
  dayType?: "sightseeing" | "transfer" | "free";
  transferLabel?: string;
}

export interface IItineraryDocument extends Document {
  tripId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  days: IItineraryDay[];
  summary?: string;
  summaryGeneratedAt?: Date;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CoordinatesSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false },
);

const VisitIntelSchema = new Schema<IVisitIntel>(
  {
    bestTime: { type: String },
    avoidTime: { type: String },
    hypeLevel: { type: String, enum: ["overhyped", "worth-it", "hidden-gem"] },
    why: { type: String },
    tips: { type: [String], default: [] },
  },
  { _id: false },
);

const ItineraryStopSchema = new Schema<IItineraryStop>(
  {
    id: { type: String, required: true },
    placeId: { type: String, required: true },
    placeName: { type: String, required: true },
    sequence: { type: Number, required: true },
    arrivalTime: { type: String, required: true },
    departureTime: { type: String, required: true },
    visitDurationMinutes: { type: Number, required: true },
    travelDurationMinutes: { type: Number, required: true },
    coordinates: { type: CoordinatesSchema },
    category: { type: String },
    stopType: { type: String, enum: ["sight", "transfer", "food", "market"] },
    legId: { type: String },
    notes: { type: String },
    visitIntel: { type: VisitIntelSchema },
    aiNotes: { type: String },
  },
  { _id: false },
);

const ItineraryDaySchema = new Schema<IItineraryDay>(
  {
    dayNumber: { type: Number, required: true },
    date: { type: String, required: true },
    stops: { type: [ItineraryStopSchema], default: [] },
    legId: { type: String },
    legName: { type: String },
    dayType: { type: String, enum: ["sightseeing", "transfer", "free"] },
    transferLabel: { type: String },
  },
  { _id: false },
);

const ItinerarySchema = new Schema<IItineraryDocument>(
  {
    tripId: {
      type: Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      unique: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    days: { type: [ItineraryDaySchema], default: [] },
    summary: { type: String },
    summaryGeneratedAt: { type: Date },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const Itinerary: Model<IItineraryDocument> =
  mongoose.models.Itinerary ??
  mongoose.model<IItineraryDocument>("Itinerary", ItinerarySchema);
