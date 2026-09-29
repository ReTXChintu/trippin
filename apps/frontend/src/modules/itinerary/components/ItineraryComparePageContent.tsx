import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import {
  Box,
  Button,
  Collapse,
  Flex,
  Grid,
  GridItem,
  Icon,
  Stack,
  Text,
  Tooltip,
  Wrap,
  WrapItem,
  useBreakpointValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { Fragment, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiCheck, FiChevronDown, FiChevronUp, FiLayers, FiRefreshCw } from "react-icons/fi";
import { LuSparkles } from "react-icons/lu";
import { getApiErrorMessage } from "@/lib/api";
import { canEditTrip, isTripOwner } from "@/lib/trip-access";
import { useAuthStore } from "@/store/authStore";
import { EmptyState, Overline, Pill, Segmented } from "@/components/ui";
import { AiWorkingPanel, ErrorState, KeyMissingNotice, LoadingSkeleton, ViewOnlyBanner } from "@/components/states";
import { useTripQuery } from "@/modules/trips/hooks/useTrips";
import {
  useApplyMergedDays,
  useGenerateAiCandidate,
  useItineraryComparisonQuery,
  useKeepAiItinerary,
  useKeepSystemItinerary,
} from "@/modules/itinerary/hooks/useItinerary";
import type { ItineraryDay, ItineraryDayWithDistance, ItineraryStop, OptionalItineraryPlace } from "@/modules/itinerary/types";
import { CompareDayCard, PlanChooser } from "./compare/CompareDayCard";
import { FineTuneDayRow, OptionalSourceCard, type FinalDayState } from "./compare/FineTune";
import { differenceLabels, roundKm } from "./compare/compare.utils";

const EMPTY_DAYS: ItineraryDayWithDistance[] = [];
const EMPTY_OPTIONAL: OptionalItineraryPlace[] = [];

function ColumnHeading({ title, total, better }: { title: string; total?: number; better?: boolean }) {
  return (
    <Flex justify="space-between" align="center" gap={2}>
      <Text as="h2" fontFamily="heading" fontWeight={600} fontSize="20px" letterSpacing="-0.01em">
        {title}
      </Text>
      {total !== undefined && (
        <Pill tone={better ? "success" : "neutral"} icon={better ? FiCheck : undefined}>
          Total {total} km
        </Pill>
      )}
    </Flex>
  );
}

export function ItineraryComparePageContent() {
  const { id: tripId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const legId = searchParams.get("legId") ?? undefined;
  const navigate = useNavigate();
  const toast = useToast();
  const currentUserId = useAuthStore((s) => s.user?.id ?? "");
  const isDesktop = useBreakpointValue({ base: false, md: true }, { ssr: false }) ?? true;
  const fineTune = useDisclosure();

  const { data: trip } = useTripQuery(tripId);
  const comparisonQuery = useItineraryComparisonQuery(tripId, legId);
  const { data: comparison, isLoading } = comparisonQuery;
  const generateAiCandidate = useGenerateAiCandidate(tripId);
  const keepSystem = useKeepSystemItinerary(tripId);
  const keepAi = useKeepAiItinerary(tripId);
  const applyMergedDays = useApplyMergedDays(tripId);

  const [finalByDate, setFinalByDate] = useState<Map<string, FinalDayState>>(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const currentDays = comparison?.currentDays ?? EMPTY_DAYS;
  const currentOptionalPlaces = comparison?.currentOptionalPlaces ?? EMPTY_OPTIONAL;
  const aiCandidate = comparison?.aiCandidate ?? null;
  const aiByDate = useMemo(() => new Map((aiCandidate?.days ?? []).map((d) => [d.date, d])), [aiCandidate]);

  const allOptionalPlaces = useMemo(() => {
    const map = new Map<string, OptionalItineraryPlace & { sources: string[] }>();
    for (const p of currentOptionalPlaces) {
      map.set(p.placeId, { ...p, sources: ["System"] });
    }
    for (const p of aiCandidate?.optionalPlaces ?? []) {
      const existing = map.get(p.placeId);
      if (existing) existing.sources.push("AI");
      else map.set(p.placeId, { ...p, sources: ["AI"] });
    }
    return Array.from(map.values());
  }, [currentOptionalPlaces, aiCandidate]);

  const usedOptionalIds = useMemo(() => {
    const ids = new Set<string>();
    for (const state of finalByDate.values()) {
      for (const p of state.pendingOptional) ids.add(p.placeId);
    }
    return ids;
  }, [finalByDate]);

  const visibleOptionalPlaces = allOptionalPlaces.filter((p) => !usedOptionalIds.has(p.placeId));

  /** A day's merged state; an untouched day starts as your plan (what "System" means in the chooser). */
  const stateFor = (map: Map<string, FinalDayState>, date: string): FinalDayState | undefined => {
    const existing = map.get(date);
    if (existing) return existing;
    const systemDay = currentDays.find((d) => d.date === date);
    return systemDay ? { stops: systemDay.stops, pendingOptional: [], dressCode: systemDay.dressCode, source: "system" } : undefined;
  };

  const handleChoose = (date: string, side: "system" | "ai") => {
    const sourceDay = side === "system" ? currentDays.find((d) => d.date === date) : aiByDate.get(date);
    if (!sourceDay) return;
    setFinalByDate((prev) => {
      const current = prev.get(date);
      return new Map(prev).set(date, {
        stops: sourceDay.stops,
        pendingOptional: current?.pendingOptional ?? [],
        dressCode: sourceDay.dressCode,
        source: side,
      });
    });
  };

  const handleRemoveStop = (date: string, stopId: string) => {
    setFinalByDate((prev) => {
      const current = stateFor(prev, date);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(date, { ...current, stops: current.stops.filter((s) => s.id !== stopId), source: "custom" });
      return next;
    });
  };

  const handleRemovePendingOptional = (date: string, placeId: string) => {
    setFinalByDate((prev) => {
      const current = stateFor(prev, date);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(date, { ...current, pendingOptional: current.pendingOptional.filter((p) => p.placeId !== placeId) });
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (!overId.startsWith("final:")) return;

    const targetDate = overId.slice("final:".length).split(":")[0];
    const targetStopPrefix = `final:${targetDate}:stop:`;

    const insertIndexFor = (stops: ItineraryStop[]) => {
      if (!overId.startsWith(targetStopPrefix)) return stops.length;
      const overStopId = overId.slice(targetStopPrefix.length);
      const idx = stops.findIndex((s) => s.id === overStopId);
      return idx === -1 ? stops.length : idx;
    };

    // A stop already sitting in some day's merged column — either reordering within the same day,
    // or moving it to a different day entirely (e.g. day 2 -> day 5).
    if (activeId.startsWith("final:")) {
      const afterFinal = activeId.slice("final:".length); // "{sourceDate}:stop:{stopId}"
      const separatorIdx = afterFinal.indexOf(":stop:");
      if (separatorIdx === -1) return;
      const sourceDate = afterFinal.slice(0, separatorIdx);
      const stopId = afterFinal.slice(separatorIdx + ":stop:".length);

      if (sourceDate === targetDate) {
        setFinalByDate((prev) => {
          const current = stateFor(prev, targetDate);
          if (!current) return prev;
          const oldIndex = current.stops.findIndex((s) => s.id === stopId);
          if (oldIndex === -1) return prev;
          const newIndex = insertIndexFor(current.stops);
          if (oldIndex === newIndex) return prev;
          const next = new Map(prev);
          next.set(targetDate, { ...current, stops: arrayMove(current.stops, oldIndex, newIndex), source: "custom" });
          return next;
        });
      } else {
        setFinalByDate((prev) => {
          const sourceState = stateFor(prev, sourceDate);
          if (!sourceState) return prev;
          const stopIdx = sourceState.stops.findIndex((s) => s.id === stopId);
          if (stopIdx === -1) return prev;
          const movedStop = sourceState.stops[stopIdx];

          const next = new Map(prev);
          next.set(sourceDate, { ...sourceState, stops: sourceState.stops.filter((s) => s.id !== stopId), source: "custom" });

          const targetState = stateFor(next, targetDate);
          if (!targetState) return prev;
          if (targetState.stops.some((s) => s.placeId && s.placeId === movedStop.placeId)) return prev;
          const insertAt = insertIndexFor(targetState.stops);
          const nextStops = [...targetState.stops.slice(0, insertAt), movedStop, ...targetState.stops.slice(insertAt)];
          next.set(targetDate, { ...targetState, stops: nextStops, source: "custom" });
          return next;
        });
      }
      return;
    }

    // Dragging a stop from Your plan / AI plan (from any date) into a day's merged column
    if (activeId.startsWith("sys:") || activeId.startsWith("ai:")) {
      const isSystem = activeId.startsWith("sys:");
      const rest = activeId.slice(isSystem ? "sys:".length : "ai:".length); // "{sourceDate}:{stopId}"
      const sepIdx = rest.indexOf(":");
      if (sepIdx === -1) return;
      const sourceDate = rest.slice(0, sepIdx);
      const stopId = rest.slice(sepIdx + 1);

      const sourceDay = isSystem ? currentDays.find((d) => d.date === sourceDate) : aiByDate.get(sourceDate);
      const sourceStop = sourceDay?.stops.find((s) => s.id === stopId);
      if (!sourceStop) return;

      setFinalByDate((prev) => {
        const current = stateFor(prev, targetDate);
        if (!current) return prev;
        if (sourceStop.placeId && current.stops.some((s) => s.placeId === sourceStop.placeId)) return prev;
        const clone: ItineraryStop = {
          ...sourceStop,
          id: `${sourceStop.id}-${Math.random().toString(36).slice(2, 8)}`,
        };
        const insertAt = insertIndexFor(current.stops);
        const nextStops = [...current.stops.slice(0, insertAt), clone, ...current.stops.slice(insertAt)];
        const next = new Map(prev);
        next.set(targetDate, { ...current, stops: nextStops, source: "custom" });
        return next;
      });
      return;
    }

    // Dragging an optional-place card into a day's merged column
    if (activeId.startsWith("optional:")) {
      const placeId = activeId.slice("optional:".length);
      const optionalPlace = allOptionalPlaces.find((p) => p.placeId === placeId);
      if (!optionalPlace) return;

      setFinalByDate((prev) => {
        const current = stateFor(prev, targetDate);
        if (!current) return prev;
        if (current.pendingOptional.some((p) => p.placeId === placeId) || current.stops.some((s) => s.placeId === placeId)) {
          return prev;
        }
        const next = new Map(prev);
        next.set(targetDate, {
          ...current,
          pendingOptional: [
            ...current.pendingOptional,
            { placeId: optionalPlace.placeId, placeName: optionalPlace.placeName, category: optionalPlace.category },
          ],
        });
        return next;
      });
    }
  };

  const handleRegenerate = async () => {
    try {
      await generateAiCandidate.mutateAsync(legId);
      setFinalByDate(new Map());
      toast({ title: aiCandidate ? "AI plan regenerated" : "AI plan ready — pick a side for each day", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const handleKeepSystem = async () => {
    try {
      await keepSystem.mutateAsync(legId);
      toast({ title: "Kept your plan", status: "success" });
      navigate(-1);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const handleKeepAi = async () => {
    try {
      await keepAi.mutateAsync(legId);
      toast({ title: "Switched to the AI plan", status: "success" });
      navigate(-1);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  // Days still on "System" with nothing added are identical to the current plan, so they're left out.
  const changedDays = currentDays.filter((d) => {
    const final = finalByDate.get(d.date);
    return final && (final.source !== "system" || final.pendingOptional.length > 0);
  });

  const handleSaveMerge = async () => {
    const mergedDays: ItineraryDay[] = [];
    const newlyScheduledFromOptional: { date: string; placeId: string }[] = [];

    for (const systemDay of changedDays) {
      const final = finalByDate.get(systemDay.date);
      if (!final) continue;
      mergedDays.push({
        dayNumber: systemDay.dayNumber,
        date: systemDay.date,
        legId: systemDay.legId,
        legName: systemDay.legName,
        dayType: systemDay.dayType,
        transferLabel: systemDay.transferLabel,
        dressCode: final.dressCode,
        stops: final.stops.map((s, i) => ({ ...s, sequence: i + 1 })),
      });
      for (const opt of final.pendingOptional) {
        newlyScheduledFromOptional.push({ date: systemDay.date, placeId: opt.placeId });
      }
    }

    if (mergedDays.length === 0) {
      toast({ title: "Choose AI for at least one day (or fine-tune one) before merging", status: "info" });
      return;
    }

    try {
      await applyMergedDays.mutateAsync({ legId, days: mergedDays, newlyScheduledFromOptional });
      toast({ title: "Plan updated — Undo on the Plan tab reverts it", status: "success" });
      navigate(-1);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const setCity = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete("legId");
    else next.set("legId", value);
    setSearchParams(next, { replace: true });
    setFinalByDate(new Map());
  };

  if (isLoading) return <LoadingSkeleton variant="page" count={3} label="Loading the comparison" />;
  if (comparisonQuery.isError) {
    return (
      <ErrorState
        title="Couldn't load the comparison"
        text="Your plan is safe. Check your connection and try again."
        onRetry={() => void comparisonQuery.refetch()}
        retrying={comparisonQuery.isFetching}
        maxW="560px"
      />
    );
  }
  if (!comparison) return <EmptyState title="Plan not found" text="Generate the day-by-day plan first, then compare it with AI." />;

  const legs = [...(trip?.legs ?? [])].sort((a, b) => a.order - b.order);
  const leg = legId ? legs.find((l) => l.id === legId) : undefined;
  const cityName = leg ? leg.name || leg.baseCity : legs.length === 1 ? legs[0].name || legs[0].baseCity : "the whole trip";
  const canEdit = trip ? canEditTrip(trip, currentUserId) : false;
  const isOwner = trip ? isTripOwner(trip, currentUserId) : false;
  const hasAiKey = trip?.ownerApiKeys ? trip.ownerApiKeys.hasAiKey : true;
  const generating = generateAiCandidate.isPending;
  const busy = keepSystem.isPending || keepAi.isPending || applyMergedDays.isPending;

  const systemTotal = roundKm(currentDays.reduce((sum, d) => sum + (d.distanceKm ?? 0), 0));
  const aiTotal = aiCandidate ? roundKm(aiCandidate.days.reduce((sum, d) => sum + (d.distanceKm ?? 0), 0)) : undefined;

  const choiceFor = (date: string): "system" | "ai" | null => {
    const final = finalByDate.get(date);
    if (!final) return "system";
    return final.source === "custom" ? null : final.source;
  };

  const mergeParts = currentDays.map((d) => {
    const final = finalByDate.get(d.date);
    const src = final?.source ?? "system";
    return { n: d.dayNumber, label: src === "ai" ? "AI" : src === "custom" ? "edited" : "yours" };
  });
  const mergeSummary =
    mergeParts.length <= 6
      ? mergeParts.map((p) => `Day ${p.n} ${p.label}`).join(" · ")
      : (["AI", "edited", "yours"] as const)
          .map((l) => ({ l, c: mergeParts.filter((p) => p.label === l).length }))
          .filter((x) => x.c > 0)
          .map((x) => `${x.c} day${x.c === 1 ? "" : "s"} ${x.l}`)
          .join(" · ");

  const showCity = !legId && legs.length > 1;

  // The right-hand column when there's no AI plan to compare yet.
  const aiPlaceholder = generating ? (
    <AiWorkingPanel title={`Making an AI plan for ${cityName}…`} note="Your plan doesn't change until you choose days to merge." />
  ) : !hasAiKey ? (
    <KeyMissingNotice
      variant="card"
      kind="ai"
      canFix={isOwner}
      feature="Compare with an AI plan"
      text="Needs an AI key. Everything else works — drag, lock and edit your plan by hand."
    />
  ) : (
    <Box bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl">
      <EmptyState
        compact
        icon={LuSparkles}
        title="No AI plan yet"
        text={`Ask AI for an alternative plan for ${cityName}, then keep yours, take AI's, or mix day by day.`}
        action={
          canEdit ? (
            <Button variant="ai" leftIcon={<LuSparkles />} onClick={handleRegenerate}>
              Make an AI plan
            </Button>
          ) : undefined
        }
      />
    </Box>
  );

  return (
    <Box maxW="1320px" mx="auto">
      <Stack spacing="18px">
        {/* Breadcrumb, title and city switch */}
        <Flex justify="space-between" align={{ base: "flex-start", md: "flex-end" }} gap={4} direction={{ base: "column", md: "row" }}>
          <Box minW={0}>
            <Text fontSize="12px" color="fg.muted" noOfLines={1}>
              <Text as={RouterLink} to={`/trips/${tripId}?tab=plan${legId ? `&city=${legId}` : ""}`} _hover={{ textDecoration: "underline" }}>
                {trip?.title ?? "Trip"}
              </Text>{" "}
              / Compare
            </Text>
            <Text as="h1" fontFamily="heading" fontWeight={600} fontSize={{ base: "28px", md: "32px" }} lineHeight={1.2} letterSpacing="-0.01em">
              Compare with AI plan
            </Text>
          </Box>
          <Flex gap={2} align="center" wrap="wrap">
            {aiCandidate && canEdit && (
              <Tooltip label="Add an OpenAI or Gemini key in Profile first" isDisabled={hasAiKey} hasArrow>
                <Button variant="ai" leftIcon={<FiRefreshCw />} onClick={handleRegenerate} isLoading={generating} loadingText="Regenerating" isDisabled={!hasAiKey || busy}>
                  Regenerate
                </Button>
              </Tooltip>
            )}
            {legs.length > 1 && (
              <Segmented
                aria-label="City"
                value={legId ?? "all"}
                onChange={setCity}
                options={[{ value: "all", label: "All cities" }, ...legs.map((l) => ({ value: l.id, label: l.name || l.baseCity }))]}
                maxW="100%"
                overflowX="auto"
              />
            )}
          </Flex>
        </Flex>

        {!canEdit && trip && <ViewOnlyBanner>You can view this comparison. Only editors can keep or merge a plan.</ViewOnlyBanner>}

        {!aiCandidate || generating ? (
          <Grid templateColumns={{ base: "minmax(0,1fr)", md: "minmax(0,1fr) minmax(0,1fr)" }} gap={{ base: 6, md: 4 }} alignItems="start">
            <Stack spacing={3}>
              <ColumnHeading title="Your plan" total={systemTotal} />
              {currentDays.map((d) => (
                <CompareDayCard key={d.date} day={d} side="system" chosen={false} showCity={showCity} />
              ))}
              {currentDays.length === 0 && <Text color="fg.muted">No days planned yet.</Text>}
            </Stack>
            <Stack spacing={3}>
              <ColumnHeading title="AI plan" />
              {aiPlaceholder}
            </Stack>
          </Grid>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {isDesktop ? (
              <Grid templateColumns="minmax(0,1fr) 110px minmax(0,1fr)" columnGap={4} rowGap={3} alignItems="stretch">
                <GridItem>
                  <ColumnHeading title="Your plan" total={systemTotal} />
                </GridItem>
                <GridItem />
                <GridItem>
                  <ColumnHeading title="AI plan" total={aiTotal} better={aiTotal !== undefined && aiTotal < systemTotal} />
                </GridItem>
                {currentDays.map((d) => {
                  const aiDay = aiByDate.get(d.date);
                  const choice = choiceFor(d.date);
                  return (
                    <Fragment key={d.date}>
                      <GridItem>
                        <CompareDayCard day={d} side="system" chosen={choice === "system"} showCity={showCity} />
                      </GridItem>
                      <GridItem display="flex" alignItems="center" justifyContent="center" flexDirection="column" gap={1}>
                        <PlanChooser dayNumber={d.dayNumber} value={choice} aiAvailable={Boolean(aiDay)} disabled={!canEdit || busy} onChange={(v) => handleChoose(d.date, v)} />
                        {choice === null && (
                          <Text fontSize="12px" color="accent.text" fontWeight={600}>
                            Edited
                          </Text>
                        )}
                      </GridItem>
                      <GridItem>
                        <CompareDayCard day={aiDay} side="ai" chosen={choice === "ai"} showCity={showCity} differences={aiDay ? differenceLabels(d, aiDay) : undefined} />
                      </GridItem>
                    </Fragment>
                  );
                })}
              </Grid>
            ) : (
              <Stack spacing={5}>
                <Flex gap={2} wrap="wrap">
                  <Pill>Yours · {systemTotal} km</Pill>
                  {aiTotal !== undefined && (
                    <Pill tone={aiTotal < systemTotal ? "success" : "neutral"} icon={aiTotal < systemTotal ? FiCheck : undefined}>
                      AI · {aiTotal} km
                    </Pill>
                  )}
                </Flex>
                {currentDays.map((d) => {
                  const aiDay = aiByDate.get(d.date);
                  const choice = choiceFor(d.date);
                  return (
                    <Stack key={d.date} spacing={2}>
                      <Flex justify="space-between" align="center" gap={2}>
                        <Overline>
                          Day {d.dayNumber}
                          {choice === null ? " · edited" : ""}
                        </Overline>
                        <PlanChooser direction="row" dayNumber={d.dayNumber} value={choice} aiAvailable={Boolean(aiDay)} disabled={!canEdit || busy} onChange={(v) => handleChoose(d.date, v)} />
                      </Flex>
                      <Text fontSize="12px" fontWeight={600} color="fg.muted">
                        Your plan
                      </Text>
                      <CompareDayCard day={d} side="system" chosen={choice === "system"} showCity={showCity} />
                      <Text fontSize="12px" fontWeight={600} color="fg.muted">
                        AI plan
                      </Text>
                      <CompareDayCard day={aiDay} side="ai" chosen={choice === "ai"} showCity={showCity} differences={aiDay ? differenceLabels(d, aiDay) : undefined} />
                    </Stack>
                  );
                })}
              </Stack>
            )}

            {canEdit && (
              <Box mt={6}>
                <Button variant="ghost" size="sm" onClick={fineTune.onToggle} aria-expanded={fineTune.isOpen} rightIcon={<Icon as={fineTune.isOpen ? FiChevronUp : FiChevronDown} />}>
                  Fine-tune stop by stop
                </Button>
                <Collapse in={fineTune.isOpen} animateOpacity unmountOnExit>
                  <Stack spacing={4} mt={3}>
                    <Text fontSize="13px" color="fg.muted">
                      Drag stops from either plan into a day's merged column, reorder them, or move them between days. Days you
                      don't touch keep the side chosen above.
                    </Text>
                    {visibleOptionalPlaces.length > 0 && (
                      <Box p={4} bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl">
                        <Text fontWeight={600} mb={1}>
                          Optional places
                        </Text>
                        <Text fontSize="12px" color="fg.muted" mb={3}>
                          Didn't fit automatically. Drag one onto any day's merged column to schedule it.
                        </Text>
                        <Wrap spacing={3}>
                          {visibleOptionalPlaces.map((place) => (
                            <WrapItem key={place.placeId}>
                              <OptionalSourceCard id={`optional:${place.placeId}`} place={place} />
                            </WrapItem>
                          ))}
                        </Wrap>
                      </Box>
                    )}
                    {currentDays.map((systemDay) => (
                      <FineTuneDayRow
                        key={systemDay.date}
                        systemDay={systemDay}
                        aiDay={aiByDate.get(systemDay.date)}
                        final={stateFor(finalByDate, systemDay.date)}
                        onRemoveStop={(stopId) => handleRemoveStop(systemDay.date, stopId)}
                        onRemovePendingOptional={(placeId) => handleRemovePendingOptional(systemDay.date, placeId)}
                      />
                    ))}
                  </Stack>
                </Collapse>
              </Box>
            )}
          </DndContext>
        )}

        {/* Merge bar */}
        {aiCandidate && canEdit && (
          <Flex
            position="sticky"
            bottom={{ base: 3, md: 4 }}
            zIndex={5}
            mt={4}
            direction={{ base: "column", lg: "row" }}
            align={{ base: "stretch", lg: "center" }}
            justify="space-between"
            gap={3}
            px="18px"
            py="14px"
            bg="bg.surface"
            borderWidth="1px"
            borderColor="border.line"
            borderRadius="xl"
            boxShadow="raised"
          >
            <Text fontSize="12px" color="fg.muted" aria-live="polite">
              Merge result:{" "}
              <Text as="b" color="fg.default">
                {mergeSummary || "nothing to merge"}
              </Text>{" "}
              — you can undo after applying.
            </Text>
            <Flex gap={2} wrap="wrap" justify={{ base: "stretch", lg: "flex-end" }} flexShrink={0}>
              <Button variant="outline" onClick={handleKeepSystem} isLoading={keepSystem.isPending} isDisabled={busy || generating} flex={{ base: 1, lg: "none" }}>
                Keep my plan
              </Button>
              <Button variant="outline" onClick={handleKeepAi} isLoading={keepAi.isPending} isDisabled={busy || generating} flex={{ base: 1, lg: "none" }}>
                Keep AI plan
              </Button>
              <Button
                leftIcon={<FiLayers />}
                onClick={handleSaveMerge}
                isLoading={applyMergedDays.isPending}
                isDisabled={busy || generating || changedDays.length === 0}
                title={changedDays.length === 0 ? "Choose AI for at least one day first" : undefined}
                flex={{ base: "1 1 100%", sm: 1, lg: "none" }}
              >
                Merge chosen days
              </Button>
            </Flex>
          </Flex>
        )}
      </Stack>
    </Box>
  );
}
