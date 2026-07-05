import type { IItineraryDocument, IItineraryDay, IItineraryStop } from "@/models/Itinerary";
import type { Itinerary, ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";

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
  };
}

export function toItineraryDTO(doc: IItineraryDocument | Record<string, unknown>): Itinerary {
  const d = doc as IItineraryDocument;
  return {
    id: String(d._id),
    tripId: d.tripId.toString(),
    userId: d.userId.toString(),
    days: (d.days ?? []).map(toDayDTO),
    summary: d.summary,
    summaryGeneratedAt:
      d.summaryGeneratedAt instanceof Date
        ? d.summaryGeneratedAt.toISOString()
        : d.summaryGeneratedAt
          ? String(d.summaryGeneratedAt)
          : undefined,
    generatedAt: d.generatedAt instanceof Date ? d.generatedAt.toISOString() : String(d.generatedAt),
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : String(d.updatedAt),
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
    })),
  }));
}
