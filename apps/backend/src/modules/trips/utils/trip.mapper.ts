import type { ITripDocument } from "@/models/Trip";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg, TripLegTransfer } from "@/modules/trips/types/trip-leg.types";
import { defaultCurrencyFor } from "@/utils/currency";
import { SUITE_APPS, type TripLinks } from "@/modules/suite/types/suite.types";

type TripDocLike = Pick<
  ITripDocument,
  | "_id"
  | "userId"
  | "memberIds"
  | "viewerIds"
  | "votes"
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
  | "currency"
  | "budgetAmount"
  | "bookings"
  | "checklist"
  | "interests"
  | "mustVisitPlaces"
  | "excludedPlaces"
  | "discoveryPoolIds"
  | "foodPoolIds"
  | "marketPoolIds"
  | "destinationBrief"
  | "vehicleRentalSuggestions"
  | "notes"
  | "status"
  | "isPublic"
  | "publicSlug"
  | "links"
  | "createdAt"
  | "updatedAt"
>;

function toPlainCoordinates(
  coords?: { lat?: number; lng?: number } | null,
): Trip["hotelCoordinates"] {
  if (coords?.lat == null || coords?.lng == null) return undefined;
  return { lat: coords.lat, lng: coords.lng };
}

function toTripLinks(links?: TripLinks | null): TripLinks {
  const out: TripLinks = {};
  for (const app of SUITE_APPS) {
    const link = links?.[app];
    if (!link) continue;
    out[app] = {
      enabled: Boolean(link.enabled),
      status: link.status ?? (link.enabled ? "pending" : "unlinked"),
      remoteId: link.remoteId || undefined,
      url: link.url || undefined,
      lastError: link.lastError || undefined,
      linkedAt: link.linkedAt || undefined,
      skippedMembers: link.skippedMembers?.length
        ? link.skippedMembers.map((m) => ({ sub: m.sub ?? null, email: m.email ?? "", reason: m.reason ?? "" }))
        : undefined,
    };
  }
  return out;
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
    placeAreas: leg.placeAreas && typeof leg.placeAreas === "object" ? { ...(leg.placeAreas as Record<string, string>) } : {},
    // Trips saved before day trips had dates only have the names — list those.
    dayTrips: leg.dayTrips?.length
      ? leg.dayTrips.map((d) => ({
          id: d.id,
          name: d.name,
          date: d.date || undefined,
          coordinates: d.coordinates ? { lat: d.coordinates.lat, lng: d.coordinates.lng } : undefined,
        }))
      : toStringArray(leg.dayTripAreas).map((name, i) => ({ id: `area-${i}`, name })),
    startDate: leg.startDate,
    endDate: leg.endDate,
    arrivalTime: leg.arrivalTime,
    departureTime: leg.departureTime,
    state: leg.state,
    country: leg.country,
    hotelName: leg.hotelName,
    hotelAddress: leg.hotelAddress,
    hotelCoordinates: toPlainCoordinates(leg.hotelCoordinates),
    stays: (leg.stays ?? []).map((stay) => ({
      id: stay.id,
      name: stay.name,
      address: stay.address,
      coordinates: toPlainCoordinates(stay.coordinates),
      googlePlaceId: stay.googlePlaceId,
      checkInDate: stay.checkInDate,
      checkOutDate: stay.checkOutDate,
      checkInTime: stay.checkInTime,
      checkOutTime: stay.checkOutTime,
      confirmationNumber: stay.confirmationNumber,
      pricePerNight: stay.pricePerNight,
      currency: stay.currency,
      bookingUrl: stay.bookingUrl,
      notes: stay.notes,
      rating: stay.rating,
    })),
    order: leg.order,
    discoveryPoolIds: toStringArray(leg.discoveryPoolIds),
    foodPoolIds: toStringArray(leg.foodPoolIds),
    marketPoolIds: toStringArray(leg.marketPoolIds),
    selectedPlaceIds: toStringArray(leg.selectedPlaceIds),
    aiMatchedPlaceIds: toStringArray(leg.aiMatchedPlaceIds),
    aiSuggestedPlaceNames: toStringArray(leg.aiSuggestedPlaceNames),
    destinationBrief: leg.destinationBrief
      ? {
          specialties: toStringArray(leg.destinationBrief.specialties),
          localFood: toStringArray(leg.destinationBrief.localFood),
          markets: (leg.destinationBrief.markets ?? []).map((m) => ({
            placeId: m.placeId,
            name: m.name,
            whatToBuy: toStringArray(m.whatToBuy),
          })),
          festivals: toStringArray(leg.destinationBrief.festivals),
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
    viewerIds: (doc.viewerIds ?? []).map((id) => id.toString()),
    // Tolerate a malformed field rather than failing every trip list it appears in.
    placeVotes: (Array.isArray(doc.votes) ? doc.votes : []).reduce<Record<string, string[]>>((acc, v) => {
      if (v?.placeId && v.userId) (acc[v.placeId] ??= []).push(String(v.userId));
      return acc;
    }, {}),
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
    currency: doc.currency || defaultCurrencyFor(doc.destinationCountry),
    budgetAmount: doc.budgetAmount,
    bookings: (doc.bookings ?? []).map((b) => ({
      id: b.id,
      type: b.type,
      title: b.title,
      provider: b.provider,
      confirmationNumber: b.confirmationNumber,
      startDate: b.startDate,
      startTime: b.startTime,
      endDate: b.endDate,
      endTime: b.endTime,
      fromPlace: b.fromPlace,
      toPlace: b.toPlace,
      transferId: b.transferId,
      cost: b.cost,
      currency: b.currency,
      url: b.url,
      notes: b.notes,
    })),
    checklist: (doc.checklist ?? []).map((c) => ({
      id: c.id,
      text: c.text,
      category: c.category,
      done: Boolean(c.done),
      dueDate: c.dueDate,
      assigneeId: c.assigneeId,
    })),
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
          festivals: toStringArray(doc.destinationBrief.festivals),
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
    notes: doc.notes,
    status: doc.status,
    isPublic: doc.isPublic,
    publicSlug: doc.publicSlug,
    links: toTripLinks(doc.links),
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
