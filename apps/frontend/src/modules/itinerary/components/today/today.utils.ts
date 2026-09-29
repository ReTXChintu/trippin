import type { ItineraryStop } from "@/modules/itinerary/types";
import { formatDuration, toMinutes } from "@/modules/itinerary/utils/plan.utils";
import type { TransportationMode } from "@/types";

export const GOOGLE_MODE: Record<TransportationMode, string> = {
  Walking: "walking",
  Cab: "driving",
  "Self Drive": "driving",
  Bike: "bicycling",
  "Public Transport": "transit",
};

const MODE_PHRASE: Record<TransportationMode, string> = {
  Walking: "walk",
  Cab: "by taxi",
  "Self Drive": "drive",
  Bike: "by bike",
  "Public Transport": "by transit",
};

export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function hhmm(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Countdown style used on the Now card: "1 h 12 min", "45 min", "2 h". */
export function countdown(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** Stops you actually go to / do — structural ones (travel, back to hotel) are shown but not actionable. */
export function isActionable(stop: ItineraryStop): boolean {
  return stop.stopType !== "transfer" && stop.stopType !== "return";
}

/** An open meal slot (no restaurant chosen yet). */
export function isOpenMeal(stop: ItineraryStop): boolean {
  return stop.stopType === "meal" && !stop.placeId;
}

/** Second line under a coming-up stop: fixed start, travel time, or opening hours. */
export function stopSubline(stop: ItineraryStop, mode: TransportationMode): string {
  if (stop.fixedStartTime) return `Fixed start ${stop.fixedStartTime}`;
  if (stop.stopType === "transfer") return "Travel";
  if (stop.travelDurationMinutes > 0) {
    return `${formatDuration(stop.travelDurationMinutes)} ${MODE_PHRASE[mode] ?? "away"}`;
  }
  return [stop.category, formatDuration(stop.visitDurationMinutes)].filter(Boolean).join(" · ");
}

export type FocusTone = "now" | "next" | "late" | "preview";

export interface FocusState {
  tone: FocusTone;
  /** Pill text ("Now", "Next", "Running late", "First up"). */
  pill: string;
  countdownLabel: string;
  countdownValue: string;
  sideLabel?: string;
  sideValue?: string;
  /** Extra line (leave-by hint). */
  detail?: string;
}

/** Works out what the Now card says for the focus stop at the given minute of the day. */
export function focusStateFor(
  focus: ItineraryStop,
  nextStop: ItineraryStop | undefined,
  nowMin: number,
  isToday: boolean,
): FocusState {
  const arrive = toMinutes(focus.arrivalTime);
  const leave = toMinutes(focus.departureTime);

  if (!isToday) {
    return {
      tone: "preview",
      pill: "First up",
      countdownLabel: "Starts at",
      countdownValue: focus.arrivalTime,
      sideLabel: "Time here",
      sideValue: countdown(focus.visitDurationMinutes),
    };
  }

  if (nowMin < arrive) {
    const leaveBy = arrive - focus.travelDurationMinutes;
    const detail =
      focus.travelDurationMinutes > 0
        ? nowMin >= leaveBy
          ? `Head out now — ${formatDuration(focus.travelDurationMinutes)} to get there`
          : `Leave by ${hhmm(leaveBy)} · ${formatDuration(focus.travelDurationMinutes)} away`
        : undefined;
    return {
      tone: "next",
      pill: "Next",
      countdownLabel: "Starts in",
      countdownValue: countdown(arrive - nowMin),
      sideLabel: "Time here",
      sideValue: countdown(focus.visitDurationMinutes),
      detail,
    };
  }

  if (nowMin <= leave) {
    const nextIn = nextStop ? toMinutes(nextStop.arrivalTime) - nowMin : undefined;
    return {
      tone: "now",
      pill: "Now",
      countdownLabel: "Time left here",
      countdownValue: countdown(leave - nowMin),
      sideLabel: nextIn !== undefined ? "Next stop in" : "Leave at",
      sideValue: nextIn !== undefined ? countdown(nextIn) : focus.departureTime,
    };
  }

  return {
    tone: "late",
    pill: "Running late",
    countdownLabel: "Behind the plan",
    countdownValue: countdown(nowMin - leave),
    sideLabel: "Planned",
    sideValue: `${focus.arrivalTime}–${focus.departureTime}`,
    detail: `You're ${formatDuration(nowMin - leave)} behind the plan`,
  };
}
