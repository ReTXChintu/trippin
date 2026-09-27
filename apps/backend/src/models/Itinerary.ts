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
  stopType?: "sight" | "transfer" | "food" | "market" | "meal" | "return" | "activity";
  legId?: string;
  notes?: string;
  visitIntel?: IVisitIntel;
  aiNotes?: string;
  mealType?: "breakfast" | "lunch" | "tiffin" | "dinner";
  locked?: boolean;
  userAdded?: boolean;
  fixedStartTime?: string;
  warnings?: string[];
  openingHoursToday?: string;
  travelSource?: "route" | "estimate";
  travelDistanceKm?: number;
  cost?: number;
}

export interface IItineraryDay {
  dayNumber: number;
  date: string;
  stops: IItineraryStop[];
  legId?: string;
  legName?: string;
  dayType?: "sightseeing" | "transfer" | "free";
  transferLabel?: string;
  dressCode?: string;
}

export interface IOptionalItineraryPlace {
  placeId: string;
  placeName: string;
  category?: string;
  coordinates?: { lat: number; lng: number };
  legId?: string;
  reason: string;
}

export interface IAiItineraryCandidate {
  legId?: string;
  days: IItineraryDay[];
  optionalPlaces: IOptionalItineraryPlace[];
  generatedAt: Date;
}

export interface IItinerarySnapshot {
  label: string;
  days: IItineraryDay[];
  optionalPlaces: IOptionalItineraryPlace[];
  createdAt: Date;
}

export interface IItineraryDocument extends Document {
  tripId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  days: IItineraryDay[];
  optionalPlaces: IOptionalItineraryPlace[];
  aiCandidates: IAiItineraryCandidate[];
  history: IItinerarySnapshot[];
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
    // Not required: meal-slot placeholders and "return to hotel" stops legitimately have no
    // underlying Place record and use "" here by design (see buildMealSlotStops/
    // buildReturnToHotelStop in itinerary-engine.service.ts).
    placeId: { type: String, default: "" },
    placeName: { type: String, required: true },
    sequence: { type: Number, required: true },
    arrivalTime: { type: String, required: true },
    departureTime: { type: String, required: true },
    visitDurationMinutes: { type: Number, required: true },
    travelDurationMinutes: { type: Number, required: true },
    coordinates: { type: CoordinatesSchema },
    category: { type: String },
    stopType: { type: String, enum: ["sight", "transfer", "food", "market", "meal", "return", "activity"] },
    legId: { type: String },
    notes: { type: String },
    visitIntel: { type: VisitIntelSchema },
    aiNotes: { type: String },
    mealType: { type: String, enum: ["breakfast", "lunch", "tiffin", "dinner"] },
    locked: { type: Boolean },
    userAdded: { type: Boolean },
    fixedStartTime: { type: String },
    warnings: { type: [String], default: undefined },
    openingHoursToday: { type: String },
    travelSource: { type: String, enum: ["route", "estimate"] },
    travelDistanceKm: { type: Number },
    cost: { type: Number, min: 0 },
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
    dressCode: { type: String },
  },
  { _id: false },
);

const OptionalItineraryPlaceSchema = new Schema<IOptionalItineraryPlace>(
  {
    placeId: { type: String, required: true },
    placeName: { type: String, required: true },
    category: { type: String },
    coordinates: { type: CoordinatesSchema },
    legId: { type: String },
    reason: { type: String, required: true },
  },
  { _id: false },
);

const AiItineraryCandidateSchema = new Schema<IAiItineraryCandidate>(
  {
    legId: { type: String },
    days: { type: [ItineraryDaySchema], default: [] },
    optionalPlaces: { type: [OptionalItineraryPlaceSchema], default: [] },
    generatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ItinerarySnapshotSchema = new Schema<IItinerarySnapshot>(
  {
    label: { type: String, required: true },
    days: { type: [ItineraryDaySchema], default: [] },
    optionalPlaces: { type: [OptionalItineraryPlaceSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
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
    optionalPlaces: { type: [OptionalItineraryPlaceSchema], default: [] },
    aiCandidates: { type: [AiItineraryCandidateSchema], default: [] },
    history: { type: [ItinerarySnapshotSchema], default: [] },
    summary: { type: String },
    summaryGeneratedAt: { type: Date },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const Itinerary: Model<IItineraryDocument> =
  mongoose.models.Itinerary ??
  mongoose.model<IItineraryDocument>("Itinerary", ItinerarySchema);
