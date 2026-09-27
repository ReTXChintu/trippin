import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as tripsApi from "@/modules/trips/api/trips.api";
import type { TripStatus } from "@/types";
import type { Trip } from "@/modules/trips/types/trip.types";

export function useTripsQuery(status?: TripStatus) {
  return useQuery({
    queryKey: ["trips", status ?? "all"],
    queryFn: () => tripsApi.listTrips(status),
  });
}

export function useTripQuery(id: string) {
  return useQuery({
    queryKey: ["trips", id],
    queryFn: () => tripsApi.getTrip(id),
    enabled: !!id,
  });
}

export function useDashboardQuery() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: tripsApi.getTripStats,
  });
}

function useInvalidateTrips() {
  const queryClient = useQueryClient();
  return (tripId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["trips"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    if (tripId) queryClient.invalidateQueries({ queryKey: ["trips", tripId] });
  };
}

export function useCreateTrip() {
  const invalidate = useInvalidateTrips();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => tripsApi.createTrip(body),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTrip(tripId: string) {
  const invalidate = useInvalidateTrips();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => tripsApi.updateTrip(tripId, body),
    onSuccess: () => invalidate(tripId),
  });
}

export function useDeleteTrip() {
  const invalidate = useInvalidateTrips();
  return useMutation({
    mutationFn: (tripId: string) => tripsApi.deleteTrip(tripId),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteTripLeg(tripId: string) {
  const invalidate = useInvalidateTrips();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (legId: string) => tripsApi.deleteTripLeg(tripId, legId),
    onSuccess: () => {
      invalidate(tripId);
      queryClient.invalidateQueries({ queryKey: ["itinerary", tripId] });
    },
  });
}

export function useArchiveTrip() {
  const invalidate = useInvalidateTrips();
  return useMutation({
    mutationFn: (tripId: string) => tripsApi.archiveTrip(tripId),
    onSuccess: (_data, tripId) => invalidate(tripId),
  });
}

export function useDuplicateTrip() {
  const invalidate = useInvalidateTrips();
  return useMutation({
    mutationFn: (tripId: string) => tripsApi.duplicateTrip(tripId),
    onSuccess: () => invalidate(),
  });
}

export function useShareTrip(tripId: string) {
  const invalidate = useInvalidateTrips();
  return useMutation({
    mutationFn: () => tripsApi.shareTrip(tripId),
    onSuccess: () => invalidate(tripId),
  });
}

export function useUnshareTrip(tripId: string) {
  const invalidate = useInvalidateTrips();
  return useMutation({
    mutationFn: () => tripsApi.unshareTrip(tripId),
    onSuccess: () => invalidate(tripId),
  });
}

export function useGenerateTripFromPrompt() {
  const invalidate = useInvalidateTrips();
  return useMutation({
    mutationFn: (prompt: string) => tripsApi.generateTripFromPrompt(prompt),
    onSuccess: () => invalidate(),
  });
}

export function useTripMembersQuery(tripId: string) {
  return useQuery({
    queryKey: ["trips", tripId, "members"],
    queryFn: () => tripsApi.getTripMembers(tripId),
    enabled: !!tripId,
  });
}

export function useAddTripMember(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => tripsApi.addTripMember(tripId, email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips", tripId, "members"] }),
  });
}

export function useRemoveTripMember(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberUserId: string) => tripsApi.removeTripMember(tripId, memberUserId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trips", tripId, "members"] }),
  });
}

export function useLeaveTrip() {
  const invalidate = useInvalidateTrips();
  return useMutation({
    mutationFn: (tripId: string) => tripsApi.leaveTrip(tripId),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateLegStays(tripId: string) {
  const invalidate = useInvalidateTrips();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ legId, stays }: { legId: string; stays: import("@/modules/trips/types/trip-leg.types").TripStay[] }) =>
      tripsApi.updateLegStays(tripId, legId, stays),
    onSuccess: () => {
      invalidate(tripId);
      // Stay changes re-time that city's days server-side.
      queryClient.invalidateQueries({ queryKey: ["itinerary", tripId] });
      queryClient.invalidateQueries({ queryKey: ["itinerary-route", tripId] });
    },
  });
}

export function useHotelSearch(tripId: string) {
  return useMutation({
    mutationFn: ({
      legId,
      ...params
    }: {
      legId: string;
      query?: string;
      checkInDate?: string;
      checkOutDate?: string;
      adults?: number;
    }) => tripsApi.searchHotelsForLeg(tripId, legId, params),
  });
}

/** After a booking/checklist change the server returns the whole trip — write it straight into the cache. */
function useSetTrip(tripId: string) {
  const queryClient = useQueryClient();
  return (trip: Trip) => {
    queryClient.setQueryData(["trips", tripId], (old: object | undefined) => ({ ...(old ?? {}), ...trip }));
    queryClient.invalidateQueries({ queryKey: ["budget", tripId] });
  };
}

export function useSaveBooking(tripId: string) {
  const setTrip = useSetTrip(tripId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...booking }: tripsApi.BookingInput & { id?: string }) =>
      id ? tripsApi.updateBooking(tripId, id, booking) : tripsApi.addBooking(tripId, booking),
    onSuccess: (data) => {
      setTrip(data.trip);
      // Transfer-linked bookings re-time travel days.
      queryClient.invalidateQueries({ queryKey: ["itinerary", tripId] });
    },
  });
}

export function useRemoveBooking(tripId: string) {
  const setTrip = useSetTrip(tripId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => tripsApi.removeBooking(tripId, bookingId),
    onSuccess: (data) => {
      setTrip(data.trip);
      queryClient.invalidateQueries({ queryKey: ["itinerary", tripId] });
    },
  });
}

export function useAddChecklistItems(tripId: string) {
  const setTrip = useSetTrip(tripId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: tripsApi.ChecklistItemInput[]) => tripsApi.addChecklistItems(tripId, items),
    onSuccess: (data) => {
      setTrip(data.trip);
      queryClient.invalidateQueries({ queryKey: ["checklist-suggestions", tripId] });
    },
  });
}

export function useUpdateChecklistItem(tripId: string) {
  const setTrip = useSetTrip(tripId);
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<tripsApi.ChecklistItemInput> & { id: string }) =>
      tripsApi.updateChecklistItem(tripId, id, patch),
    onSuccess: (data) => setTrip(data.trip),
  });
}

export function useRemoveChecklistItem(tripId: string) {
  const setTrip = useSetTrip(tripId);
  return useMutation({
    mutationFn: (itemId: string) => tripsApi.removeChecklistItem(tripId, itemId),
    onSuccess: (data) => setTrip(data.trip),
  });
}

export function useChecklistSuggestionsQuery(tripId: string) {
  return useQuery({
    queryKey: ["checklist-suggestions", tripId],
    queryFn: () => tripsApi.getChecklistSuggestions(tripId),
    enabled: !!tripId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useBudgetQuery(tripId: string) {
  return useQuery({ queryKey: ["budget", tripId], queryFn: () => tripsApi.getBudget(tripId), enabled: !!tripId });
}

export function useSaveExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...expense }: tripsApi.ExpenseInput & { id?: string }) =>
      id ? tripsApi.updateExpense(tripId, id, expense) : tripsApi.addExpense(tripId, expense),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget", tripId] }),
  });
}

export function useRemoveExpense(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => tripsApi.removeExpense(tripId, expenseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budget", tripId] }),
  });
}

export function useWeatherQuery(tripId: string) {
  return useQuery({
    queryKey: ["weather", tripId],
    queryFn: () => tripsApi.getWeather(tripId),
    enabled: !!tripId,
    staleTime: 1000 * 60 * 60,
    retry: false,
  });
}
