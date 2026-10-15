/** Everything the mobile app needs to run a trip with no signal, in one download: the plan, the
 * places it visits, the road routes, the weather, stays and bookings, and nearby hospitals/police. */
import { createHash } from "node:crypto";
import { getOwnerApiKeysForTripDto } from "@/lib/services/trip-api-keys.service";
import { getRoutesForDays, type DayRoute } from "@/modules/itinerary/services/itinerary-routing.service";
import { PlacesService } from "@/modules/places/services/places.service";
import { GooglePlacesProvider } from "@/modules/places/services/google-places.provider";
import { getTripWeatherForTrip, type DayWeather } from "@/modules/trips/services/trip-weather.service";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { Itinerary } from "@/modules/itinerary/types";
import { ItineraryRepository } from "@/repositories/itinerary.repository";
import { TripRepository } from "@/repositories/trip.repository";
import type { ActionResult } from "@/lib/response";

export interface OfflinePlace {
  googlePlaceId: string;
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  category?: string;
  rating?: number;
  userRatingCount?: number;
  weekdayDescriptions?: string[];
  entryFee?: string;
  priceLevel?: string;
  description?: string;
}

export interface SafetyPlace {
  kind: "hospital" | "police" | "pharmacy";
  name: string;
  coordinates: { lat: number; lng: number };
  phone?: string;
  /** Which stay or city it's near. */
  near: string;
  distanceKm: number;
}

export interface OfflineBundle {
  version: string;
  generatedAt: string;
  trip: Omit<Trip, "discoveryPoolIds" | "foodPoolIds" | "marketPoolIds" | "vehicleRentalSuggestions" | "destinationBrief">;
  itinerary: Itinerary | null;
  places: OfflinePlace[];
  routes: DayRoute[];
  weather: DayWeather[];
  safety: SafetyPlace[];
  emergencyNumbers: { label: string; number: string }[];
}

/** Changes whenever the trip or its plan changes — the app compares it to know its copy is stale. */
function bundleVersion(trip: Trip, itinerary: Itinerary | null): string {
  return createHash("sha1")
    .update(`${trip.id}|${trip.updatedAt}|${itinerary?.updatedAt ?? "none"}`)
    .digest("hex")
    .slice(0, 16);
}

const EMERGENCY_NUMBERS: Record<string, { label: string; number: string }[]> = {
  india: [
    { label: "Emergency (all services)", number: "112" },
    { label: "Police", number: "100" },
    { label: "Ambulance", number: "108" },
    { label: "Fire", number: "101" },
    { label: "Women's helpline", number: "1091" },
    { label: "Tourist helpline (24×7)", number: "1800111363" },
  ],
  "united states": [{ label: "Emergency", number: "911" }],
  "united kingdom": [
    { label: "Emergency", number: "999" },
    { label: "Non-emergency police", number: "101" },
  ],
};

function emergencyNumbersFor(country: string | undefined) {
  return EMERGENCY_NUMBERS[(country ?? "").trim().toLowerCase()] ?? [{ label: "Emergency", number: "112" }];
}

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = Math.PI / 180;
  const x = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
}

/** Nearest hospitals, police and pharmacies around a point, from OpenStreetMap (free, no key). */
async function safetyNearOsm(point: { lat: number; lng: number }, near: string): Promise<SafetyPlace[]> {
  const radius = 6000;
  const q = `[out:json][timeout:12];(
    nwr["amenity"="hospital"](around:${radius},${point.lat},${point.lng});
    nwr["amenity"="police"](around:${radius},${point.lat},${point.lng});
    nwr["amenity"="pharmacy"](around:${radius},${point.lat},${point.lng});
  );out center tags 60;`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Trippin/1.0 (trip planner)" },
      body: `data=${encodeURIComponent(q)}`,
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      elements?: { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[];
    };
    const all = (data.elements ?? [])
      .map((e): SafetyPlace | null => {
        const lat = e.lat ?? e.center?.lat;
        const lng = e.lon ?? e.center?.lon;
        const tags = e.tags ?? {};
        if (lat === undefined || lng === undefined || !tags.name) return null;
        const coordinates = { lat, lng };
        return {
          kind: tags.amenity as SafetyPlace["kind"],
          name: tags["name:en"] ?? tags.name,
          coordinates,
          phone: tags.phone ?? tags["contact:phone"],
          near,
          distanceKm: Math.round(km(point, coordinates) * 10) / 10,
        };
      })
      .filter((p): p is SafetyPlace => p !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    // The closest few of each kind.
    const keep = { hospital: 4, police: 3, pharmacy: 3 };
    return all.filter((p) => keep[p.kind]-- > 0);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// Hospitals by popularity — the nearest "hospital" is often a one-doctor clinic.
const SAFETY_KINDS: { kind: SafetyPlace["kind"]; type: string; keep: number; rank: "DISTANCE" | "POPULARITY" }[] = [
  { kind: "hospital", type: "hospital", keep: 4, rank: "POPULARITY" },
  { kind: "police", type: "police", keep: 3, rank: "DISTANCE" },
  { kind: "pharmacy", type: "pharmacy", keep: 3, rank: "DISTANCE" },
];

/** Google first (the trip owner's key, cheapest fields), OpenStreetMap when there's no key or it fails. */
async function safetyNear(point: { lat: number; lng: number }, near: string, googleKey: string | undefined): Promise<SafetyPlace[]> {
  if (googleKey) {
    try {
      const provider = new GooglePlacesProvider(googleKey);
      const lists = await Promise.all(
        SAFETY_KINDS.map(async ({ kind, type, keep, rank }) =>
          (await provider.nearestOfType(point, type, 8000, keep, rank)).map((p) => ({
            kind,
            name: p.name,
            coordinates: p.coordinates,
            near,
            distanceKm: Math.round(km(point, p.coordinates) * 10) / 10,
          })),
        ),
      );
      const found = lists.flat().sort((a, b) => (a.kind === b.kind ? a.distanceKm - b.distanceKm : 0));
      if (found.length) return found;
    } catch {
      // fall through to OpenStreetMap
    }
  }
  return safetyNearOsm(point, near);
}

/** Where safety info is looked up: each stay, else each city's base. */
function safetyPoints(trip: Trip): { point: { lat: number; lng: number }; near: string }[] {
  const out: { point: { lat: number; lng: number }; near: string }[] = [];
  for (const leg of trip.legs) {
    const stays = (leg.stays ?? []).filter((s) => s.coordinates);
    if (stays.length) for (const s of stays) out.push({ point: s.coordinates!, near: s.name });
    else if (leg.hotelCoordinates) out.push({ point: leg.hotelCoordinates, near: leg.hotelName || leg.baseCity });
    for (const d of leg.dayTrips ?? []) if (d.coordinates) out.push({ point: d.coordinates, near: d.name });
  }
  if (out.length === 0 && trip.hotelCoordinates) out.push({ point: trip.hotelCoordinates, near: trip.hotelName ?? trip.destinationCity });
  // One lookup per distinct ~2 km area.
  return out.filter((p, i) => out.findIndex((q) => km(p.point, q.point) < 2) === i).slice(0, 6);
}

export async function getOfflineBundleVersion(userId: string, tripId: string): Promise<ActionResult<{ version: string }>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };
  const itinerary = await ItineraryRepository.findByTripId(tripId);
  return { success: true, data: { version: bundleVersion(trip, itinerary) } };
}

export async function getOfflineBundle(userId: string, tripId: string): Promise<ActionResult<OfflineBundle>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };
  const itinerary = await ItineraryRepository.findByTripId(tripId);

  const placeIds = new Set<string>(trip.legs.flatMap((l) => l.selectedPlaceIds));
  for (const day of itinerary?.days ?? []) for (const s of day.stops) if (s.placeId) placeIds.add(s.placeId);

  const keys = await getOwnerApiKeysForTripDto(trip);
  const [cached, routes, weather, safety] = await Promise.all([
    PlacesService.getCachedPlaces([...placeIds]).catch(() => []),
    itinerary && keys.googleMaps ? getRoutesForDays(trip, itinerary.days, keys.googleMaps).catch(() => []) : Promise.resolve([]),
    getTripWeatherForTrip(trip).catch(() => []),
    Promise.all(safetyPoints(trip).map((p) => safetyNear(p.point, p.near, keys.googleMaps))).then((r) => r.flat()),
  ]);

  const places: OfflinePlace[] = cached
    .filter((p) => p.googlePlaceId)
    .map((p) => ({
      googlePlaceId: p.googlePlaceId!,
      name: p.name,
      address: p.formattedAddress,
      coordinates: p.coordinates,
      category: p.category,
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      weekdayDescriptions: p.weekdayDescriptions,
      entryFee: p.entryFee,
      priceLevel: p.priceLevel,
      description: p.description,
    }));

  const { discoveryPoolIds: _d, foodPoolIds: _f, marketPoolIds: _m, vehicleRentalSuggestions: _v, destinationBrief: _b, ...slimTrip } = trip;

  return {
    success: true,
    data: {
      version: bundleVersion(trip, itinerary),
      generatedAt: new Date().toISOString(),
      trip: slimTrip,
      itinerary,
      places,
      routes,
      weather,
      safety,
      emergencyNumbers: emergencyNumbersFor(trip.destinationCountry),
    },
  };
}
