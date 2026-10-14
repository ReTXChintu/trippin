import { api } from "@/lib/api";
import type {
  Itinerary,
  ItineraryDay,
  ItineraryDayWithDistance,
  OptionalItineraryPlace,
} from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";

export interface AiCandidateResponse {
  days: ItineraryDayWithDistance[];
  optionalPlaces: OptionalItineraryPlace[];
  generatedAt: string;
}

export interface ComparisonResponse {
  currentDays: ItineraryDayWithDistance[];
  currentOptionalPlaces: OptionalItineraryPlace[];
  aiCandidate: AiCandidateResponse | null;
}

export interface DayRouteHop {
  fromStopId: string;
  toStopId: string;
  distanceKm: number;
  durationMinutes: number;
}

export interface DayRoute {
  dayNumber: number;
  /** Empty for public transport, which is routed hop by hop — see segmentPolylines. */
  overviewPolyline: string;
  segmentPolylines?: string[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  hops: DayRouteHop[];
}

export async function getItinerary(tripId: string): Promise<{ itinerary: Itinerary | null }> {
  const res = await api.get(`/trips/${tripId}/itinerary`);
  return res.data.data;
}

export async function generateItinerary(tripId: string, legId?: string): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "generate", legId });
  return res.data.data;
}

export async function summarizeItinerary(tripId: string): Promise<{ itinerary: Itinerary; summary: string }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "summarize" });
  return res.data.data;
}

export async function generateAiCandidate(
  tripId: string,
  legId?: string,
  instructions?: string,
): Promise<ComparisonResponse & { instructionNote?: string }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "generateAiCandidate", legId, instructions: instructions?.trim() || undefined });
  return res.data.data;
}

export async function getItineraryComparison(tripId: string, legId?: string): Promise<ComparisonResponse> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "getComparison", legId });
  return res.data.data;
}

export async function keepSystemItinerary(tripId: string, legId?: string): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "keepSystem", legId });
  return res.data.data;
}

export async function keepAiItinerary(tripId: string, legId?: string): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "keepAi", legId });
  return res.data.data;
}

export interface ApplyMergedDaysParams {
  legId?: string;
  days: ItineraryDay[];
  newlyScheduledFromOptional?: { date: string; placeId: string }[];
}

export async function applyMergedDays(
  tripId: string,
  params: ApplyMergedDaysParams,
): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "applyMergedDays", ...params });
  return res.data.data;
}

export async function movePlaceToDay(
  tripId: string,
  params: { placeId: string; toDayNumber: number; legId?: string; targetIndex?: number },
): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "movePlaceToDay", ...params });
  return res.data.data;
}

export async function getItineraryRoutes(
  tripId: string,
  params?: { legId?: string; dayNumber?: number },
): Promise<{ days: DayRoute[] }> {
  const res = await api.get(`/trips/${tripId}/itinerary/routes`, { params });
  return res.data.data;
}

export async function generateLegGuide(tripId: string, legId: string): Promise<{ trip: Trip }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "generateGuide", legId });
  return res.data.data;
}

export async function reorderItineraryStops(
  tripId: string,
  dayNumber: number,
  stopIds: string[],
): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "reorder", dayNumber, stopIds });
  return res.data.data;
}

export async function moveItineraryStop(
  tripId: string,
  stopId: string,
  fromDayNumber: number,
  toDayNumber: number,
  targetIndex?: number,
): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, {
    action: "moveStop",
    stopId,
    fromDayNumber,
    toDayNumber,
    targetIndex,
  });
  return res.data.data;
}

export interface UpdateMealSlotParams {
  dayNumber: number;
  stopId: string;
  arrivalTime?: string;
  departureTime?: string;
  placeId?: string;
  clearPlace?: boolean;
}

export async function updateMealSlot(
  tripId: string,
  params: UpdateMealSlotParams,
): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "updateMealSlot", ...params });
  return res.data.data;
}

export async function setStopLock(
  tripId: string,
  params: { dayNumber: number; stopId: string; locked: boolean },
): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "setLock", ...params });
  return res.data.data;
}

export interface AddStopParams {
  dayNumber: number;
  placeId?: string;
  name?: string;
  fixedStartTime?: string;
  durationMinutes?: number;
  notes?: string;
}

export async function addStop(tripId: string, params: AddStopParams): Promise<{ itinerary: Itinerary; stopId: string }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "addStop", ...params });
  return res.data.data;
}

export interface UpdateStopParams {
  dayNumber: number;
  stopId: string;
  durationMinutes?: number;
  /** null clears a fixed time */
  fixedStartTime?: string | null;
  notes?: string;
  /** null clears the cost */
  cost?: number | null;
}

export async function updateStop(tripId: string, params: UpdateStopParams): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "updateStop", ...params });
  return res.data.data;
}

export async function removeStop(
  tripId: string,
  params: { dayNumber: number; stopId: string },
): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "removeStop", ...params });
  return res.data.data;
}

export async function undoItinerary(tripId: string): Promise<{ itinerary: Itinerary; message?: string }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "undo" });
  return { ...res.data.data, message: res.data.message };
}

export interface MealSuggestion {
  googlePlaceId: string;
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  cuisine?: string;
  distanceKm?: number;
  walkMinutes?: number;
  openAtMealTime: boolean | null;
  hoursToday?: string;
  photoUrl?: string;
  source: "nearby" | "saved";
}

export interface MealSuggestionsResponse {
  mealType?: string;
  time: string;
  anchorLabel: string;
  suggestions: MealSuggestion[];
}

export async function getMealSuggestions(
  tripId: string,
  params: { dayNumber: number; stopId: string },
): Promise<MealSuggestionsResponse> {
  const res = await api.get(`/trips/${tripId}/itinerary/meal-suggestions`, { params });
  return res.data.data;
}

export async function setStopStatus(
  tripId: string,
  params: { dayNumber: number; stopId: string; status: "done" | "skipped" | null },
): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "setStatus", ...params });
  return res.data.data;
}

export async function aiEditPlan(
  tripId: string,
  instruction: string,
): Promise<{ itinerary: Itinerary; summary: string; applied: number }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "aiEdit", instruction });
  return res.data.data;
}

export async function optimizeDay(tripId: string, dayNumber?: number): Promise<{ itinerary: Itinerary; savedKm: number; message?: string }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "optimizeDay", dayNumber });
  return { ...res.data.data, message: res.data.message };
}

export async function replanFromNow(tripId: string, params: { dayNumber: number; time: string }): Promise<{ itinerary: Itinerary }> {
  const res = await api.post(`/trips/${tripId}/itinerary`, { action: "replanFromNow", ...params });
  return res.data.data;
}
