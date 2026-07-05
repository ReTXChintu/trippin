import { create } from "zustand";
import type { TripStatus } from "@/types";

export interface TripSummary {
  id: string;
  title: string;
  destinationCity: string;
  destinationCountry: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
}

interface TripState {
  trips: TripSummary[];
  selectedTripId: string | null;
  setTrips: (trips: TripSummary[]) => void;
  setSelectedTripId: (id: string | null) => void;
}

export const useTripStore = create<TripState>((set) => ({
  trips: [],
  selectedTripId: null,
  setTrips: (trips) => set({ trips }),
  setSelectedTripId: (selectedTripId) => set({ selectedTripId }),
}));
