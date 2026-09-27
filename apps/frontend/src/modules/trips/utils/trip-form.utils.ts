import type { TripFormValues } from "@/modules/trips/validators/trip.validator";
import type { Trip } from "@/modules/trips/types/trip.types";

export function tripToFormValues(trip: Trip): TripFormValues {
  return {
    title: trip.title,
    destinationCity: trip.destinationCity,
    destinationState: trip.destinationState ?? "",
    destinationCountry: trip.destinationCountry,
    startDate: trip.startDate.slice(0, 10),
    endDate: trip.endDate.slice(0, 10),
    arrivalTime: trip.arrivalTime ?? "",
    departureTime: trip.departureTime ?? "",
    hotelName: trip.hotelName ?? "",
    hotelAddress: trip.hotelAddress ?? "",
    hotelLat: trip.hotelCoordinates?.lat.toString() ?? "",
    hotelLng: trip.hotelCoordinates?.lng.toString() ?? "",
    dailyStartTime: trip.dailyStartTime,
    dailyEndTime: trip.dailyEndTime,
    useFlexibleSchedule: trip.useFlexibleSchedule,
    transportationMode: trip.transportationMode,
    travelStyle: trip.travelStyle,
    budgetLevel: trip.budgetLevel,
    interests: trip.interests,
    mustVisitPlaces: trip.mustVisitPlaces,
    excludedPlaces: trip.excludedPlaces,
    notes: trip.notes ?? "",
    status: trip.status,
    legs: trip.legs,
    transfers: trip.transfers,
  };
}
