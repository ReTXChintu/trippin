import type {
  Coordinates,
  Place,
  PlaceDetail,
  PlaceSearchResult,
  SearchNearbyOptions,
  SearchPlacesOptions,
  SearchPlacesPageResult,
} from "@/modules/places/types/place.types";

export interface PlacesProvider {
  searchPlaces(options: SearchPlacesOptions): Promise<PlaceSearchResult[]>;
  searchPlacesPage(options: SearchPlacesOptions): Promise<SearchPlacesPageResult>;
  searchHotels(options: SearchPlacesOptions): Promise<PlaceSearchResult[]>;
  searchNearby(options: SearchNearbyOptions): Promise<PlaceSearchResult[]>;
  autocomplete(options: SearchPlacesOptions): Promise<PlaceSearchResult[]>;
  getPlaceDetails(placeId: string): Promise<Place>;
  getPlaceDetailsRich(placeId: string): Promise<PlaceDetail>;
  getPlacePhotoMediaUrl(photoName: string, maxHeightPx?: number): Promise<string>;
  geocodeAddress(address: string): Promise<Coordinates>;
}
