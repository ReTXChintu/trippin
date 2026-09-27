import type {
  IAiItineraryCandidate,
  IItineraryDocument,
  IItineraryDay,
  IItinerarySnapshot,
  IItineraryStop,
  IOptionalItineraryPlace,
} from "@/models/Itinerary";
import type {
  AiItineraryCandidate,
  Itinerary,
  ItineraryDay,
  ItineraryStop,
  OptionalItineraryPlace,
} from "@/modules/itinerary/types";

function toStopDTO(stop: IItineraryStop): ItineraryStop {
  return {
    id: stop.id,
    placeId: stop.placeId,
    placeName: stop.placeName,
    sequence: stop.sequence,
    arrivalTime: stop.arrivalTime,
    departureTime: stop.departureTime,
    visitDurationMinutes: stop.visitDurationMinutes,
    travelDurationMinutes: stop.travelDurationMinutes,
    coordinates: stop.coordinates
      ? { lat: stop.coordinates.lat, lng: stop.coordinates.lng }
      : undefined,
    category: stop.category,
    stopType: stop.stopType,
    legId: stop.legId,
    notes: stop.notes,
    visitIntel: stop.visitIntel
      ? {
          bestTime: stop.visitIntel.bestTime,
          avoidTime: stop.visitIntel.avoidTime,
          hypeLevel: stop.visitIntel.hypeLevel,
          why: stop.visitIntel.why,
          tips: stop.visitIntel.tips ? [...stop.visitIntel.tips] : undefined,
        }
      : undefined,
    aiNotes: stop.aiNotes,
    mealType: stop.mealType,
    locked: stop.locked,
    userAdded: stop.userAdded,
    fixedStartTime: stop.fixedStartTime,
    warnings: stop.warnings?.length ? [...stop.warnings] : undefined,
    openingHoursToday: stop.openingHoursToday,
    travelSource: stop.travelSource,
    travelDistanceKm: stop.travelDistanceKm,
    cost: stop.cost,
    status: stop.status,
  };
}

function toDayDTO(day: IItineraryDay): ItineraryDay {
  return {
    dayNumber: day.dayNumber,
    date: day.date,
    stops: day.stops.map(toStopDTO),
    legId: day.legId,
    legName: day.legName,
    dayType: day.dayType,
    transferLabel: day.transferLabel,
    dressCode: day.dressCode,
  };
}

function toOptionalPlaceDTO(place: IOptionalItineraryPlace): OptionalItineraryPlace {
  return {
    placeId: place.placeId,
    placeName: place.placeName,
    category: place.category,
    coordinates: place.coordinates
      ? { lat: place.coordinates.lat, lng: place.coordinates.lng }
      : undefined,
    legId: place.legId,
    reason: place.reason,
  };
}

function toAiCandidateDTO(candidate: IAiItineraryCandidate): AiItineraryCandidate {
  return {
    legId: candidate.legId,
    days: candidate.days.map(toDayDTO),
    optionalPlaces: candidate.optionalPlaces.map(toOptionalPlaceDTO),
    generatedAt:
      candidate.generatedAt instanceof Date
        ? candidate.generatedAt.toISOString()
        : String(candidate.generatedAt),
  };
}

export function toItineraryDTO(doc: IItineraryDocument | Record<string, unknown>): Itinerary {
  const d = doc as IItineraryDocument;
  return {
    id: String(d._id),
    tripId: d.tripId.toString(),
    userId: d.userId.toString(),
    days: (d.days ?? []).map(toDayDTO),
    optionalPlaces: (d.optionalPlaces ?? []).map(toOptionalPlaceDTO),
    aiCandidates: (d.aiCandidates ?? []).map(toAiCandidateDTO),
    summary: d.summary,
    summaryGeneratedAt:
      d.summaryGeneratedAt instanceof Date
        ? d.summaryGeneratedAt.toISOString()
        : d.summaryGeneratedAt
          ? String(d.summaryGeneratedAt)
          : undefined,
    generatedAt: d.generatedAt instanceof Date ? d.generatedAt.toISOString() : String(d.generatedAt),
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : String(d.updatedAt),
    undoLabel: d.history?.length ? d.history[d.history.length - 1].label : undefined,
    historyCount: d.history?.length ?? 0,
  };
}

/** Days/optionalPlaces of a stored snapshot, in DTO form (used when restoring an undo). */
export function snapshotToState(snapshot: IItinerarySnapshot): {
  days: ItineraryDay[];
  optionalPlaces: OptionalItineraryPlace[];
} {
  return {
    days: (snapshot.days ?? []).map(toDayDTO),
    optionalPlaces: (snapshot.optionalPlaces ?? []).map(toOptionalPlaceDTO),
  };
}

export function toPlainItineraryDays(days: ItineraryDay[]): ItineraryDay[] {
  return days.map((day) => ({
    dayNumber: day.dayNumber,
    date: day.date,
    legId: day.legId,
    legName: day.legName,
    dayType: day.dayType,
    transferLabel: day.transferLabel,
    dressCode: day.dressCode,
    stops: day.stops.map((stop) => ({
      id: stop.id,
      placeId: stop.placeId,
      placeName: stop.placeName,
      sequence: stop.sequence,
      arrivalTime: stop.arrivalTime,
      departureTime: stop.departureTime,
      visitDurationMinutes: stop.visitDurationMinutes,
      travelDurationMinutes: stop.travelDurationMinutes,
      coordinates: stop.coordinates
        ? { lat: stop.coordinates.lat, lng: stop.coordinates.lng }
        : undefined,
      category: stop.category,
      stopType: stop.stopType,
      legId: stop.legId,
      notes: stop.notes,
      visitIntel: stop.visitIntel,
      aiNotes: stop.aiNotes,
      mealType: stop.mealType,
      locked: stop.locked || undefined,
      userAdded: stop.userAdded || undefined,
      fixedStartTime: stop.fixedStartTime,
      warnings: stop.warnings?.length ? [...stop.warnings] : undefined,
      openingHoursToday: stop.openingHoursToday,
      travelSource: stop.travelSource,
      travelDistanceKm: stop.travelDistanceKm,
      cost: stop.cost,
      status: stop.status,
    })),
  }));
}

export function toPlainOptionalPlaces(places: OptionalItineraryPlace[]): OptionalItineraryPlace[] {
  return places.map((p) => ({
    placeId: p.placeId,
    placeName: p.placeName,
    category: p.category,
    coordinates: p.coordinates ? { lat: p.coordinates.lat, lng: p.coordinates.lng } : undefined,
    legId: p.legId,
    reason: p.reason,
  }));
}

export function toPlainAiCandidate(candidate: AiItineraryCandidate): AiItineraryCandidate {
  return {
    legId: candidate.legId,
    days: toPlainItineraryDays(candidate.days),
    optionalPlaces: toPlainOptionalPlaces(candidate.optionalPlaces),
    generatedAt: candidate.generatedAt,
  };
}
