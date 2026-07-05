import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as placesApi from "@/modules/places/api/places.api";

export function useTripPlacesQuery(tripId: string, view: "selected" | "pool" = "selected") {
  return useQuery({
    queryKey: ["trip-places", tripId, view],
    queryFn: () => placesApi.getTripPlaces(tripId, view),
    enabled: !!tripId,
  });
}

function useInvalidateTripPlaces(tripId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["trip-places", tripId] });
    queryClient.invalidateQueries({ queryKey: ["trips", tripId] });
  };
}

export function useDiscoverPlaces(tripId: string) {
  const invalidate = useInvalidateTripPlaces(tripId);
  return useMutation({
    mutationFn: (opts?: { forceRefresh?: boolean; legId?: string }) =>
      placesApi.discoverPlacesForTrip(tripId, opts),
    onSuccess: invalidate,
  });
}

export function useAddPlaceToTrip(tripId: string) {
  const invalidate = useInvalidateTripPlaces(tripId);
  return useMutation({
    mutationFn: (placeId: string) => placesApi.addPlaceToTrip(tripId, placeId),
    onSuccess: invalidate,
  });
}

export function useBulkAddPlacesToTrip(tripId: string) {
  const invalidate = useInvalidateTripPlaces(tripId);
  return useMutation({
    mutationFn: (placeIds: string[]) => placesApi.bulkAddPlacesToTrip(tripId, placeIds),
    onSuccess: invalidate,
  });
}

export function useRemovePlaceFromTrip(tripId: string) {
  const invalidate = useInvalidateTripPlaces(tripId);
  return useMutation({
    mutationFn: (placeId: string) => placesApi.removePlaceFromTrip(tripId, placeId),
    onSuccess: invalidate,
  });
}

export function useBulkRemovePlacesFromTrip(tripId: string) {
  const invalidate = useInvalidateTripPlaces(tripId);
  return useMutation({
    mutationFn: (placeIds: string[]) => placesApi.bulkRemovePlacesFromTrip(tripId, placeIds),
    onSuccess: invalidate,
  });
}

export function useAddPlaceFromSearch(tripId: string) {
  const invalidate = useInvalidateTripPlaces(tripId);
  return useMutation({
    mutationFn: (placeId: string) => placesApi.addPlaceFromSearch(tripId, placeId),
    onSuccess: invalidate,
  });
}

export function useSearchPlaces() {
  return useMutation({
    mutationFn: placesApi.searchPlaces,
  });
}

export function usePlaceDetailRich(tripId: string) {
  return useMutation({
    mutationFn: (placeId: string) => placesApi.getPlaceDetailRich(tripId, placeId),
  });
}
