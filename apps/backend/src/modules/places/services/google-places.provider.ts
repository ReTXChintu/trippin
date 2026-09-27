import {
  AUTocomplete_FIELD_MASK,
  GEOCODING_API_BASE,
  MAX_PLACE_PHOTOS,
  MAX_SEARCH_RESULTS,
  PLACE_DETAILS_FIELD_MASK,
  PLACE_DETAILS_RICH_FIELD_MASK,
  PLACES_API_BASE,
  PLACES_NEARBY_FIELD_MASK,
  PLACES_SEARCH_FIELD_MASK,
  SEARCH_MIN_QUERY_LENGTH,
} from "@/constants/google-places";
import type {
  Coordinates,
  Place,
  PlaceDetail,
  PlaceSearchResult,
  SearchNearbyOptions,
  SearchPlacesOptions,
  SearchPlacesPageResult,
} from "@/modules/places/types/place.types";
import type { PlacesProvider } from "@/modules/places/types/places-provider.types";
import {
  buildTextQuery,
  mapGoogleToPlace,
  mapGoogleToPlaceDetail,
  mapGoogleToSearchResult,
  toPlaceIdPath,
} from "@/modules/places/utils/google-places.mapper";
import { buildPlacePhotoProxyUrls, RICH_DETAIL_VERSION } from "@/modules/places/utils/photo.utils";

export class GooglePlacesProvider implements PlacesProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    const key = apiKey?.trim();
    if (!key) {
      throw new Error("Google Maps API key is required.");
    }
    this.apiKey = key;
  }

  private async postJson<T>(url: string, body: unknown, fieldMask: string): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Places API error: ${response.status} ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  private async getJson<T>(url: string, fieldMask: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Places API error: ${response.status} ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  private locationBias(location?: Coordinates) {
    if (!location) return undefined;
    return {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radius: 50000,
      },
    };
  }

  async searchPlacesPage(options: SearchPlacesOptions): Promise<SearchPlacesPageResult> {
    if (options.query.trim().length < SEARCH_MIN_QUERY_LENGTH) {
      return { results: [] };
    }

    const textQuery = buildTextQuery(options.query, options.city, options.country);
    const body: Record<string, unknown> = {
      textQuery,
      maxResultCount: options.limit ?? MAX_SEARCH_RESULTS,
      locationBias: this.locationBias(options.location),
    };

    if (options.pageToken) {
      body.pageToken = options.pageToken;
    }

    const data = await this.postJson<{ places?: unknown[]; nextPageToken?: string }>(
      `${PLACES_API_BASE}/places:searchText`,
      body,
      PLACES_SEARCH_FIELD_MASK,
    );

    const results = (data.places ?? [])
      .map((p) => mapGoogleToSearchResult(p as Parameters<typeof mapGoogleToSearchResult>[0]))
      .filter((p): p is PlaceSearchResult => p !== null);

    return { results, nextPageToken: data.nextPageToken };
  }

  async searchPlaces(options: SearchPlacesOptions): Promise<PlaceSearchResult[]> {
    const page = await this.searchPlacesPage(options);
    return page.results;
  }

  async searchHotels(options: SearchPlacesOptions): Promise<PlaceSearchResult[]> {
    if (options.query.trim().length < SEARCH_MIN_QUERY_LENGTH) return [];

    const textQuery = buildTextQuery(
      `${options.query} hotel lodging`,
      options.city,
      options.country,
    );

    const data = await this.postJson<{ places?: unknown[] }>(
      `${PLACES_API_BASE}/places:searchText`,
      {
        textQuery,
        maxResultCount: options.limit ?? MAX_SEARCH_RESULTS,
        includedType: "lodging",
        locationBias: this.locationBias(options.location),
      },
      PLACES_NEARBY_FIELD_MASK,
    );

    return (data.places ?? [])
      .map((p) => mapGoogleToSearchResult(p as Parameters<typeof mapGoogleToSearchResult>[0]))
      .filter((p): p is PlaceSearchResult => p !== null);
  }

  async searchNearby(options: SearchNearbyOptions): Promise<PlaceSearchResult[]> {
    const data = await this.postJson<{ places?: unknown[] }>(
      `${PLACES_API_BASE}/places:searchNearby`,
      {
        includedTypes: options.includedTypes,
        maxResultCount: Math.min(options.limit ?? MAX_SEARCH_RESULTS, MAX_SEARCH_RESULTS),
        rankPreference: "POPULARITY",
        locationRestriction: {
          circle: {
            center: { latitude: options.location.lat, longitude: options.location.lng },
            radius: options.radiusMeters,
          },
        },
      },
      PLACES_NEARBY_FIELD_MASK,
    );

    return (data.places ?? [])
      .map((p) => mapGoogleToSearchResult(p as Parameters<typeof mapGoogleToSearchResult>[0]))
      .filter((p): p is PlaceSearchResult => p !== null);
  }

  async autocomplete(options: SearchPlacesOptions): Promise<PlaceSearchResult[]> {
    if (options.query.trim().length < SEARCH_MIN_QUERY_LENGTH) return [];

    const body: Record<string, unknown> = {
      input: buildTextQuery(options.query, options.city, options.country),
    };

    if (options.sessionToken) {
      body.sessionToken = options.sessionToken;
    }
    if (options.location) {
      body.locationBias = this.locationBias(options.location);
    }

    const data = await this.postJson<{
      suggestions?: {
        placePrediction?: {
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
        };
      }[];
    }>(`${PLACES_API_BASE}/places:autocomplete`, body, AUTocomplete_FIELD_MASK);

    const results: PlaceSearchResult[] = [];
    for (const s of data.suggestions ?? []) {
      const pred = s.placePrediction;
      if (!pred?.placeId) continue;
      const main = pred.structuredFormat?.mainText?.text ?? pred.text?.text ?? "";
      const secondary = pred.structuredFormat?.secondaryText?.text;
      results.push({
        googlePlaceId: pred.placeId.replace("places/", ""),
        name: main,
        address: secondary,
      });
    }
    return results;
  }

  async getPlaceDetails(placeId: string): Promise<Place> {
    const path = toPlaceIdPath(placeId);
    const raw = await this.getJson<Parameters<typeof mapGoogleToPlace>[0]>(
      `${PLACES_API_BASE}/${path}`,
      PLACE_DETAILS_FIELD_MASK,
    );

    return mapGoogleToPlace(raw, {});
  }

  async getPlaceDetailsRich(placeId: string): Promise<PlaceDetail> {
    const path = toPlaceIdPath(placeId);
    const raw = await this.getJson<Parameters<typeof mapGoogleToPlaceDetail>[0]>(
      `${PLACES_API_BASE}/${path}`,
      PLACE_DETAILS_RICH_FIELD_MASK,
    );

    const detail: PlaceDetail = { ...mapGoogleToPlaceDetail(raw, {}), richVersion: RICH_DETAIL_VERSION };
    const photoNames = (raw.photos ?? [])
      .map((p) => p.name)
      .filter((n): n is string => !!n)
      .slice(0, MAX_PLACE_PHOTOS);

    if (photoNames.length > 0) {
      detail.photoNames = photoNames;
      detail.photoUrls = buildPlacePhotoProxyUrls(photoNames);
      detail.imageUrl = detail.photoUrls[0];
    }

    return detail;
  }

  async getPlacePhotoMediaUrl(photoName: string, maxHeightPx = 400): Promise<string> {
    // photoName is a resource path like "places/ChIJ.../photos/AtBo..." — do not encode slashes
    const url = `${PLACES_API_BASE}/${photoName}/media?maxHeightPx=${maxHeightPx}&skipHttpRedirect=true`;

    const response = await fetch(url, {
      headers: { "X-Goog-Api-Key": this.apiKey },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Place photo fetch failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as { photoUri?: string };
    if (!data.photoUri) {
      throw new Error("No photo URI returned");
    }

    return data.photoUri;
  }

  async geocodeAddress(address: string): Promise<Coordinates> {
    const url = `${GEOCODING_API_BASE}?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      status: string;
      results?: { geometry?: { location?: { lat: number; lng: number } } }[];
    };

    if (data.status !== "OK" || !data.results?.[0]?.geometry?.location) {
      throw new Error(`Geocoding failed: ${data.status}`);
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  }
}
