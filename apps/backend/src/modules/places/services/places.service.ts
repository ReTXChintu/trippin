import { getPlacesProvider } from "@/lib/places";
import { PlaceCacheRepository } from "@/repositories/place-cache.repository";
import {
  FOOD_SEARCH_QUERIES,
  INTEREST_TO_SEARCH_QUERY,
  MARKET_SEARCH_QUERIES,
  MAX_DISCOVERY_POOL_SIZE,
  MAX_DISCOVERY_QUERIES,
  MAX_FOOD_POOL_SIZE,
  MAX_MARKET_POOL_SIZE,
  MAX_SEARCH_PAGES,
  MAX_SEARCH_RESULTS,
  MAX_VEHICLE_RENTAL_SUGGESTIONS,
  VEHICLE_RENTAL_SEARCH_QUERIES,
} from "@/constants/google-places";
import { toPlainPlaces } from "@/modules/places/utils/place.mapper";
import type {
  DiscoverPlacesParams,
  Place,
  PlaceDetail,
  PlaceSearchResult,
  SearchPlacesOptions,
} from "@/modules/places/types/place.types";
import { rankPlacesRuleBased } from "@/modules/ai/services/place-ranking.service";
import { mapSearchResultToPlace } from "@/modules/places/utils/google-places.mapper";
import type { VehicleRentalSuggestion } from "@/modules/trips/types/trip-enrichment.types";
import { haversineKm } from "@/utils/geo";

export class PlacesService {
  static async searchPlaces(options: SearchPlacesOptions): Promise<PlaceSearchResult[]> {
    const provider = getPlacesProvider(options.googleMapsApiKey);
    return provider.searchPlaces(options);
  }

  static async searchPlacesPaginated(
    options: SearchPlacesOptions,
    maxPages = MAX_SEARCH_PAGES,
  ): Promise<PlaceSearchResult[]> {
    const provider = getPlacesProvider(options.googleMapsApiKey);
    const all: PlaceSearchResult[] = [];
    let pageToken: string | undefined;

    for (let page = 0; page < maxPages; page++) {
      const result = await provider.searchPlacesPage({
        ...options,
        limit: MAX_SEARCH_RESULTS,
        pageToken,
      });

      all.push(...result.results);

      if (!result.nextPageToken) break;
      pageToken = result.nextPageToken;
    }

    return all;
  }

  static async searchHotels(options: SearchPlacesOptions): Promise<PlaceSearchResult[]> {
    const provider = getPlacesProvider(options.googleMapsApiKey);
    return provider.searchHotels(options);
  }

  static async autocomplete(options: SearchPlacesOptions): Promise<PlaceSearchResult[]> {
    const provider = getPlacesProvider(options.googleMapsApiKey);
    return provider.autocomplete(options);
  }

  static async getPlaceDetails(
    googlePlaceId: string,
    googleMapsApiKey: string,
    context?: { city?: string; state?: string; country?: string },
  ): Promise<Place> {
    const cached = await PlaceCacheRepository.findByGoogleId(googlePlaceId);
    if (cached) return cached;

    const provider = getPlacesProvider(googleMapsApiKey);
    const place = await provider.getPlaceDetails(googlePlaceId);
    const enriched: Place = {
      ...place,
      city: context?.city ?? place.city,
      state: context?.state ?? place.state,
      country: context?.country ?? place.country,
    };
    return PlaceCacheRepository.upsert(googlePlaceId, enriched);
  }

  static async getPlaceDetailsRich(
    googlePlaceId: string,
    googleMapsApiKey: string,
    context: { city?: string; state?: string; country?: string },
  ): Promise<{ place: PlaceDetail; fromCache: boolean }> {
    const cached = await PlaceCacheRepository.findDetailByGoogleId(googlePlaceId);
    if (cached) {
      return { place: cached, fromCache: true };
    }

    const provider = getPlacesProvider(googleMapsApiKey);
    const raw = await provider.getPlaceDetailsRich(googlePlaceId);

    const detail: PlaceDetail = {
      ...raw,
      city: context.city ?? raw.city,
      state: context.state ?? raw.state,
      country: context.country ?? raw.country,
      googleSearchUrl:
        raw.googleSearchUrl ??
        `https://www.google.com/search?q=${encodeURIComponent(`${raw.name} ${context.city ?? ""} ${context.country ?? ""}`)}`,
    };

    const saved = await PlaceCacheRepository.upsertDetail(googlePlaceId, detail);
    return { place: saved, fromCache: false };
  }

  static async geocodeAddress(
    address: string,
    googleMapsApiKey: string,
  ): Promise<{ lat: number; lng: number }> {
    const provider = getPlacesProvider(googleMapsApiKey);
    return provider.geocodeAddress(address);
  }

  static async resolvePlaceSelection(
    result: PlaceSearchResult,
    context: { city?: string; state?: string; country?: string },
  ): Promise<Place> {
    const lightweight = mapSearchResultToPlace(result, context);
    return PlaceCacheRepository.upsert(result.googlePlaceId, lightweight);
  }

  static async discoverPlacesForTrip(params: DiscoverPlacesParams): Promise<Place[]> {
    const poolCap = params.limit ?? MAX_DISCOVERY_POOL_SIZE;
    const seen = new Set<string>();
    const candidates: PlaceSearchResult[] = [];

    const searchAreas = [
      params.city,
      ...(params.searchAreas ?? []).filter(
        (area) => area.trim().toLowerCase() !== params.city.trim().toLowerCase(),
      ),
    ];

    const perAreaCap = Math.max(30, Math.ceil(poolCap / searchAreas.length));

    for (const area of searchAreas) {
      if (candidates.length >= poolCap) break;

      const areaQueries: string[] = [];
      if (params.interests?.length) {
        for (const interest of params.interests) {
          const q = INTEREST_TO_SEARCH_QUERY[interest] ?? interest.toLowerCase();
          areaQueries.push(`${q} ${area}`);
        }
      } else {
        areaQueries.push(`tourist attractions ${area}`);
      }

      for (const mustVisit of params.mustVisitPlaces ?? []) {
        areaQueries.push(`${mustVisit} ${area}`);
      }

      let areaCount = 0;
      for (const query of areaQueries.slice(0, MAX_DISCOVERY_QUERIES)) {
        if (candidates.length >= poolCap || areaCount >= perAreaCap) break;

        const results = await PlacesService.searchPlacesPaginated({
          query,
          city: area,
          country: params.country,
          location: params.hotelCoordinates,
          googleMapsApiKey: params.googleMapsApiKey,
        });

        for (const r of results) {
          if (candidates.length >= poolCap || areaCount >= perAreaCap) break;
          if (!seen.has(r.googlePlaceId)) {
            seen.add(r.googlePlaceId);
            candidates.push(r);
            areaCount++;
          }
        }
      }
    }

    const context = {
      city: params.city,
      state: params.state,
      country: params.country,
    };

    const places = candidates.map((c) => mapSearchResultToPlace(c, context));

    const excluded = new Set(
      (params.excludedPlaces ?? []).map((e) => e.toLowerCase()),
    );
    const filtered = places.filter((p) => !excluded.has(p.name.toLowerCase()));

    const ranked = rankPlacesRuleBased({
      places: filtered,
      interests: params.interests,
      travelStyle: params.travelStyle,
      mustVisitPlaces: params.mustVisitPlaces,
      excludedPlaces: params.excludedPlaces,
      limit: filtered.length,
    });

    await PlaceCacheRepository.upsertMany(ranked);
    return toPlainPlaces(ranked);
  }

  static async getCachedPlaces(googlePlaceIds: string[]): Promise<Place[]> {
    return toPlainPlaces(await PlaceCacheRepository.findByGoogleIds(googlePlaceIds));
  }

  private static async runDiscoveryQueries(
    queries: readonly string[],
    params: DiscoverPlacesParams,
    poolCap: number,
    perAreaCap: number,
    tagCategory: string,
  ): Promise<Place[]> {
    const seen = new Set<string>();
    const candidates: PlaceSearchResult[] = [];

    const searchAreas = [
      params.city,
      ...(params.searchAreas ?? []).filter(
        (area) => area.trim().toLowerCase() !== params.city.trim().toLowerCase(),
      ),
    ];

    for (const area of searchAreas) {
      if (candidates.length >= poolCap) break;

      let areaCount = 0;
      for (const template of queries) {
        if (candidates.length >= poolCap || areaCount >= perAreaCap) break;

        const query = `${template} ${area}`;
        const results = await PlacesService.searchPlacesPaginated({
          query,
          city: area,
          country: params.country,
          location: params.hotelCoordinates,
          googleMapsApiKey: params.googleMapsApiKey,
        });

        for (const r of results) {
          if (candidates.length >= poolCap || areaCount >= perAreaCap) break;
          if (!seen.has(r.googlePlaceId)) {
            seen.add(r.googlePlaceId);
            candidates.push(r);
            areaCount++;
          }
        }
      }
    }

    const context = {
      city: params.city,
      state: params.state,
      country: params.country,
    };

    const places = candidates.map((c) => {
      const place = mapSearchResultToPlace(c, context);
      return {
        ...place,
        category: tagCategory,
        averageVisitDurationMinutes: tagCategory === "Food" ? 60 : tagCategory === "Shopping" ? 90 : 60,
        tags: [...(place.tags ?? []), tagCategory.toLowerCase()],
      };
    });

    const ranked = rankPlacesRuleBased({
      places,
      interests: params.interests,
      travelStyle: params.travelStyle,
      limit: places.length,
    });

    await PlaceCacheRepository.upsertMany(ranked);
    return toPlainPlaces(ranked);
  }

  static async discoverFoodPlaces(params: DiscoverPlacesParams): Promise<Place[]> {
    const poolCap = params.limit ?? MAX_FOOD_POOL_SIZE;
    const perAreaCap = Math.max(8, Math.ceil(poolCap / 2));
    return PlacesService.runDiscoveryQueries(
      FOOD_SEARCH_QUERIES,
      params,
      poolCap,
      perAreaCap,
      "Food",
    );
  }

  static async discoverMarketPlaces(params: DiscoverPlacesParams): Promise<Place[]> {
    const poolCap = params.limit ?? MAX_MARKET_POOL_SIZE;
    const perAreaCap = Math.max(6, Math.ceil(poolCap / 2));
    return PlacesService.runDiscoveryQueries(
      MARKET_SEARCH_QUERIES,
      params,
      poolCap,
      perAreaCap,
      "Shopping",
    );
  }

  static async discoverVehicleRentalsNearStay(
    params: DiscoverPlacesParams,
  ): Promise<VehicleRentalSuggestion[]> {
    if (!params.hotelCoordinates) return [];

    const seen = new Set<string>();
    const candidates: PlaceSearchResult[] = [];
    const stay = params.hotelCoordinates;

    for (const template of VEHICLE_RENTAL_SEARCH_QUERIES) {
      if (candidates.length >= MAX_VEHICLE_RENTAL_SUGGESTIONS) break;

      const query = `${template} ${params.city}`;
      const results = await PlacesService.searchPlacesPaginated({
        query,
        city: params.city,
        country: params.country,
        location: stay,
        googleMapsApiKey: params.googleMapsApiKey,
      });

      for (const r of results) {
        if (candidates.length >= MAX_VEHICLE_RENTAL_SUGGESTIONS) break;
        if (!seen.has(r.googlePlaceId)) {
          seen.add(r.googlePlaceId);
          candidates.push(r);
        }
      }
    }

    const suggestions: VehicleRentalSuggestion[] = candidates
      .map((r) => {
        const distanceKm =
          r.coordinates != null
            ? haversineKm(stay, r.coordinates)
            : undefined;
        return {
          googlePlaceId: r.googlePlaceId,
          name: r.name,
          address: r.address,
          rating: r.rating,
          distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : undefined,
          googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${r.googlePlaceId}`,
          vehicleTypes: ["scooter", "bike"],
        };
      })
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    if (suggestions.length > 0) {
      const context = {
        city: params.city,
        state: params.state,
        country: params.country,
      };
      const places = candidates.map((c) =>
        mapSearchResultToPlace(c, { ...context, city: params.city }),
      );
      await PlaceCacheRepository.upsertMany(
        places.map((p) => ({ ...p, category: "Vehicle Rental", tags: ["vehicle_rental"] })),
      );
    }

    return suggestions;
  }
}
