import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as placesApi from "@/modules/places/api/places.api";
import { usePlaceAreaFor } from "@/modules/places/hooks/useLegAreas";

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
  const areaId = usePlaceAreaFor(legId);
  return useMutation({
    mutationFn: (placeId: string) => placesApi.addPlaceToTrip(tripId, legId, placeId, areaId),
    onSuccess: invalidate,
  });
}

export function useBulkAddPlacesToTrip(tripId: string, legId: string) {
  const invalidate = useInvalidateTripPlaces(tripId);
  const areaId = usePlaceAreaFor(legId);
  return useMutation({
    mutationFn: (placeIds: string[]) => placesApi.bulkAddPlacesToTrip(tripId, legId, placeIds, areaId),
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
  const areaId = usePlaceAreaFor(legId);
  return useMutation({
    mutationFn: (placeId: string) => placesApi.addPlaceFromSearch(tripId, legId, placeId, areaId),
    onSuccess: invalidate,
  });
}

export function useSetPlaceArea(tripId: string, legId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ placeIds, areaId }: { placeIds: string[]; areaId: string }) => placesApi.setPlaceArea(tripId, legId, placeIds, areaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips", tripId] }),
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

export function useSearchArea(tripId: string) {
  const invalidate = useInvalidateTripPlaces(tripId);
  return useMutation({
    mutationFn: (params: Parameters<typeof placesApi.searchArea>[1]) => placesApi.searchArea(tripId, params),
    onSuccess: invalidate,
  });
}
