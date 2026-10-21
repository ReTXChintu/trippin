import { Text } from "@chakra-ui/react";
import type { Dispatch, SetStateAction } from "react";
import { fmtDur } from "@/components/ui/plan.utils";
import type { ItineraryDayWithDistance, ItineraryStop, OptionalItineraryPlace } from "@/modules/itinerary/types";
import { formatDayDate } from "@/modules/itinerary/utils/plan.utils";
import { PlanBoard, type BoardColumn, type BoardItem, type BoardMove } from "@/modules/itinerary/components/board/PlanBoard";
import type { FinalDayState } from "./compare.types";

const isStructural = (s: ItineraryStop) => s.stopType === "transfer" || s.stopType === "return";
const subtitle = (s: ItineraryStop) =>
  [s.category, s.visitDurationMinutes ? fmtDur(s.visitDurationMinutes) : null].filter(Boolean).join(" · ") || undefined;

/** Rebuilds a day's stops with a new middle (keeps travel stops first and the return-to-stay last). */
function withMiddle(stops: ItineraryStop[], middle: ItineraryStop[]): ItineraryStop[] {
  return [...stops.filter((s) => s.stopType === "transfer"), ...middle, ...stops.filter((s) => s.stopType === "return")];
}

interface CompareBoardProps {
  currentDays: ItineraryDayWithDistance[];
  aiByDate: Map<string, ItineraryDayWithDistance>;
  optionalPlaces: OptionalItineraryPlace[];
  stateFor: (map: Map<string, FinalDayState>, date: string) => FinalDayState | undefined;
  finalByDate: Map<string, FinalDayState>;
  setFinalByDate: Dispatch<SetStateAction<Map<string, FinalDayState>>>;
  showCity: boolean;
  readOnly: boolean;
}

/**
 * The merged plan as a drag board: each column is a day of the result, and the tray holds every place
 * from your plan, the AI plan or the didn't-fit list that isn't in the result yet. Nothing is saved
 * until "Merge chosen days".
 */
export function CompareBoard({ currentDays, aiByDate, optionalPlaces, stateFor, finalByDate, setFinalByDate, showCity, readOnly }: CompareBoardProps) {
  const states = new Map(currentDays.map((d) => [d.date, stateFor(finalByDate, d.date)]));

  const inResult = new Set<string>();
  for (const st of states.values()) {
    for (const s of st?.stops ?? []) if (s.placeId) inResult.add(s.placeId);
    for (const p of st?.pendingOptional ?? []) inResult.add(p.placeId);
  }

  // Tray: places from either plan (or didn't fit) that the merged result doesn't contain.
  const sourceStops = new Map<string, ItineraryStop>();
  const tray: BoardItem[] = [];
  const add = (stop: ItineraryStop, side: "system" | "ai", day: ItineraryDayWithDistance) => {
    if (!stop.placeId || isStructural(stop) || stop.stopType === "meal" || inResult.has(stop.placeId) || sourceStops.has(stop.placeId)) return;
    const id = `src:${stop.placeId}`;
    sourceStops.set(stop.placeId, stop);
    tray.push({ id, kind: "place", title: stop.placeName, subtitle: subtitle(stop), category: stop.category, city: day.legName, tag: side === "ai" ? "AI" : undefined, draggable: !readOnly });
  };
  for (const d of currentDays) for (const s of d.stops) add(s, "system", d);
  for (const d of aiByDate.values()) for (const s of d.stops) add(s, "ai", d);
  for (const p of optionalPlaces) {
    if (inResult.has(p.placeId) || sourceStops.has(p.placeId)) continue;
    tray.push({ id: `opt:${p.placeId}`, kind: "place", title: p.placeName, subtitle: p.category, category: p.category, tag: "Didn't fit", draggable: !readOnly });
  }

  const columns: BoardColumn[] = currentDays.map((day) => {
    const st = states.get(day.date);
    const middle = (st?.stops ?? []).filter((s) => !isStructural(s));
    const visits = middle.filter((s) => s.stopType !== "meal").length + (st?.pendingOptional.length ?? 0);
    const items: BoardItem[] = [
      ...middle.map((s) => ({
        id: `m:${day.date}:${s.id}`,
        kind: s.stopType === "meal" ? ("meal" as const) : ("stop" as const),
        title: s.placeName,
        time: s.arrivalTime,
        subtitle: subtitle(s),
        category: s.category,
        city: day.legName,
        locked: s.locked,
        draggable: !readOnly && s.stopType !== "meal",
      })),
      ...(st?.pendingOptional ?? []).map((p) => ({
        id: `p:${day.date}:${p.placeId}`,
        kind: "place" as const,
        title: p.placeName,
        subtitle: "Placed when you merge",
        category: p.category,
        city: day.legName,
        tag: "Didn't fit",
        draggable: !readOnly,
      })),
    ];
    const source = st?.source === "ai" ? "AI plan" : st?.source === "custom" ? "Edited" : "Your plan";
    return {
      key: day.date,
      dayNumber: day.dayNumber,
      dateLabel: formatDayDate(day.date, "EEE d MMM"),
      city: showCity ? day.legName : undefined,
      summary: `${visits} ${visits === 1 ? "stop" : "stops"} · ${source}`,
      marker: day.dayType === "transfer" ? (day.transferLabel ?? "Travel day") : day.stops.find((s) => s.stopType === "transfer")?.placeName,
      droppable: !readOnly && day.dayType !== "transfer" && day.dayType !== "free",
      items,
    };
  });

  const onMove = ({ itemId, from, to, index, order }: BoardMove) => {
    setFinalByDate((prev) => {
      const next = new Map(prev);
      const get = (date: string) => stateFor(next, date);

      // Take the item out of where it was (merged stop, pending place, or a tray source).
      let stop: ItineraryStop | undefined;
      let pending: FinalDayState["pendingOptional"][number] | undefined;
      if (itemId.startsWith("m:")) {
        const [, date, ...rest] = itemId.split(":");
        const stopId = rest.join(":");
        const st = get(date);
        if (!st) return prev;
        stop = st.stops.find((s) => s.id === stopId);
        if (to !== from) next.set(date, { ...st, stops: st.stops.filter((s) => s.id !== stopId), source: "custom" });
      } else if (itemId.startsWith("p:")) {
        const [, date, placeId] = itemId.split(":");
        const st = get(date);
        if (!st) return prev;
        pending = st.pendingOptional.find((p) => p.placeId === placeId);
        next.set(date, { ...st, pendingOptional: st.pendingOptional.filter((p) => p.placeId !== placeId) });
      } else if (itemId.startsWith("src:")) {
        const src = sourceStops.get(itemId.slice(4));
        if (src) stop = { ...src, id: `${src.id}-${Math.random().toString(36).slice(2, 8)}` };
      } else if (itemId.startsWith("opt:")) {
        const opt = optionalPlaces.find((p) => p.placeId === itemId.slice(4));
        if (opt) pending = { placeId: opt.placeId, placeName: opt.placeName, category: opt.category };
      }
      if (to === "tray") return next;

      const target = get(to);
      if (!target) return prev;
      if (stop) {
        const middle = target.stops.filter((s) => !isStructural(s));
        if (from === to) {
          // Reorder: follow the board's order for this day's stops.
          const byItem = new Map(middle.map((s) => [`m:${to}:${s.id}`, s]));
          const reordered = order.map((id) => byItem.get(id)).filter((s): s is ItineraryStop => Boolean(s));
          next.set(to, { ...target, stops: withMiddle(target.stops, reordered), source: "custom" });
        } else {
          if (stop.placeId && middle.some((s) => s.placeId === stop!.placeId)) return prev;
          const at = Math.min(index, middle.length);
          next.set(to, { ...target, stops: withMiddle(target.stops, [...middle.slice(0, at), stop, ...middle.slice(at)]), source: "custom" });
        }
      } else if (pending) {
        if (target.pendingOptional.some((p) => p.placeId === pending!.placeId)) return next;
        next.set(to, { ...target, pendingOptional: [...target.pendingOptional, pending] });
      }
      return next;
    });
  };

  return (
    <PlanBoard
      tray={{
        title: "Places not in the result",
        hint: "From your plan, the AI plan, or didn't fit. Drag onto a day.",
        items: tray,
        acceptsDrop: !readOnly,
        emptyText: "Every place is in the merged plan.",
      }}
      columns={columns}
      onMove={onMove}
      readOnly={readOnly}
      header={
        <Text fontSize="12px" color="tx3">
          The merged result, day by day. Drag places in, reorder, move between days, or drag back to the tray. Nothing is saved until you merge.
        </Text>
      }
    />
  );
}
