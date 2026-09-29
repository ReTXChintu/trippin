import type { IconType } from "react-icons";
import {
  LuBike,
  LuCamera,
  LuCastle,
  LuCoffee,
  LuFlower2,
  LuLandmark,
  LuMountain,
  LuMusic,
  LuShoppingBag,
  LuTreePine,
  LuUtensils,
  LuWaves,
  LuWine,
} from "react-icons/lu";
import type { Place } from "@/modules/places/types/place.types";

const RULES: [RegExp, IconType][] = [
  [/fort|palace|castle|haveli/i, LuCastle],
  [/market|bazaar|shop|mall|store/i, LuShoppingBag],
  [/lake|stepwell|kund|beach|river|water|ghat|waterfall/i, LuWaves],
  [/park|garden|nature|forest|zoo|wildlife/i, LuTreePine],
  [/mountain|hill|viewpoint|trek|peak/i, LuMountain],
  [/cafe|coffee|tea|bakery/i, LuCoffee],
  [/restaurant|food|dining|eat|street/i, LuUtensils],
  [/bar|pub|night|club|wine/i, LuWine],
  [/music|theat|show|cinema|art|gallery/i, LuMusic],
  [/temple|church|mosque|shrine|gurudwara|monastery|religious/i, LuFlower2],
  [/photo|scenic/i, LuCamera],
  [/rental|bike|scooter/i, LuBike],
];

/** Line icon for a place category (museum, fort, market …) — used on photo fallbacks and meta rows. */
export function categoryIcon(category?: string): IconType {
  if (!category) return LuLandmark;
  return RULES.find(([re]) => re.test(category))?.[1] ?? LuLandmark;
}

/** True/false when opening hours are known, undefined when they aren't. Uses the device clock. */
export function isOpenNow(place: Pick<Place, "openingPeriods">, now = new Date()): boolean | undefined {
  const periods = place.openingPeriods;
  if (!periods || periods.length === 0) return undefined;
  // Open 24/7: a single period that opens Sunday 00:00 and never closes.
  if (periods.length === 1 && !periods[0].close) return true;
  const week = 7 * 24 * 60;
  const t = now.getDay() * 24 * 60 + now.getHours() * 60 + now.getMinutes();
  return periods.some((p) => {
    if (!p.close) return false;
    const open = p.open.day * 1440 + p.open.hour * 60 + p.open.minute;
    let close = p.close.day * 1440 + p.close.hour * 60 + p.close.minute;
    if (close <= open) close += week;
    return (t >= open && t < close) || (t + week >= open && t + week < close);
  });
}

/** "Opens 12:00" when a place that's closed now opens later today (device clock), else undefined. */
export function opensLaterToday(place: Pick<Place, "openingPeriods">, now = new Date()): string | undefined {
  const periods = place.openingPeriods;
  if (!periods?.length) return undefined;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const next = periods
    .filter((p) => p.open.day === now.getDay() && p.open.hour * 60 + p.open.minute > nowMin)
    .sort((a, b) => a.open.hour * 60 + a.open.minute - (b.open.hour * 60 + b.open.minute))[0];
  if (!next) return undefined;
  return `Opens ${String(next.open.hour).padStart(2, "0")}:${String(next.open.minute).padStart(2, "0")}`;
}

/** "350 m" / "1.2 km". */
export function formatDistance(km: number): string {
  return km < 1 ? `${Math.max(Math.round((km * 1000) / 50) * 50, 50)} m` : `${km.toFixed(1)} km`;
}

/** "Dal baati churma — baked wheat balls" → name + description (the guide sometimes adds one). */
export function splitDish(text: string): { name: string; description?: string } {
  const m = text.match(/^(.+?)\s*(?:—|–|:|\s-\s|\()\s*(.+?)\)?$/);
  if (!m) return { name: text };
  return { name: m[1].trim(), description: m[2].trim() };
}

/** Toggle filters that live next to the shared place filters (they need trip data to evaluate). */
export interface PlaceQuickFilters {
  openNow: boolean;
  aiMatches: boolean;
  voted: boolean;
}

export const DEFAULT_QUICK_FILTERS: PlaceQuickFilters = { openNow: false, aiMatches: false, voted: false };
