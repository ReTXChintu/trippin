import type { ITripDocument } from "@/models/Trip";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg, TripLegTransfer } from "@/modules/trips/types/trip-leg.types";

type TripDocLike = Pick<
  ITripDocument,
  | "_id"
  | "userId"
  | "memberIds"
  | "title"
  | "destinationCity"
  | "destinationState"
  | "destinationCountry"
  | "startDate"
  | "endDate"
  | "arrivalTime"
  | "departureTime"
  | "hotelName"
  | "hotelAddress"
  | "hotelCoordinates"
  | "legs"
  | "transfers"
  | "dailyStartTime"
  | "dailyEndTime"
  | "useFlexibleSchedule"
  | "transportationMode"
  | "travelStyle"
  | "budgetLevel"
  | "interests"
  | "mustVisitPlaces"
  | "excludedPlaces"
  | "discoveredPlaceIds"
  | "discoveryPoolIds"
  | "foodPoolIds"
  | "marketPoolIds"
  | "destinationBrief"
  | "vehicleRentalSuggestions"
  | "selectedPlaceIds"
  | "notes"
  | "status"
  | "isPublic"
  | "publicSlug"
  | "createdAt"
  | "updatedAt"
>;

function toPlainCoordinates(
  coords?: { lat?: number; lng?: number } | null,
): Trip["hotelCoordinates"] {
  if (coords?.lat == null || coords?.lng == null) return undefined;
  return { lat: coords.lat, lng: coords.lng };
}

function toStringArray(value?: string[] | null): string[] {
  return value ? [...value] : [];
}

function toTripLeg(leg: NonNullable<ITripDocument["legs"]>[number]): TripLeg {
  return {
    id: leg.id,
    name: leg.name,
    baseCity: leg.baseCity,
    dayTripAreas: toStringArray(leg.dayTripAreas),
    startDate: leg.startDate,
    endDate: leg.endDate,
    arrivalTime: leg.arrivalTime,
    departureTime: leg.departureTime,
    state: leg.state,
    country: leg.country,
    hotelName: leg.hotelName,
    hotelAddress: leg.hotelAddress,
    hotelCoordinates: toPlainCoordinates(leg.hotelCoordinates),
    order: leg.order,
    discoveryPoolIds: toStringArray(leg.discoveryPoolIds),
    foodPoolIds: toStringArray(leg.foodPoolIds),
    marketPoolIds: toStringArray(leg.marketPoolIds),
    destinationBrief: leg.destinationBrief
      ? {
          specialties: toStringArray(leg.destinationBrief.specialties),
          localFood: toStringArray(leg.destinationBrief.localFood),
          markets: (leg.destinationBrief.markets ?? []).map((m) => ({
            placeId: m.placeId,
            name: m.name,
            whatToBuy: toStringArray(m.whatToBuy),
          })),
          generalTips: toStringArray(leg.destinationBrief.generalTips),
          generatedAt: leg.destinationBrief.generatedAt,
        }
      : undefined,
    vehicleRentalSuggestions: (leg.vehicleRentalSuggestions ?? []).map((r) => ({
      googlePlaceId: r.googlePlaceId,
      name: r.name,
      address: r.address,
      rating: r.rating,
      userRatingCount: r.userRatingCount,
      websiteUri: r.websiteUri,
      googleMapsUrl: r.googleMapsUrl,
      phone: r.phone,
      distanceKm: r.distanceKm,
      vehicleTypes: toStringArray(r.vehicleTypes),
    })),
  };
}

function toTripLegTransfer(
  transfer: NonNullable<ITripDocument["transfers"]>[number],
): TripLegTransfer {
  return {
    id: transfer.id,
    date: transfer.date,
    fromLegId: transfer.fromLegId,
    toLegId: transfer.toLegId,
    label: transfer.label,
    estimatedTravelMinutes: transfer.estimatedTravelMinutes,
  };
}

export function toTripDTO(doc: TripDocLike): Trip {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    memberIds: (doc.memberIds ?? []).map((id) => id.toString()),
    title: doc.title,
    destinationCity: doc.destinationCity,
    destinationState: doc.destinationState,
    destinationCountry: doc.destinationCountry,
    startDate: new Date(doc.startDate).toISOString(),
    endDate: new Date(doc.endDate).toISOString(),
    arrivalTime: doc.arrivalTime,
    departureTime: doc.departureTime,
    hotelName: doc.hotelName,
    hotelAddress: doc.hotelAddress,
    hotelCoordinates: toPlainCoordinates(doc.hotelCoordinates),
    legs: (doc.legs ?? []).map(toTripLeg),
    transfers: (doc.transfers ?? []).map(toTripLegTransfer),
    dailyStartTime: doc.dailyStartTime,
    dailyEndTime: doc.dailyEndTime,
    useFlexibleSchedule: doc.useFlexibleSchedule ?? false,
    transportationMode: doc.transportationMode,
    travelStyle: doc.travelStyle,
    budgetLevel: doc.budgetLevel,
    interests: toStringArray(doc.interests),
    mustVisitPlaces: toStringArray(doc.mustVisitPlaces),
    excludedPlaces: toStringArray(doc.excludedPlaces),
    discoveryPoolIds: toStringArray(doc.discoveryPoolIds),
    foodPoolIds: toStringArray(doc.foodPoolIds),
    marketPoolIds: toStringArray(doc.marketPoolIds),
    destinationBrief: doc.destinationBrief
      ? {
          specialties: toStringArray(doc.destinationBrief.specialties),
          localFood: toStringArray(doc.destinationBrief.localFood),
          markets: (doc.destinationBrief.markets ?? []).map((m) => ({
            placeId: m.placeId,
            name: m.name,
            whatToBuy: toStringArray(m.whatToBuy),
          })),
          generalTips: toStringArray(doc.destinationBrief.generalTips),
          generatedAt: doc.destinationBrief.generatedAt,
        }
      : undefined,
    vehicleRentalSuggestions: (doc.vehicleRentalSuggestions ?? []).map((r) => ({
      googlePlaceId: r.googlePlaceId,
      name: r.name,
      address: r.address,
      rating: r.rating,
      userRatingCount: r.userRatingCount,
      websiteUri: r.websiteUri,
      googleMapsUrl: r.googleMapsUrl,
      phone: r.phone,
      distanceKm: r.distanceKm,
      vehicleTypes: toStringArray(r.vehicleTypes),
    })),
    selectedPlaceIds: toStringArray(
      doc.selectedPlaceIds?.length
        ? doc.selectedPlaceIds
        : doc.discoveredPlaceIds,
    ),
    notes: doc.notes,
    status: doc.status,
    isPublic: doc.isPublic,
    publicSlug: doc.publicSlug,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export function toTripSummary(doc: TripDocLike) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    destinationCity: doc.destinationCity,
    destinationCountry: doc.destinationCountry,
    startDate: new Date(doc.startDate).toISOString(),
    endDate: new Date(doc.endDate).toISOString(),
    status: doc.status,
  };
}
