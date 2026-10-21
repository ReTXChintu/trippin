import mongoose, { Schema, type Document, type Model } from "mongoose";
import {
  BOOKING_TYPES,
  CHECKLIST_CATEGORIES,
  type ChecklistItem,
  type TripBooking,
} from "@/modules/trips/types/trip-extras.types";
import { SUITE_APPS, type SuiteLink, type TripLinks } from "@/modules/suite/types/suite.types";
import type {
  TransportationMode,
  TravelStyle,
  TripStatus,
} from "@/types";

export interface ICoordinates {
  lat: number;
  lng: number;
}

export interface IVehicleRentalSuggestion {
  googlePlaceId: string;
  name: string;
  address?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUrl?: string;
  phone?: string;
  distanceKm?: number;
  vehicleTypes: string[];
}

export interface ILegMarketGuide {
  placeId?: string;
  name: string;
  whatToBuy: string[];
}

export interface ILegDestinationBrief {
  specialties: string[];
  localFood: string[];
  markets: ILegMarketGuide[];
  festivals: string[];
  generalTips: string[];
  generatedAt?: string;
}

export interface ITripStay {
  id: string;
  name: string;
  address?: string;
  coordinates?: ICoordinates;
  googlePlaceId?: string;
  checkInDate: string;
  checkOutDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  confirmationNumber?: string;
  pricePerNight?: number;
  currency?: string;
  bookingUrl?: string;
  notes?: string;
  rating?: number;
}

export interface ITripDayTrip {
  id: string;
  name: string;
  date?: string;
  coordinates?: { lat: number; lng: number };
}

export interface ITripLeg {
  id: string;
  name: string;
  baseCity: string;
  dayTripAreas: string[];
  dayTrips?: ITripDayTrip[];
  placeAreas?: Record<string, string>;
  startDate: string;
  endDate: string;
  arrivalTime?: string;
  departureTime?: string;
  state?: string;
  country: string;
  hotelName?: string;
  hotelAddress?: string;
  hotelCoordinates?: ICoordinates;
  stays?: ITripStay[];
  order: number;
  discoveryPoolIds: string[];
  foodPoolIds: string[];
  marketPoolIds: string[];
  selectedPlaceIds: string[];
  aiMatchedPlaceIds: string[];
  aiSuggestedPlaceNames: string[];
  destinationBrief?: ILegDestinationBrief;
  vehicleRentalSuggestions: IVehicleRentalSuggestion[];
}

export interface ITripLegTransfer {
  id: string;
  date: string;
  fromLegId: string;
  toLegId: string;
  label: string;
  estimatedTravelMinutes?: number;
}

export interface ITripDocument extends Document {
  userId: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  /** Members (subset of memberIds) with view-only access. */
  viewerIds?: mongoose.Types.ObjectId[];
  votes?: { placeId: string; userId: string }[];
  title: string;
  destinationCity: string;
  destinationState?: string;
  destinationCountry: string;
  startDate: Date;
  endDate: Date;
  /** HH:mm — first-day arrival (single-destination trips only). */
  arrivalTime?: string;
  /** HH:mm — last-day departure (single-destination trips only). */
  departureTime?: string;
  hotelName?: string;
  hotelAddress?: string;
  hotelCoordinates?: ICoordinates;
  legs?: ITripLeg[];
  transfers?: ITripLegTransfer[];
  dailyStartTime: string;
  dailyEndTime: string;
  useFlexibleSchedule?: boolean;
  transportationMode: TransportationMode;
  travelStyle: TravelStyle;
  budgetLevel?: "budget" | "moderate" | "luxury";
  currency?: string;
  budgetAmount?: number;
  bookings?: TripBooking[];
  checklist?: ChecklistItem[];
  interests: string[];
  mustVisitPlaces: string[];
  excludedPlaces: string[];
  /** @deprecated */
  discoveredPlaceIds?: string[];
  discoveryPoolIds?: string[];
  foodPoolIds?: string[];
  marketPoolIds?: string[];
  destinationBrief?: ILegDestinationBrief;
  vehicleRentalSuggestions?: IVehicleRentalSuggestion[];
  notes?: string;
  status: TripStatus;
  isPublic: boolean;
  publicSlug?: string;
  /** Opt-in links to the suite's other apps (SpendLog trip, InFrame event). */
  links?: TripLinks;
  createdAt: Date;
  updatedAt: Date;
}

const CoordinatesSchema = new Schema<ICoordinates>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false },
);

const VehicleRentalSuggestionSchema = new Schema<IVehicleRentalSuggestion>(
  {
    googlePlaceId: { type: String, required: true },
    name: { type: String, required: true },
    address: { type: String },
    rating: { type: Number },
    userRatingCount: { type: Number },
    websiteUri: { type: String },
    googleMapsUrl: { type: String },
    phone: { type: String },
    distanceKm: { type: Number },
    vehicleTypes: { type: [String], default: ["scooter", "bike"] },
  },
  { _id: false },
);

const LegMarketGuideSchema = new Schema<ILegMarketGuide>(
  {
    placeId: { type: String },
    name: { type: String, required: true },
    whatToBuy: { type: [String], default: [] },
  },
  { _id: false },
);

const LegDestinationBriefSchema = new Schema<ILegDestinationBrief>(
  {
    specialties: { type: [String], default: [] },
    localFood: { type: [String], default: [] },
    markets: { type: [LegMarketGuideSchema], default: [] },
    festivals: { type: [String], default: [] },
    generalTips: { type: [String], default: [] },
    generatedAt: { type: String },
  },
  { _id: false },
);

const TripStaySchema = new Schema<ITripStay>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    coordinates: { type: CoordinatesSchema },
    googlePlaceId: { type: String },
    checkInDate: { type: String, required: true },
    checkOutDate: { type: String, required: true },
    checkInTime: { type: String, trim: true },
    checkOutTime: { type: String, trim: true },
    confirmationNumber: { type: String, trim: true },
    pricePerNight: { type: Number },
    currency: { type: String, trim: true },
    bookingUrl: { type: String, trim: true },
    notes: { type: String },
    rating: { type: Number },
  },
  { _id: false },
);

const TripDayTripSchema = new Schema<ITripDayTrip>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    date: { type: String },
    coordinates: { type: CoordinatesSchema },
  },
  { _id: false },
);

const TripLegSchema = new Schema<ITripLeg>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    baseCity: { type: String, required: true, trim: true },
    dayTripAreas: { type: [String], default: [] },
    dayTrips: { type: [TripDayTripSchema], default: [] },
    placeAreas: { type: Schema.Types.Mixed, default: {} },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    arrivalTime: { type: String, trim: true },
    departureTime: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: "" },
    hotelName: { type: String, trim: true },
    hotelAddress: { type: String, trim: true },
    hotelCoordinates: { type: CoordinatesSchema },
    stays: { type: [TripStaySchema], default: [] },
    order: { type: Number, required: true, default: 0 },
    discoveryPoolIds: { type: [String], default: [] },
    foodPoolIds: { type: [String], default: [] },
    marketPoolIds: { type: [String], default: [] },
    selectedPlaceIds: { type: [String], default: [] },
    aiMatchedPlaceIds: { type: [String], default: [] },
    aiSuggestedPlaceNames: { type: [String], default: [] },
    destinationBrief: { type: LegDestinationBriefSchema },
    vehicleRentalSuggestions: { type: [VehicleRentalSuggestionSchema], default: [] },
  },
  { _id: false },
);

const TripLegTransferSchema = new Schema<ITripLegTransfer>(
  {
    id: { type: String, required: true },
    date: { type: String, required: true },
    fromLegId: { type: String, required: true },
    toLegId: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    estimatedTravelMinutes: { type: Number },
  },
  { _id: false },
);

const TripBookingSchema = new Schema<TripBooking>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: BOOKING_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    provider: { type: String, trim: true },
    confirmationNumber: { type: String, trim: true },
    startDate: { type: String, required: true },
    startTime: { type: String },
    endDate: { type: String },
    endTime: { type: String },
    fromPlace: { type: String, trim: true },
    toPlace: { type: String, trim: true },
    transferId: { type: String },
    cost: { type: Number },
    currency: { type: String },
    url: { type: String, trim: true },
    notes: { type: String },
  },
  { _id: false },
);

const ChecklistItemSchema = new Schema<ChecklistItem>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    category: { type: String, enum: CHECKLIST_CATEGORIES, required: true },
    done: { type: Boolean, default: false },
    dueDate: { type: String },
    assigneeId: { type: String },
  },
  { _id: false },
);

const SuiteLinkSchema = new Schema<SuiteLink>(
  {
    enabled: { type: Boolean, required: true, default: false },
    status: { type: String, enum: ["pending", "linked", "error", "unlinked"], required: true, default: "pending" },
    remoteId: { type: String },
    url: { type: String },
    lastError: { type: String },
    linkedAt: { type: String },
    skippedMembers: {
      type: [new Schema({ sub: { type: String }, email: { type: String }, reason: { type: String } }, { _id: false })],
      default: undefined,
    },
  },
  { _id: false },
);

const TripLinksSchema = new Schema<TripLinks>(
  Object.fromEntries(SUITE_APPS.map((app) => [app, { type: SuiteLinkSchema }])),
  { _id: false },
);

const TripSchema = new Schema<ITripDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    memberIds: { type: [Schema.Types.ObjectId], ref: "User", default: [], index: true },
    viewerIds: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    votes: {
      type: [new Schema({ placeId: { type: String, required: true }, userId: { type: String, required: true } }, { _id: false })],
      default: [],
    },
    title: { type: String, required: true, trim: true },
    destinationCity: { type: String, required: true, trim: true },
    destinationState: { type: String, trim: true },
    destinationCountry: { type: String, trim: true, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    arrivalTime: { type: String, trim: true },
    departureTime: { type: String, trim: true },
    hotelName: { type: String, trim: true },
    hotelAddress: { type: String, trim: true },
    hotelCoordinates: { type: CoordinatesSchema },
    legs: { type: [TripLegSchema], default: [] },
    transfers: { type: [TripLegTransferSchema], default: [] },
    dailyStartTime: { type: String, default: "09:00" },
    dailyEndTime: { type: String, default: "20:00" },
    useFlexibleSchedule: { type: Boolean, default: false },
    transportationMode: {
      type: String,
      enum: ["Walking", "Cab", "Self Drive", "Bike", "Public Transport"],
      default: "Walking",
    },
    travelStyle: {
      type: String,
      enum: ["Relaxed", "Balanced", "Fast Paced"],
      default: "Balanced",
    },
    budgetLevel: {
      type: String,
      enum: ["budget", "moderate", "luxury"],
    },
    currency: { type: String, trim: true, uppercase: true },
    budgetAmount: { type: Number, min: 0 },
    bookings: { type: [TripBookingSchema], default: [] },
    checklist: { type: [ChecklistItemSchema], default: [] },
    interests: { type: [String], default: [] },
    mustVisitPlaces: { type: [String], default: [] },
    excludedPlaces: { type: [String], default: [] },
    discoveredPlaceIds: { type: [String], default: [] },
    discoveryPoolIds: { type: [String], default: [] },
    foodPoolIds: { type: [String], default: [] },
    marketPoolIds: { type: [String], default: [] },
    destinationBrief: { type: LegDestinationBriefSchema },
    vehicleRentalSuggestions: { type: [VehicleRentalSuggestionSchema], default: [] },
    notes: { type: String },
    status: {
      type: String,
      enum: ["draft", "active", "archived", "completed"],
      default: "draft",
    },
    isPublic: { type: Boolean, default: false },
    publicSlug: { type: String, unique: true, sparse: true },
    links: { type: TripLinksSchema },
  },
  { timestamps: true },
);

TripSchema.index({ userId: 1, status: 1 });
TripSchema.index({ userId: 1, updatedAt: -1 });

export const Trip: Model<ITripDocument> =
  mongoose.models.Trip ?? mongoose.model<ITripDocument>("Trip", TripSchema);
