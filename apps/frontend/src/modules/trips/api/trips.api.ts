import { api } from "@/lib/api";
import type { Trip, TripStats } from "@/modules/trips/types/trip.types";
import type { TripMember } from "@/modules/trips/types/trip-member.types";
import type { TripStay } from "@/modules/trips/types/trip-leg.types";
import type {
  BudgetSummary,
  ChecklistItem,
  ChecklistSuggestion,
  DayWeather,
  Expense,
  TripBooking,
} from "@/modules/trips/types/trip-extras.types";
import type { TripStatus } from "@/types";

export async function listTrips(status?: TripStatus): Promise<Trip[]> {
  const res = await api.get("/trips", { params: status ? { status } : undefined });
  return res.data.data.trips;
}

export async function getTrip(id: string): Promise<Trip & { ownerApiKeys: { hasOpenaiKey: boolean; hasAiKey: boolean; hasGoogleMapsKey: boolean } }> {
  const res = await api.get(`/trips/${id}`);
  return res.data.data.trip;
}

export async function createTrip(body: Record<string, unknown>): Promise<{ trip: Trip }> {
  const res = await api.post("/trips", body);
  return res.data.data;
}

export async function updateTrip(id: string, body: Record<string, unknown>): Promise<{ trip: Trip }> {
  const res = await api.patch(`/trips/${id}`, body);
  return res.data.data;
}

export async function deleteTrip(id: string): Promise<void> {
  await api.delete(`/trips/${id}`);
}

export async function deleteTripLeg(tripId: string, legId: string): Promise<{ trip: Trip }> {
  const res = await api.delete(`/trips/${tripId}/legs/${legId}`);
  return res.data.data;
}

export async function archiveTrip(id: string): Promise<{ trip: Trip }> {
  const res = await api.post(`/trips/${id}/archive`);
  return res.data.data;
}

export async function duplicateTrip(id: string): Promise<{ trip: Trip }> {
  const res = await api.post(`/trips/${id}/duplicate`);
  return res.data.data;
}

export async function shareTrip(id: string): Promise<{ trip: Trip; shareUrl: string }> {
  const res = await api.post(`/trips/${id}/share`);
  return res.data.data;
}

export async function unshareTrip(id: string): Promise<{ trip: Trip }> {
  const res = await api.delete(`/trips/${id}/share`);
  return res.data.data;
}

export async function generateTripFromPrompt(prompt: string): Promise<{ trip: Trip; confidence: number }> {
  const res = await api.post("/trips/generate-from-prompt", { prompt });
  return res.data.data;
}

export async function getTripStats(): Promise<{ stats: TripStats; upcomingTrips: Trip[]; recentTrips: Trip[] }> {
  const res = await api.get("/dashboard");
  return res.data.data;
}

// Members
export async function getTripMembers(tripId: string): Promise<{ members: TripMember[] }> {
  const res = await api.get(`/trips/${tripId}/members`);
  return res.data.data;
}

export async function addTripMember(tripId: string, email: string): Promise<{ members: TripMember[] }> {
  const res = await api.post(`/trips/${tripId}/members`, { email });
  return res.data.data;
}

export async function removeTripMember(tripId: string, memberUserId: string): Promise<{ members: TripMember[] }> {
  const res = await api.delete(`/trips/${tripId}/members`, { params: { memberUserId } });
  return res.data.data;
}

export async function leaveTrip(tripId: string): Promise<void> {
  await api.post(`/trips/${tripId}/leave`);
}

export async function updateLegStays(
  tripId: string,
  legId: string,
  stays: TripStay[],
): Promise<{ trip: Trip; uncoveredNights: string[] }> {
  const res = await api.put(`/trips/${tripId}/legs/${legId}/stays`, { stays });
  return res.data.data;
}

export interface HotelOption {
  googlePlaceId: string;
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  photoUrl?: string;
  avgMinutesToPlaces?: number;
  placesWithin15Min?: number;
  locationScore?: number;
  distanceToCenterKm?: number;
  googleMapsUrl: string;
  bookingUrl: string;
}

export interface HotelSearchResponse {
  hotels: HotelOption[];
  basis: { placesCount: number; label: string };
  checkInDate: string;
  checkOutDate: string;
}

export async function searchHotelsForLeg(
  tripId: string,
  legId: string,
  params: { query?: string; checkInDate?: string; checkOutDate?: string; adults?: number },
): Promise<HotelSearchResponse> {
  const res = await api.post(`/trips/${tripId}/legs/${legId}/hotels/search`, params);
  return res.data.data;
}

export type BookingInput = Omit<TripBooking, "id">;

export async function addBooking(tripId: string, booking: BookingInput): Promise<{ trip: Trip; booking: TripBooking }> {
  const res = await api.post(`/trips/${tripId}/bookings`, booking);
  return res.data.data;
}

export async function updateBooking(tripId: string, bookingId: string, booking: BookingInput): Promise<{ trip: Trip }> {
  const res = await api.put(`/trips/${tripId}/bookings/${bookingId}`, booking);
  return res.data.data;
}

export async function removeBooking(tripId: string, bookingId: string): Promise<{ trip: Trip }> {
  const res = await api.delete(`/trips/${tripId}/bookings/${bookingId}`);
  return res.data.data;
}

export type ChecklistItemInput = Omit<ChecklistItem, "id" | "done"> & { done?: boolean };

export async function addChecklistItems(tripId: string, items: ChecklistItemInput[]): Promise<{ trip: Trip }> {
  const res = await api.post(`/trips/${tripId}/checklist`, { items });
  return res.data.data;
}

export async function updateChecklistItem(
  tripId: string,
  itemId: string,
  patch: Partial<ChecklistItemInput>,
): Promise<{ trip: Trip }> {
  const res = await api.patch(`/trips/${tripId}/checklist/${itemId}`, patch);
  return res.data.data;
}

export async function removeChecklistItem(tripId: string, itemId: string): Promise<{ trip: Trip }> {
  const res = await api.delete(`/trips/${tripId}/checklist/${itemId}`);
  return res.data.data;
}

export async function getChecklistSuggestions(tripId: string): Promise<{ suggestions: ChecklistSuggestion[] }> {
  const res = await api.get(`/trips/${tripId}/checklist/suggestions`);
  return res.data.data;
}

export async function getBudget(tripId: string): Promise<BudgetSummary> {
  const res = await api.get(`/trips/${tripId}/budget`);
  return res.data.data;
}

export type ExpenseInput = Pick<Expense, "description" | "category" | "amount" | "currency" | "date" | "paidBy" | "splitWith">;

export async function addExpense(tripId: string, expense: ExpenseInput): Promise<{ expense: Expense }> {
  const res = await api.post(`/trips/${tripId}/expenses`, expense);
  return res.data.data;
}

export async function updateExpense(tripId: string, expenseId: string, expense: ExpenseInput): Promise<{ expense: Expense }> {
  const res = await api.put(`/trips/${tripId}/expenses/${expenseId}`, expense);
  return res.data.data;
}

export async function removeExpense(tripId: string, expenseId: string): Promise<void> {
  await api.delete(`/trips/${tripId}/expenses/${expenseId}`);
}

export async function getWeather(tripId: string): Promise<{ days: DayWeather[] }> {
  const res = await api.get(`/trips/${tripId}/weather`);
  return res.data.data;
}
