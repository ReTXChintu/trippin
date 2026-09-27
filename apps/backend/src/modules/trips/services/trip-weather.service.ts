import { TripRepository } from "@/repositories/trip.repository";
import { PlacesService } from "@/modules/places/services/places.service";
import { buildTripDayPlans, getEffectiveLegs, getLegStartPoint } from "@/modules/trips/utils/trip-leg.utils";
import { getDayStartStay } from "@/modules/trips/utils/stay.utils";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";

/** Open-Meteo: free, no key. Forecasts reach ~16 days out; beyond that we show last year's weather
 * on the same dates as a "typical" guide. */
const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_API = "https://archive-api.open-meteo.com/v1/archive";
const FORECAST_HORIZON_DAYS = 15;
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

export interface DayWeather {
  date: string;
  legId?: string;
  /** WMO weather code */
  code: number;
  summary: string;
  icon: string;
  tempMaxC: number;
  tempMinC: number;
  /** Forecast only: chance of rain (%). */
  rainChance?: number;
  /** Past-year only: rain that fell that day (mm). */
  rainMm?: number;
  /** "forecast" = real forecast; "typical" = same dates last year. */
  kind: "forecast" | "typical";
}

const cache = new Map<string, { at: number; data: DayWeather[] }>();

function describe(code: number): { summary: string; icon: string } {
  if (code === 0) return { summary: "Clear", icon: "☀️" };
  if (code <= 2) return { summary: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { summary: "Cloudy", icon: "☁️" };
  if (code === 45 || code === 48) return { summary: "Fog", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { summary: "Drizzle", icon: "🌦️" };
  if (code >= 61 && code <= 67) return { summary: "Rain", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { summary: "Snow", icon: "🌨️" };
  if (code >= 80 && code <= 82) return { summary: "Showers", icon: "🌦️" };
  if (code >= 85 && code <= 86) return { summary: "Snow showers", icon: "🌨️" };
  if (code >= 95) return { summary: "Thunderstorms", icon: "⛈️" };
  return { summary: "Mixed", icon: "🌤️" };
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function shiftYear(date: string, years: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/** Smallest whole number of years to shift `dates` back so they're all in the past. */
function yearsBackToPast(dates: string[], today: string): number {
  if (dates.length === 0) return 0;
  let years = 1;
  while (shiftYear(dates[dates.length - 1], -years) >= today) years++;
  return years;
}

async function legPoint(leg: TripLeg, date: string): Promise<{ lat: number; lng: number } | null> {
  const stay = getDayStartStay(leg, date)?.coordinates;
  if (stay) return stay;
  const places = await PlacesService.getCachedPlaces([...leg.selectedPlaceIds, ...leg.discoveryPoolIds].slice(0, 20));
  return getLegStartPoint(leg, places);
}

interface DailyBlock {
  time?: string[];
  weather_code?: number[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_probability_max?: number[];
  precipitation_sum?: number[];
}

async function fetchDaily(url: string, params: Record<string, string>): Promise<DailyBlock | null> {
  try {
    const response = await fetch(`${url}?${new URLSearchParams(params).toString()}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { daily?: DailyBlock };
    return data.daily ?? null;
  } catch {
    return null;
  }
}

function toDays(block: DailyBlock | null, kind: DayWeather["kind"], legId: string, dateMap?: (d: string) => string): DayWeather[] {
  if (!block?.time) return [];
  return block.time.map((time, i) => {
    const code = block.weather_code?.[i] ?? 0;
    return {
      date: dateMap ? dateMap(time) : time,
      legId,
      code,
      ...describe(code),
      tempMaxC: Math.round(block.temperature_2m_max?.[i] ?? 0),
      tempMinC: Math.round(block.temperature_2m_min?.[i] ?? 0),
      rainChance: block.precipitation_probability_max?.[i] ?? undefined,
      rainMm: block.precipitation_sum?.[i] !== undefined ? Math.round(block.precipitation_sum[i] * 10) / 10 : undefined,
      kind,
    };
  });
}

/** Weather for every trip date, per leg location. Missing when a leg has no location yet. */
export async function getTripWeatherForTrip(trip: Trip): Promise<DayWeather[]> {
  const cacheKey = `${trip.id}:${trip.updatedAt}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const today = new Date().toISOString().slice(0, 10);
  const horizon = addDays(today, FORECAST_HORIZON_DAYS);
  const plans = buildTripDayPlans(trip);
  const results: DayWeather[] = [];

  for (const leg of getEffectiveLegs(trip)) {
    const dates = plans
      .filter(({ date, plan }) =>
        (plan.type === "sightseeing" && plan.leg.id === leg.id) ||
        (plan.type === "transfer" && plan.transfer.toLegId === leg.id) ||
        (date >= leg.startDate && date <= leg.endDate),
      )
      .map((p) => p.date);
    if (dates.length === 0) continue;

    const point = await legPoint(leg, dates[0]);
    if (!point) continue;
    const coords = { latitude: String(point.lat), longitude: String(point.lng), timezone: "auto" };

    const forecastDates = dates.filter((d) => d >= today && d <= horizon);
    const pastDates = dates.filter((d) => d < today);
    const farDates = dates.filter((d) => d > horizon);

    if (forecastDates.length > 0) {
      const block = await fetchDaily(FORECAST_API, {
        ...coords,
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        start_date: forecastDates[0],
        end_date: forecastDates[forecastDates.length - 1],
      });
      results.push(...toDays(block, "forecast", leg.id));
    }

    // Past days: what actually happened. Far-future days: the same dates in the latest past year.
    for (const [group, yearsBack] of [
      [pastDates, 0],
      [farDates, yearsBackToPast(farDates, today)],
    ] as const) {
      if (group.length === 0) continue;
      const block = await fetchDaily(ARCHIVE_API, {
        ...coords,
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
        start_date: shiftYear(group[0], -yearsBack),
        end_date: shiftYear(group[group.length - 1], -yearsBack),
      });
      results.push(...toDays(block, "typical", leg.id, (d) => shiftYear(d, yearsBack)));
    }
  }

  const wanted = new Set(plans.map((p) => p.date));
  const byDate = new Map<string, DayWeather>();
  for (const day of results) if (wanted.has(day.date) && !byDate.has(day.date)) byDate.set(day.date, day);
  const data = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  cache.set(cacheKey, { at: Date.now(), data });
  return data;
}

export async function getTripWeather(
  userId: string,
  tripId: string,
): Promise<{ success: true; data: { days: DayWeather[] } } | { success: false; error: string }> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };
  return { success: true, data: { days: await getTripWeatherForTrip(trip) } };
}
