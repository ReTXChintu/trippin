import { Text, useToast } from "@chakra-ui/react";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { fmtDur } from "@/components/ui/plan.utils";
import * as placesApi from "@/modules/places/api/places.api";
import {
  useMovePlaceToDay,
  useMoveItineraryStop,
  useRemoveStop,
  useReorderItineraryStops,
} from "@/modules/itinerary/hooks/useItinerary";
import type { Itinerary, ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";
import { formatDayDate } from "@/modules/itinerary/utils/plan.utils";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import { PlanBoard, type BoardColumn, type BoardItem, type BoardMove } from "./PlanBoard";

const isStructural = (s: ItineraryStop) => s.stopType === "transfer" || s.stopType === "return";
const schedulable = (d: ItineraryDay) => d.dayType !== "transfer" && d.dayType !== "free";

function stopItem(stop: ItineraryStop, city: string | undefined, canEdit: boolean): BoardItem {
  const isMeal = stop.stopType === "meal";
  return {
    id: `stop:${stop.id}`,
    kind: isMeal ? "meal" : "stop",
    title: stop.placeName,
    time: stop.arrivalTime,
    subtitle: [stop.category, stop.visitDurationMinutes ? fmtDur(stop.visitDurationMinutes) : null].filter(Boolean).join(" · ") || undefined,
    category: stop.category,
    city,
    locked: stop.locked,
    draggable: canEdit && !isMeal && !stop.status,
  };
}

/** The Plan tab's board: picked places on the left, days as columns; every drop is saved right away. */
export function PlanTabBoard({
  trip,
  itinerary,
  days,
  legs,
  activeLeg,
  canEdit,
}: {
  trip: Trip;
  itinerary: Itinerary;
  days: ItineraryDay[];
  legs: TripLeg[];
  activeLeg?: TripLeg;
  canEdit: boolean;
}) {
  const toast = useToast();
  const movePlace = useMovePlaceToDay(trip.id);
  const moveStop = useMoveItineraryStop(trip.id);
  const reorder = useReorderItineraryStops(trip.id);
  const remove = useRemoveStop(trip.id);

  const trayLegs = activeLeg ? [activeLeg] : legs;
  const placeQueries = useQueries({
    queries: trayLegs.map((leg) => ({
      queryKey: ["trip-places", trip.id, "selected", leg.id],
      queryFn: () => placesApi.getTripPlaces(trip.id, "selected", leg.id),
      enabled: !leg.id.startsWith("legacy"),
    })),
  });

  const legName = (legId?: string) => {
    const leg = legs.find((l) => l.id === legId);
    return leg ? leg.name || leg.baseCity : undefined;
  };

  const trayItems = useMemo(() => {
    const scheduled = new Set(itinerary.days.flatMap((d) => d.stops.map((s) => s.placeId)).filter(Boolean));
    const items: BoardItem[] = [];
    const seen = new Set<string>();
    for (const p of itinerary.optionalPlaces) {
      if (activeLeg && p.legId !== activeLeg.id) continue;
      if (scheduled.has(p.placeId) || seen.has(p.placeId)) continue;
      seen.add(p.placeId);
      items.push({
        id: `place:${p.placeId}`,
        kind: "place",
        title: p.placeName,
        subtitle: p.category,
        category: p.category,
        city: legName(p.legId),
        tag: "Didn't fit",
        draggable: canEdit,
      });
    }
    placeQueries.forEach((q, i) => {
      const leg = trayLegs[i];
      for (const place of q.data?.places ?? []) {
        const id = place.googlePlaceId;
        if (!id || scheduled.has(id) || seen.has(id)) continue;
        seen.add(id);
        items.push({
          id: `place:${id}`,
          kind: "place",
          title: place.name,
          subtitle: [place.category, place.averageVisitDurationMinutes ? fmtDur(place.averageVisitDurationMinutes) : null].filter(Boolean).join(" · "),
          category: place.category,
          city: leg.name || leg.baseCity,
          draggable: canEdit,
        });
      }
    });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itinerary, activeLeg, canEdit, ...placeQueries.map((q) => q.data)]);

  const columns: BoardColumn[] = days.map((day) => {
    const middle = day.stops.filter((s) => !isStructural(s));
    const transfer = day.stops.find((s) => s.stopType === "transfer");
    const visits = middle.filter((s) => s.stopType !== "meal");
    const first = middle[0];
    const last = middle[middle.length - 1];
    return {
      key: String(day.dayNumber),
      dayNumber: day.dayNumber,
      dateLabel: formatDayDate(day.date, "EEE d MMM"),
      city: day.legName ?? legName(day.legId),
      summary:
        middle.length > 0
          ? `${visits.length} ${visits.length === 1 ? "stop" : "stops"}${first && last ? ` · ${first.arrivalTime}–${last.departureTime}` : ""}`
          : undefined,
      marker: day.dayType === "transfer" ? (day.transferLabel ?? transfer?.placeName ?? "Travel day") : transfer?.placeName,
      droppable: schedulable(day) && canEdit,
      items: middle.map((s) => stopItem(s, day.legName ?? legName(day.legId), canEdit)),
    };
  });

  const onMove = async (move: BoardMove) => {
    const strip = (id: string) => id.replace(/^stop:|^place:/, "");
    try {
      if (move.from === "tray") {
        await movePlace.mutateAsync({ placeId: strip(move.itemId), toDayNumber: Number(move.to), targetIndex: move.index });
      } else if (move.to === "tray") {
        await remove.mutateAsync({ dayNumber: Number(move.from), stopId: strip(move.itemId) });
      } else if (move.from === move.to) {
        const day = itinerary.days.find((d) => d.dayNumber === Number(move.to));
        if (!day) return;
        const leading = day.stops.filter((s) => s.stopType === "transfer").map((s) => s.id);
        const trailing = day.stops.filter((s) => s.stopType === "return").map((s) => s.id);
        await reorder.mutateAsync({ dayNumber: day.dayNumber, stopIds: [...leading, ...move.order.map(strip), ...trailing] });
      } else {
        await moveStop.mutateAsync({
          stopId: strip(move.itemId),
          fromDayNumber: Number(move.from),
          toDayNumber: Number(move.to),
          targetIndex: move.index,
        });
      }
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  return (
    <PlanBoard
      tray={{
        title: activeLeg ? `Places in ${activeLeg.name || activeLeg.baseCity}` : "Places to schedule",
        hint: canEdit ? "Picked but not on a day yet. Drag one onto a day." : undefined,
        items: trayItems,
        acceptsDrop: canEdit,
        emptyText: "Every picked place is on a day.",
      }}
      columns={columns}
      onMove={onMove}
      readOnly={!canEdit}
      header={
        <Text fontSize="12px" color="fg.muted">
          {canEdit
            ? "Drag places onto days, reorder a day, move stops between days, or drag a stop back to the tray. Times are recalculated after each move — Undo reverts it."
            : "View only — the owner or an editor can rearrange the days."}
        </Text>
      }
    />
  );
}
