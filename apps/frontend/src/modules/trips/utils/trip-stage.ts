import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Trip } from "@/modules/trips/types/trip.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import { getUncoveredNights } from "@/modules/trips/utils/stay.utils";

/** The seven stages a trip moves through. They guide but never gate: every stage is a link and its
 * status comes from the trip's own data. */
export type StageKey = "setup" | "places" | "stays" | "plan" | "refine" | "book" | "travel";
export type StageStatus = "done" | "warn" | "current" | "todo";
export type TripTabKey = "plan" | "places" | "stays" | "food" | "bookings" | "budget" | "checklist" | "guide";

export interface TripStage {
  key: StageKey;
  label: string;
  status: StageStatus;
  detail: string;
  tab?: TripTabKey;
}

export interface NextStep {
  text: string;
  actionLabel: string;
  tab?: TripTabKey;
  legId?: string;
  today?: boolean;
}

export interface StageSummary {
  stages: TripStage[];
  doneCount: number;
  next: NextStep | null;
}

interface PlanInfo {
  hasPlan: boolean;
  /** Edits since generating (history length). */
  edits: number;
}

function legName(name: string, city: string): string {
  return name || city || "this city";
}

export function getTripStages(trip: Trip, plan?: PlanInfo | null, today = new Date()): StageSummary {
  const legs = getEffectiveLegs(trip);
  const setupDone = legs.length > 0 && Boolean(trip.startDate);

  const legsWithoutPlaces = legs.filter((l) => (l.selectedPlaceIds?.length ?? 0) === 0);
  const picked = legs.reduce((n, l) => n + (l.selectedPlaceIds?.length ?? 0), 0);

  const uncovered = legs.map((l) => ({ leg: l, nights: getUncoveredNights(l) })).filter((x) => x.nights.length > 0);

  const bookedTransfers = new Set((trip.bookings ?? []).map((b) => b.transferId).filter(Boolean));
  const unbooked = (trip.transfers ?? []).filter((t) => !bookedTransfers.has(t.id));

  const start = parseISO(trip.startDate.slice(0, 10));
  const end = parseISO(trip.endDate.slice(0, 10));
  const daysToStart = differenceInCalendarDays(start, today);
  const started = daysToStart <= 0;
  const finished = differenceInCalendarDays(today, end) > 0;

  const hasPlan = plan?.hasPlan ?? false;
  const edits = plan?.edits ?? 0;

  const stages: TripStage[] = [
    { key: "setup", label: "Set up", status: setupDone ? "done" : "current", detail: setupDone ? "Done" : "Add a city", tab: "plan" },
    {
      key: "places",
      label: "Places",
      status: picked === 0 ? "todo" : legsWithoutPlaces.length > 0 ? "warn" : "done",
      detail: picked === 0 ? "None yet" : legsWithoutPlaces.length > 0 ? `${legName(legsWithoutPlaces[0].name, legsWithoutPlaces[0].baseCity)} empty` : `${picked} picked`,
      tab: "places",
    },
    {
      key: "stays",
      label: "Stays",
      status: uncovered.length === 0 ? "done" : "warn",
      detail: uncovered.length === 0 ? "All nights" : `${legName(uncovered[0].leg.name, uncovered[0].leg.baseCity)} uncovered`,
      tab: "stays",
    },
    { key: "plan", label: "Plan", status: hasPlan ? "done" : "todo", detail: hasPlan ? "Generated" : "Not yet", tab: "plan" },
    {
      key: "refine",
      label: "Refine",
      status: !hasPlan ? "todo" : edits > 0 ? "done" : "current",
      detail: !hasPlan ? "After the plan" : edits > 0 ? `${edits} edit${edits === 1 ? "" : "s"} so far` : "Drag, lock, meals",
      tab: "plan",
    },
    {
      key: "book",
      label: "Book & budget",
      status: unbooked.length === 0 ? "done" : "warn",
      detail: unbooked.length === 0 ? "All booked" : `${unbooked.length} booking${unbooked.length === 1 ? "" : "s"} missing`,
      tab: "bookings",
    },
    {
      key: "travel",
      label: "Travel",
      status: finished ? "done" : started ? "current" : "todo",
      detail: finished ? "Finished" : started ? `Day ${1 - daysToStart}` : daysToStart === 1 ? "Starts tomorrow" : `Starts in ${daysToStart} days`,
    },
  ];

  let next: NextStep | null = null;
  if (!setupDone) next = { text: "Add your first city", actionLabel: "Add city" };
  else if (picked === 0 || legsWithoutPlaces.length > 0) {
    const leg = legsWithoutPlaces[0] ?? legs[0];
    next = { text: `Add places for ${legName(leg.name, leg.baseCity)}`, actionLabel: "Pick places", tab: "places", legId: leg.id };
  } else if (uncovered.length > 0) {
    const { leg, nights } = uncovered[0];
    next = {
      text: `Add a stay for ${legName(leg.name, leg.baseCity)}, ${nights.length} night${nights.length === 1 ? "" : "s"}`,
      actionLabel: "Add stay",
      tab: "stays",
      legId: leg.id,
    };
  } else if (!hasPlan) next = { text: "Generate the day-by-day plan", actionLabel: "Generate", tab: "plan" };
  else if (unbooked.length > 0) {
    const t = unbooked[0];
    const from = legs.find((l) => l.id === t.fromLegId);
    const to = legs.find((l) => l.id === t.toLegId);
    next = { text: `Book ${from?.baseCity ?? "travel"} → ${to?.baseCity ?? ""}`.trim(), actionLabel: "Add booking", tab: "bookings" };
  } else if (started && !finished) next = { text: "You're on the trip", actionLabel: "Open Today", today: true };

  return { stages, doneCount: stages.filter((s) => s.status === "done").length, next };
}
