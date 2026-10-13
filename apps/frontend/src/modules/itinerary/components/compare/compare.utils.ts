import type { ItineraryDay, ItineraryDayWithDistance } from "@/modules/itinerary/types";
import { isVisit } from "@/modules/itinerary/utils/plan.utils";

/** Places you actually visit that day (no meals, travel or back-to-hotel). */
export function visitCount(day: ItineraryDay): number {
  return day.stops.filter(isVisit).length;
}

export function roundKm(km: number | undefined): number {
  return Math.round(km ?? 0);
}

/** "Amber Fort → City Palace → Hawa Mahal" — the day's route, skipping travel, hotel returns and unpicked meals. */
export function routeLine(day: ItineraryDay): string {
  return day.stops
    .filter((s) => s.stopType !== "transfer" && s.stopType !== "return" && !(s.stopType === "meal" && !s.placeId))
    .map((s) => s.placeName)
    .join(" → ");
}

export function stopsLabel(day: ItineraryDayWithDistance): string {
  const n = visitCount(day);
  return `${n} stop${n === 1 ? "" : "s"} · ${roundKm(day.distanceKm)} km`;
}

/** Short labels for how the AI day differs from yours ("1 fewer stop", "Shorter by 3 km"). */
export function differenceLabels(system: ItineraryDayWithDistance | undefined, ai: ItineraryDayWithDistance): string[] {
  if (!system) return [];
  const labels: string[] = [];
  const stopDiff = visitCount(ai) - visitCount(system);
  if (stopDiff !== 0) {
    const n = Math.abs(stopDiff);
    labels.push(`${n} ${stopDiff < 0 ? "fewer" : "more"} stop${n === 1 ? "" : "s"}`);
  }
  const kmDiff = roundKm(ai.distanceKm) - roundKm(system.distanceKm);
  if (Math.abs(kmDiff) >= 1) labels.push(`${kmDiff < 0 ? "Shorter" : "Longer"} by ${Math.abs(kmDiff)} km`);
  if (labels.length === 0) {
    const ids = (d: ItineraryDay) => d.stops.filter(isVisit).map((s) => s.placeId);
    const a = ids(ai);
    const b = ids(system);
    const sameSet = a.length === b.length && a.every((id) => b.includes(id));
    if (!sameSet) labels.push("Different places");
    else if (a.join() !== b.join()) labels.push("New order");
  }
  return labels;
}

/** Ready-made wishes, using real place names from the plan when there are some. */
export function instructionExamples(placeNames: string[]): string[] {
  const [a, b, c] = placeNames;
  const out: string[] = [];
  if (a && b) out.push(`Keep ${a} and ${b} on day 1`);
  if (c) out.push(`Put ${c} on the last day`);
  out.push("Keep the last day light — we fly out in the evening");
  out.push("Museums in the mornings, markets in the evenings");
  return out.slice(0, 4);
}
