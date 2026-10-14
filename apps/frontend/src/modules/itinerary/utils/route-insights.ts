import { haversineKm } from "@/utils/geo";
import type { ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";

type Point = { lat: number; lng: number };

/** A stop this far from every other visit of its day is probably pinned in the wrong place. */
const FAR_STOP_KM = 30;
/** Only suggest reordering when it saves at least this much (km and share of the route). */
const MIN_SAVING_KM = 5;
const MIN_SAVING_SHARE = 0.15;
/** A day may run a little past its end time before it's flagged. */
const OVERRUN_GRACE_MIN = 30;

const toMin = (t?: string) => {
  if (!t) return NaN;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const isVisitWithPoint = (s: ItineraryStop) =>
  s.stopType !== "meal" && s.stopType !== "transfer" && s.stopType !== "return" && Boolean(s.coordinates);

function length(points: Point[]): number {
  let km = 0;
  for (let i = 1; i < points.length; i++) km += haversineKm(points[i - 1], points[i]);
  return km;
}

/** Same idea as the server's optimiser (nearest neighbour + 2-opt), for an estimate only. */
function shortestOrder(points: Point[], start: Point, end: Point): number {
  const left = [...points];
  const ordered: Point[] = [];
  let cur = start;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) if (haversineKm(cur, left[i]) < haversineKm(cur, left[best])) best = i;
    cur = left.splice(best, 1)[0];
    ordered.push(cur);
  }
  let route = ordered;
  let score = length([start, ...route, end]);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const cand = [...route.slice(0, i), ...route.slice(i, k + 1).reverse(), ...route.slice(k + 1)];
        const s = length([start, ...cand, end]);
        if (s + 1e-9 < score) {
          route = cand;
          score = s;
          improved = true;
        }
      }
    }
  }
  return score;
}

export interface DayRouteInsights {
  /** km a better order would save (0 when not worth suggesting). */
  savingKm: number;
  /** Minutes the day runs past its planned end (0 when within the grace period). */
  overrunMinutes: number;
  /** Clock time the day really ends, with "+1 day" when it crosses midnight. */
  endsAt?: string;
  /** Visits far from all the day's other visits: stop id → km to the nearest one. */
  farStops: Map<string, number>;
}

export function dayRouteInsights(day: ItineraryDay, dayEnd: string, start?: Point | null): DayRouteInsights {
  const visits = day.stops.filter(isVisitWithPoint);
  const points = visits.map((s) => s.coordinates!);
  const origin = start ?? points[0];

  let savingKm = 0;
  if (origin && points.length >= 3) {
    const current = length([origin, ...points, origin]);
    const best = shortestOrder(points, origin, origin);
    const saving = current - best;
    if (saving >= MIN_SAVING_KM && saving / current >= MIN_SAVING_SHARE) savingKm = Math.round(saving);
  }

  // Walk the clock; a time earlier than the one before means the day crossed midnight.
  let offset = 0;
  let prev = -1;
  let last = NaN;
  // The drive back to the stay after the day's end is expected — measure to the last stop before it.
  for (const s of day.stops) {
    if (s.stopType === "transfer" || s.stopType === "return") continue;
    for (const t of [toMin(s.arrivalTime), toMin(s.departureTime)]) {
      if (Number.isNaN(t)) continue;
      if (prev >= 0 && t + offset < prev - 60) offset += 1440;
      prev = t + offset;
      last = prev;
    }
  }
  const end = toMin(dayEnd);
  const over = Number.isNaN(last) || Number.isNaN(end) ? 0 : last - end;
  const overrunMinutes = over > OVERRUN_GRACE_MIN ? over : 0;
  const endsAt = Number.isNaN(last)
    ? undefined
    : `${String(Math.floor((last % 1440) / 60)).padStart(2, "0")}:${String(last % 60).padStart(2, "0")}${last >= 1440 ? " (+1 day)" : ""}`;

  const farStops = new Map<string, number>();
  if (visits.length >= 3) {
    for (const s of visits) {
      const nearest = Math.min(...visits.filter((o) => o.id !== s.id).map((o) => haversineKm(s.coordinates!, o.coordinates!)));
      if (nearest > FAR_STOP_KM) farStops.set(s.id, Math.round(nearest));
    }
  }

  return { savingKm, overrunMinutes, endsAt, farStops };
}

/** "Ujjain" when this day is a day trip from its city: the day's fixed date, or most of its visits are
 * closer to that town than to the stay. */
export function dayTripName(
  day: ItineraryDay,
  dayTrips: { name: string; date?: string; coordinates?: Point }[] | undefined,
  base?: Point | null,
): string | undefined {
  if (!dayTrips?.length) return undefined;
  const fixed = dayTrips.find((d) => d.date === day.date);
  if (fixed) return fixed.name;
  const located = dayTrips.filter((d) => d.coordinates);
  const visits = day.stops.filter(isVisitWithPoint);
  if (!base || located.length === 0 || visits.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const v of visits) {
    const nearest = [...located].sort((a, b) => haversineKm(v.coordinates!, a.coordinates!) - haversineKm(v.coordinates!, b.coordinates!))[0];
    if (haversineKm(v.coordinates!, nearest.coordinates!) < haversineKm(v.coordinates!, base)) counts.set(nearest.name, (counts.get(nearest.name) ?? 0) + 1);
  }
  const [top] = [...counts].sort((a, b) => b[1] - a[1]);
  return top && top[1] / visits.length >= 0.6 ? top[0] : undefined;
}
