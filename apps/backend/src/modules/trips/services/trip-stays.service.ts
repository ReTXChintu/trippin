import { z } from "zod";
import {
  ApiKeyError,
  assertGoogleMapsKey,
  getOwnerApiKeysForTripDto,
} from "@/lib/services/trip-api-keys.service";
import { MAX_HOTEL_SEARCH_RESULTS } from "@/constants/google-places";
import { PlacesService } from "@/modules/places/services/places.service";
import { PlaceCacheRepository } from "@/repositories/place-cache.repository";
import { TripRepository } from "@/repositories/trip.repository";
import { mapSearchResultToPlace } from "@/modules/places/utils/google-places.mapper";
import { buildPlacePhotoProxyUrl } from "@/modules/places/utils/photo.utils";
import { retimeLegDaysAfterTripChange } from "@/modules/itinerary/services/itinerary.service";
import { tripStaySchema } from "@/modules/trips/validators/trip.validator";
import { getLegStartPoint } from "@/modules/trips/utils/trip-leg.utils";
import { getUncoveredNights, syncLegacyHotelFields } from "@/modules/trips/utils/stay.utils";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg, TripStay } from "@/modules/trips/types/trip-leg.types";
import { checkAndIncrementSearchLimit } from "@/utils/rate-limit";
import { type Coordinates, estimateRoadKm, estimateTravelMinutes } from "@/utils/geo";

type Result<T> = { success: true; data: T; message?: string } | { success: false; error: string };

const updateStaysSchema = z.object({ stays: z.array(tripStaySchema).max(20) });

function staysOverlap(a: TripStay, b: TripStay): boolean {
  return a.checkInDate < b.checkOutDate && b.checkInDate < a.checkOutDate;
}

export async function updateLegStays(
  userId: string,
  tripId: string,
  legId: string,
  raw: unknown,
): Promise<Result<{ trip: Trip; uncoveredNights: string[] }>> {
  const parsed = updateStaysSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid stays" };

  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };
  const leg = trip.legs.find((l) => l.id === legId);
  if (!leg) return { success: false, error: "Trip leg not found" };

  const stays = [...parsed.data.stays].sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
  for (let i = 1; i < stays.length; i++) {
    if (staysOverlap(stays[i - 1], stays[i])) {
      return { success: false, error: `${stays[i - 1].name} and ${stays[i].name} overlap — one night can only have one stay` };
    }
  }
  const outside = stays.find((s) => s.checkInDate < leg.startDate || s.checkOutDate > addDays(leg.endDate, 1));
  if (outside) {
    return {
      success: false,
      error: `${outside.name} falls outside ${leg.name || leg.baseCity} (${leg.startDate} → ${leg.endDate})`,
    };
  }

  const nextLeg = syncLegacyHotelFields({ ...leg, stays });
  const updated = await TripRepository.update(tripId, userId, {
    legs: trip.legs.map((l) => (l.id === legId ? nextLeg : l)),
  });
  if (!updated) return { success: false, error: "Trip not found" };

  // Start/return points for this leg's days just moved — re-time them so travel is right.
  try {
    await retimeLegDaysAfterTripChange(updated, legId, `Update stays in ${leg.name || leg.baseCity}`);
  } catch {
    // The stays are saved; a stale schedule is corrected on the next edit.
  }

  return {
    success: true,
    data: { trip: updated, uncoveredNights: getUncoveredNights(nextLeg) },
    message: "Stays saved.",
  };
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface HotelOption {
  googlePlaceId: string;
  name: string;
  address?: string;
  coordinates?: Coordinates;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  photoUrl?: string;
  /** Average minutes (trip's transport mode) from this hotel to the places you picked in this city. */
  avgMinutesToPlaces?: number;
  /** How many of those places are within 15 minutes. */
  placesWithin15Min?: number;
  /** 0–10: 10 = everything you picked is close by. */
  locationScore?: number;
  distanceToCenterKm?: number;
  googleMapsUrl: string;
  bookingUrl: string;
}

export interface HotelSearchResult {
  hotels: HotelOption[];
  /** What the location score is measured against. */
  basis: { placesCount: number; label: string };
  checkInDate: string;
  checkOutDate: string;
}

const hotelSearchSchema = z.object({
  query: z.string().trim().max(80).optional(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  adults: z.number().int().min(1).max(12).optional(),
});

function bookingSearchUrl(name: string, city: string, checkIn: string, checkOut: string, adults: number): string {
  const params = new URLSearchParams({
    ss: `${name}, ${city}`,
    checkin: checkIn,
    checkout: checkOut,
    group_adults: String(adults),
    no_rooms: "1",
  });
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

/** 10 when the average hop to your places is ≤10 min, 0 at ≥60 min. */
function locationScore(avgMinutes: number): number {
  const clamped = Math.min(Math.max(avgMinutes, 10), 60);
  return Math.round(((60 - clamped) / 50) * 100) / 10;
}

function firstUncoveredRange(leg: TripLeg): { checkIn: string; checkOut: string } {
  const nights = getUncoveredNights(leg);
  if (nights.length === 0) return { checkIn: leg.startDate, checkOut: leg.endDate > leg.startDate ? leg.endDate : addDays(leg.startDate, 1) };
  let end = nights[0];
  for (const night of nights.slice(1)) {
    if (night !== addDays(end, 1)) break;
    end = night;
  }
  return { checkIn: nights[0], checkOut: addDays(end, 1) };
}

/** Hotels in a leg's city, each scored by how close it is to the places you've actually chosen. */
export async function searchHotelsForLeg(
  userId: string,
  tripId: string,
  legId: string,
  raw: unknown,
): Promise<Result<HotelSearchResult>> {
  const parsed = hotelSearchSchema.safeParse(raw ?? {});
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid search" };

  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };
  const leg = trip.legs.find((l) => l.id === legId);
  if (!leg) return { success: false, error: "Trip leg not found" };

  try {
    const ownerKeys = await getOwnerApiKeysForTripDto(trip);
    assertGoogleMapsKey(ownerKeys, "trip");
    if (!(await checkAndIncrementSearchLimit(userId))) {
      return { success: false, error: "Daily search limit reached. Try again tomorrow." };
    }

    const chosen = (await PlacesService.getCachedPlaces(leg.selectedPlaceIds)).filter((p) => p.coordinates);
    const pool = chosen.length > 0 ? chosen : (await PlacesService.getCachedPlaces(leg.discoveryPoolIds.slice(0, 30))).filter((p) => p.coordinates);
    const targets = pool.map((p) => p.coordinates!);
    const center = getLegStartPoint({ ...leg, hotelCoordinates: undefined }, pool) ?? undefined;

    const results = await PlacesService.searchHotels({
      query: parsed.data.query || "best hotels",
      city: leg.baseCity,
      country: leg.country,
      location: center,
      limit: MAX_HOTEL_SEARCH_RESULTS,
      googleMapsApiKey: ownerKeys.googleMaps,
    });

    const context = { city: leg.baseCity, state: leg.state, country: leg.country };
    await PlaceCacheRepository.upsertMany(results.map((r) => ({ ...mapSearchResultToPlace(r, context), category: "Hotel" })));

    const range = firstUncoveredRange(leg);
    const checkIn = parsed.data.checkInDate ?? range.checkIn;
    const checkOut = parsed.data.checkOutDate ?? range.checkOut;
    const adults = parsed.data.adults ?? 2;

    const hotels: HotelOption[] = results.map((r) => {
      let avg: number | undefined;
      let within15: number | undefined;
      if (r.coordinates && targets.length > 0) {
        const minutes = targets.map((t) => estimateTravelMinutes(r.coordinates!, t, trip.transportationMode));
        avg = Math.round(minutes.reduce((s, m) => s + m, 0) / minutes.length);
        within15 = minutes.filter((m) => m <= 15).length;
      }
      return {
        googlePlaceId: r.googlePlaceId,
        name: r.name,
        address: r.address,
        coordinates: r.coordinates,
        rating: r.rating,
        userRatingCount: r.userRatingCount,
        priceLevel: r.priceLevel,
        photoUrl: r.photoName ? `${buildPlacePhotoProxyUrl(r.photoName, 320)}&tripId=${trip.id}` : undefined,
        avgMinutesToPlaces: avg,
        placesWithin15Min: within15,
        locationScore: avg !== undefined ? locationScore(avg) : undefined,
        distanceToCenterKm:
          r.coordinates && center ? Math.round(estimateRoadKm(r.coordinates, center) * 10) / 10 : undefined,
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${r.googlePlaceId}`,
        bookingUrl: bookingSearchUrl(r.name, leg.baseCity, checkIn, checkOut, adults),
      };
    });

    hotels.sort((a, b) => {
      // Best location first, then rating — a well-placed 4.2 beats a far-flung 4.6 for sightseeing.
      const scoreA = (a.locationScore ?? 5) * 0.7 + (a.rating ?? 3.5) * 0.9;
      const scoreB = (b.locationScore ?? 5) * 0.7 + (b.rating ?? 3.5) * 0.9;
      return scoreB - scoreA;
    });

    return {
      success: true,
      data: {
        hotels,
        basis: {
          placesCount: targets.length,
          label:
            chosen.length > 0
              ? `your ${chosen.length} chosen place${chosen.length === 1 ? "" : "s"} in ${leg.baseCity}`
              : targets.length > 0
                ? `top sights in ${leg.baseCity}`
                : leg.baseCity,
        },
        checkInDate: checkIn,
        checkOutDate: checkOut,
      },
    };
  } catch (err) {
    if (err instanceof ApiKeyError) return { success: false, error: err.message };
    return { success: false, error: err instanceof Error ? err.message : "Hotel search failed" };
  }
}
