import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as itineraryApi from "@/modules/itinerary/api/itinerary.api";
import type { Itinerary } from "@/modules/itinerary/types";

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
    queryClient.invalidateQueries({ queryKey: ["itinerary-comparison", tripId] });
    queryClient.invalidateQueries({ queryKey: ["itinerary-route", tripId] });
    queryClient.invalidateQueries({ queryKey: ["trips", tripId] });
  };
}

/** Writes the server's returned itinerary straight into the cache (no refetch round-trip). */
function useSetItinerary(tripId: string) {
  const queryClient = useQueryClient();
  return (itinerary: Itinerary) => {
    queryClient.setQueryData(["itinerary", tripId], { itinerary });
    queryClient.invalidateQueries({ queryKey: ["itinerary-route", tripId] });
    queryClient.invalidateQueries({ queryKey: ["itinerary-comparison", tripId] });
  };
}

export function useGenerateItinerary(tripId: string) {
  const invalidate = useInvalidateItinerary(tripId);
  return useMutation({
    mutationFn: (legId?: string) => itineraryApi.generateItinerary(tripId, legId),
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

export function useDayRouteQuery(tripId: string, dayNumber: number | undefined, legId?: string) {
  return useQuery({
    queryKey: ["itinerary-route", tripId, dayNumber, legId],
    queryFn: () => itineraryApi.getItineraryRoutes(tripId, { legId, dayNumber }),
    enabled: !!tripId && !!dayNumber,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });
}

export function useItineraryComparisonQuery(tripId: string, legId?: string) {
  return useQuery({
    queryKey: ["itinerary-comparison", tripId, legId],
    queryFn: () => itineraryApi.getItineraryComparison(tripId, legId),
    enabled: !!tripId,
  });
}

export function useGenerateAiCandidate(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (legId?: string) => itineraryApi.generateAiCandidate(tripId, legId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["itinerary-comparison", tripId] }),
  });
}

export function useKeepSystemItinerary(tripId: string) {
  const invalidate = useInvalidateItinerary(tripId);
  return useMutation({
    mutationFn: (legId?: string) => itineraryApi.keepSystemItinerary(tripId, legId),
    onSuccess: invalidate,
  });
}

export function useKeepAiItinerary(tripId: string) {
  const invalidate = useInvalidateItinerary(tripId);
  return useMutation({
    mutationFn: (legId?: string) => itineraryApi.keepAiItinerary(tripId, legId),
    onSuccess: invalidate,
  });
}

export function useApplyMergedDays(tripId: string) {
  const invalidate = useInvalidateItinerary(tripId);
  return useMutation({
    mutationFn: (params: itineraryApi.ApplyMergedDaysParams) => itineraryApi.applyMergedDays(tripId, params),
    onSuccess: invalidate,
  });
}

export function useMovePlaceToDay(tripId: string) {
  const invalidate = useInvalidateItinerary(tripId);
  return useMutation({
    mutationFn: (params: { placeId: string; toDayNumber: number; legId?: string }) =>
      itineraryApi.movePlaceToDay(tripId, params),
    onSuccess: invalidate,
  });
}

export function useGenerateLegGuide(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (legId: string) => itineraryApi.generateLegGuide(tripId, legId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips", tripId] }),
  });
}

export function useReorderItineraryStops(tripId: string) {
  const queryClient = useQueryClient();
  const setItinerary = useSetItinerary(tripId);
  return useMutation({
    mutationFn: ({ dayNumber, stopIds }: { dayNumber: number; stopIds: string[] }) =>
      itineraryApi.reorderItineraryStops(tripId, dayNumber, stopIds),
    // Show the new order immediately; the server returns re-timed stops a moment later.
    onMutate: async ({ dayNumber, stopIds }) => {
      await queryClient.cancelQueries({ queryKey: ["itinerary", tripId] });
      const previous = queryClient.getQueryData<{ itinerary: Itinerary | null }>(["itinerary", tripId]);
      if (previous?.itinerary) {
        const days = previous.itinerary.days.map((day) => {
          if (day.dayNumber !== dayNumber) return day;
          const byId = new Map(day.stops.map((s) => [s.id, s]));
          const stops = stopIds.map((id) => byId.get(id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
          return { ...day, stops };
        });
        queryClient.setQueryData(["itinerary", tripId], { itinerary: { ...previous.itinerary, days } });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["itinerary", tripId], context.previous);
    },
    onSuccess: (data) => setItinerary(data.itinerary),
  });
}

export function useSetStopLock(tripId: string) {
  const setItinerary = useSetItinerary(tripId);
  return useMutation({
    mutationFn: (params: { dayNumber: number; stopId: string; locked: boolean }) =>
      itineraryApi.setStopLock(tripId, params),
    onSuccess: (data) => setItinerary(data.itinerary),
  });
}

export function useAddStop(tripId: string) {
  const setItinerary = useSetItinerary(tripId);
  return useMutation({
    mutationFn: (params: itineraryApi.AddStopParams) => itineraryApi.addStop(tripId, params),
    onSuccess: (data) => setItinerary(data.itinerary),
  });
}

export function useUpdateStop(tripId: string) {
  const setItinerary = useSetItinerary(tripId);
  return useMutation({
    mutationFn: (params: itineraryApi.UpdateStopParams) => itineraryApi.updateStop(tripId, params),
    onSuccess: (data) => setItinerary(data.itinerary),
  });
}

export function useRemoveStop(tripId: string) {
  const setItinerary = useSetItinerary(tripId);
  return useMutation({
    mutationFn: (params: { dayNumber: number; stopId: string }) => itineraryApi.removeStop(tripId, params),
    onSuccess: (data) => setItinerary(data.itinerary),
  });
}

export function useUndoItinerary(tripId: string) {
  const setItinerary = useSetItinerary(tripId);
  return useMutation({
    mutationFn: () => itineraryApi.undoItinerary(tripId),
    onSuccess: (data) => setItinerary(data.itinerary),
  });
}

export function useMealSuggestionsQuery(tripId: string, dayNumber: number, stopId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["meal-suggestions", tripId, dayNumber, stopId],
    queryFn: () => itineraryApi.getMealSuggestions(tripId, { dayNumber, stopId }),
    enabled: enabled && !!tripId,
    staleTime: 1000 * 60 * 10,
    retry: false,
  });
}

export function useMoveItineraryStop(tripId: string) {
  const invalidate = useInvalidateItinerary(tripId);
  return useMutation({
    mutationFn: ({
      stopId,
      fromDayNumber,
      toDayNumber,
    }: {
      stopId: string;
      fromDayNumber: number;
      toDayNumber: number;
    }) => itineraryApi.moveItineraryStop(tripId, stopId, fromDayNumber, toDayNumber),
    onSuccess: invalidate,
  });
}

export function useUpdateMealSlot(tripId: string) {
  const invalidate = useInvalidateItinerary(tripId);
  return useMutation({
    mutationFn: (params: itineraryApi.UpdateMealSlotParams) => itineraryApi.updateMealSlot(tripId, params),
    onSuccess: invalidate,
  });
}

export function useSetStopStatus(tripId: string) {
  const setItinerary = useSetItinerary(tripId);
  return useMutation({
    mutationFn: (params: { dayNumber: number; stopId: string; status: "done" | "skipped" | null }) =>
      itineraryApi.setStopStatus(tripId, params),
    onSuccess: (data) => setItinerary(data.itinerary),
  });
}

export function useAiEditPlan(tripId: string) {
  const setItinerary = useSetItinerary(tripId);
  return useMutation({
    mutationFn: (instruction: string) => itineraryApi.aiEditPlan(tripId, instruction),
    onSuccess: (data) => setItinerary(data.itinerary),
  });
}

export function useReplanFromNow(tripId: string) {
  const setItinerary = useSetItinerary(tripId);
  return useMutation({
    mutationFn: (params: { dayNumber: number; time: string }) => itineraryApi.replanFromNow(tripId, params),
    onSuccess: (data) => setItinerary(data.itinerary),
  });
}
