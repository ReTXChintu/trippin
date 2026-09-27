import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as placesApi from "@/modules/places/api/places.api";

export function useTripPlacesQuery(tripId: string, view: "selected" | "pool" = "selected", legId?: string) {
  return useQuery({
    queryKey: ["trip-places", tripId, view, legId],
    queryFn: () => placesApi.getTripPlaces(tripId, view, legId),
    enabled: !!tripId && (view !== "selected" || !!legId),
  });
}

export function useTripEatShopQuery(tripId: string) {
  return useQuery({
    queryKey: ["trip-places", tripId, "eat-shop"],
    queryFn: () => placesApi.getTripEatShopPool(tripId),
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

export function useAddPlaceToTrip(tripId: string, legId: string) {
  const invalidate = useInvalidateTripPlaces(tripId);
  return useMutation({
    mutationFn: (placeId: string) => placesApi.addPlaceToTrip(tripId, legId, placeId),
    onSuccess: invalidate,
  });
}

export function useBulkAddPlacesToTrip(tripId: string, legId: string) {
  const invalidate = useInvalidateTripPlaces(tripId);
  return useMutation({
    mutationFn: (placeIds: string[]) => placesApi.bulkAddPlacesToTrip(tripId, legId, placeIds),
    onSuccess: invalidate,
  });
}

export function useRemovePlaceFromTrip(tripId: string, legId: string) {
  const invalidate = useInvalidateTripPlaces(tripId);
  return useMutation({
    mutationFn: (placeId: string) => placesApi.removePlaceFromTrip(tripId, legId, placeId),
    onSuccess: invalidate,
  });
}

export function useBulkRemovePlacesFromTrip(tripId: string, legId: string) {
  const invalidate = useInvalidateTripPlaces(tripId);
  return useMutation({
    mutationFn: (placeIds: string[]) => placesApi.bulkRemovePlacesFromTrip(tripId, legId, placeIds),
    onSuccess: invalidate,
  });
}

export function useAddPlaceFromSearch(tripId: string, legId: string) {
  const invalidate = useInvalidateTripPlaces(tripId);
  return useMutation({
    mutationFn: (placeId: string) => placesApi.addPlaceFromSearch(tripId, legId, placeId),
    onSuccess: invalidate,
  });
}

export function useDiscoverVehicleRentals(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (legId: string) => placesApi.discoverVehicleRentalsForLeg(tripId, legId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips", tripId] }),
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
