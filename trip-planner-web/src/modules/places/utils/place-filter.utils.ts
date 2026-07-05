import type { Place } from "@/modules/places/types/place.types";
import { haversineKm } from "@/utils/geo";

export type PlaceSortOption = "rating" | "name" | "distance";
export type MinRatingFilter = 0 | 3 | 4 | 4.5;

export interface PlaceFilterState {
  minRating: MinRatingFilter;
  categories: string[];
  nameQuery: string;
  sort: PlaceSortOption;
}

export const DEFAULT_PLACE_FILTERS: PlaceFilterState = {
  minRating: 0,
  categories: [],
  nameQuery: "",
  sort: "rating",
};

export function getUniqueCategories(places: Place[]): string[] {
  return Array.from(new Set(places.map((p) => p.category).filter(Boolean))).sort();
}

export function filterAndSortPlaces(
  places: Place[],
  filters: PlaceFilterState,
  hotelCoordinates?: { lat: number; lng: number },
): Place[] {
  let result = [...places];

  if (filters.minRating > 0) {
    result = result.filter((p) => (p.rating ?? 0) >= filters.minRating);
  }

  if (filters.categories.length > 0) {
    result = result.filter((p) => filters.categories.includes(p.category));
  }

  if (filters.nameQuery.trim()) {
    const q = filters.nameQuery.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.formattedAddress?.toLowerCase().includes(q),
    );
  }

  result.sort((a, b) => {
    switch (filters.sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "distance": {
        if (!hotelCoordinates || !a.coordinates || !b.coordinates) {
          return (b.rating ?? 0) - (a.rating ?? 0);
        }
        return (
          haversineKm(hotelCoordinates, a.coordinates) -
          haversineKm(hotelCoordinates, b.coordinates)
        );
      }
      default:
        return (b.rating ?? 0) - (a.rating ?? 0);
    }
  });

  return result;
}
