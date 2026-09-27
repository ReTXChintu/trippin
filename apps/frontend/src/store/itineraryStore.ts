import { create } from "zustand";

export interface ItineraryStop {
  id: string;
  placeId: string;
  placeName: string;
  sequence: number;
  arrivalTime: string;
  departureTime: string;
  visitDurationMinutes: number;
  travelDurationMinutes: number;
  coordinates?: { lat: number; lng: number };
  category?: string;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  stops: ItineraryStop[];
}

interface ItineraryState {
  days: ItineraryDay[];
  activeDay: number;
  setDays: (days: ItineraryDay[]) => void;
  setActiveDay: (day: number) => void;
  reset: () => void;
}

export const useItineraryStore = create<ItineraryState>((set) => ({
  days: [],
  activeDay: 1,
  setDays: (days) => set({ days }),
  setActiveDay: (activeDay) => set({ activeDay }),
  reset: () => set({ days: [], activeDay: 1 }),
}));
