import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as itineraryApi from "@/modules/itinerary/api/itinerary.api";

export function useItineraryQuery(tripId: string) {
  return useQuery({
    queryKey: ["itinerary", tripId],
    queryFn: () => itineraryApi.getItinerary(tripId),
    enabled: !!tripId,
  });
}

function useInvalidateItinerary(tripId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["itinerary", tripId] });
    queryClient.invalidateQueries({ queryKey: ["trips", tripId] });
  };
}

export function useGenerateItinerary(tripId: string) {
  const invalidate = useInvalidateItinerary(tripId);
  return useMutation({
    mutationFn: () => itineraryApi.generateItinerary(tripId),
    onSuccess: invalidate,
  });
}

export function useSummarizeItinerary(tripId: string) {
  const invalidate = useInvalidateItinerary(tripId);
  return useMutation({
    mutationFn: () => itineraryApi.summarizeItinerary(tripId),
    onSuccess: invalidate,
  });
}

export function useOptimizeItinerary(tripId: string) {
  const invalidate = useInvalidateItinerary(tripId);
  return useMutation({
    mutationFn: () => itineraryApi.optimizeItinerary(tripId),
    onSuccess: invalidate,
  });
}

export function useEnrichItinerary(tripId: string) {
  const invalidate = useInvalidateItinerary(tripId);
  return useMutation({
    mutationFn: () => itineraryApi.enrichItinerary(tripId),
    onSuccess: invalidate,
  });
}

export function useReorderItineraryStops(tripId: string) {
  const invalidate = useInvalidateItinerary(tripId);
  return useMutation({
    mutationFn: ({ dayNumber, stopIds }: { dayNumber: number; stopIds: string[] }) =>
      itineraryApi.reorderItineraryStops(tripId, dayNumber, stopIds),
    onSuccess: invalidate,
  });
}
