import { GooglePlacesProvider } from "@/modules/places/services/google-places.provider";
import type { PlacesProvider } from "@/modules/places/types/places-provider.types";

export function getPlacesProvider(apiKey: string): PlacesProvider {
  return new GooglePlacesProvider(apiKey);
}
