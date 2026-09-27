import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  HStack,
  IconButton,
  SimpleGrid,
  Stack,
  Tag,
  Text,
  Wrap,
  WrapItem,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiMove, FiRefreshCw, FiX } from "react-icons/fi";
import { format, parseISO } from "date-fns";
import { getApiErrorMessage } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTripQuery } from "@/modules/trips/hooks/useTrips";
import {
  useApplyMergedDays,
  useGenerateAiCandidate,
  useItineraryComparisonQuery,
  useKeepAiItinerary,
  useKeepSystemItinerary,
} from "@/modules/itinerary/hooks/useItinerary";
import { HypeBadge } from "@/modules/itinerary/components/DestinationGuidePanel";
import type {
  ItineraryDay,
  ItineraryDayWithDistance,
  ItineraryStop,
  OptionalItineraryPlace,
} from "@/modules/itinerary/types";

interface PendingOptional {
  placeId: string;
  placeName: string;
  category?: string;
}

interface FinalDayState {
  stops: ItineraryStop[];
  pendingOptional: PendingOptional[];
  dressCode?: string;
}

function formatDayDate(date: string) {
  try {
    return format(parseISO(date), "EEE, MMM d");
  } catch {
    return date;
  }
}

function StopCard({ stop }: { stop: ItineraryStop }) {
  const borderColor = useColorModeValue("gray.200", "gray.700");

  return (
    <Box p={2.5} borderWidth="1px" borderColor={borderColor} borderRadius="md" bg={useColorModeValue("white", "gray.800")}>
      <Text fontWeight="medium" fontSize="xs" noOfLines={2}>
        {stop.placeName}
      </Text>
      <HStack spacing={2} mt={1} fontSize="2xs" color="gray.500" flexWrap="wrap">
        <Text>
          {stop.arrivalTime}–{stop.departureTime}
        </Text>
        {stop.category && <Tag size="sm">{stop.category}</Tag>}
        <HypeBadge level={stop.visitIntel?.hypeLevel} />
      </HStack>
      {stop.aiNotes && (
        <Text fontSize="2xs" color="gray.500" mt={1} noOfLines={2}>
          {stop.aiNotes}
        </Text>
      )}
    </Box>
  );
}

function SourceStopCard({ id, stop }: { id: string; stop: ItineraryStop }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      opacity={isDragging ? 0.4 : 1}
      cursor="grab"
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      position="relative"
      zIndex={isDragging ? 10 : undefined}
    >
      <StopCard stop={stop} />
    </Box>
  );
}

function FinalStopCard({ id, stop, onRemove }: { id: string; stop: ItineraryStop; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const borderColor = useColorModeValue("brand.200", "brand.600");
  const bg = useColorModeValue("brand.50", "gray.700");

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      opacity={isDragging ? 0.5 : 1}
      p={2.5}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      bg={bg}
    >
      <HStack justify="space-between" align="start">
        <Box flex={1} minW={0} {...listeners} {...attributes} cursor="grab">
          <HStack spacing={1}>
            <FiMove size={10} />
            <Text fontWeight="medium" fontSize="xs" noOfLines={1}>
              {stop.placeName}
            </Text>
          </HStack>
          <Text fontSize="2xs" color="gray.500" mt={0.5}>
            {stop.arrivalTime}–{stop.departureTime}
          </Text>
        </Box>
        <IconButton aria-label="Remove" icon={<FiX />} size="xs" variant="ghost" onClick={onRemove} />
      </HStack>
    </Box>
  );
}

function PendingOptionalCard({ place, onRemove }: { place: PendingOptional; onRemove: () => void }) {
  const borderColor = useColorModeValue("purple.200", "purple.600");
  const bg = useColorModeValue("purple.50", "gray.700");

  return (
    <Box p={2.5} borderWidth="1px" borderStyle="dashed" borderColor={borderColor} borderRadius="md" bg={bg}>
      <HStack justify="space-between" align="start">
        <Box flex={1} minW={0}>
          <Text fontWeight="medium" fontSize="xs" noOfLines={1}>
            {place.placeName}
          </Text>
          <Text fontSize="2xs" color="gray.500" mt={0.5}>
            Time TBD — computed on save
          </Text>
        </Box>
        <IconButton aria-label="Remove" icon={<FiX />} size="xs" variant="ghost" onClick={onRemove} />
      </HStack>
    </Box>
  );
}

function OptionalSourceCard({ id, place }: { id: string; place: OptionalItineraryPlace & { sources: string[] } }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const borderColor = useColorModeValue("gray.200", "gray.700");

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      opacity={isDragging ? 0.4 : 1}
      cursor="grab"
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      position="relative"
      zIndex={isDragging ? 10 : undefined}
      p={2.5}
      minW="180px"
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      bg={useColorModeValue("white", "gray.800")}
    >
      <Text fontWeight="medium" fontSize="xs" noOfLines={1}>
        {place.placeName}
      </Text>
      <HStack spacing={1} mt={1}>
        {place.sources.map((s) => (
          <Badge key={s} colorScheme={s === "AI" ? "purple" : "gray"} fontSize="2xs">
            {s}
          </Badge>
        ))}
      </HStack>
      <Text fontSize="2xs" color="gray.500" mt={1} noOfLines={2}>
        {place.reason}
      </Text>
    </Box>
  );
}

function FinalDropZone({ date, children }: { date: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `final:${date}` });
  const borderColor = useColorModeValue("gray.300", "gray.600");
  const overBg = useColorModeValue("brand.50", "gray.700");

  return (
    <Stack
      ref={setNodeRef}
      spacing={2}
      p={2}
      minH="80px"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor={isOver ? "brand.400" : borderColor}
      borderRadius="md"
      bg={isOver ? overBg : undefined}
    >
      {children}
    </Stack>
  );
}

interface DayCompareRowProps {
  systemDay?: ItineraryDayWithDistance;
  aiDay?: ItineraryDayWithDistance;
  final: FinalDayState | undefined;
  onUseSystem: () => void;
  onUseAi: () => void;
  onRemoveStop: (stopId: string) => void;
  onRemovePendingOptional: (placeId: string) => void;
}

function DayCompareRow({
  systemDay,
  aiDay,
  final,
  onUseSystem,
  onUseAi,
  onRemoveStop,
  onRemovePendingOptional,
}: DayCompareRowProps) {
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const date = systemDay?.date ?? aiDay?.date ?? "";
  const dayNumber = systemDay?.dayNumber ?? aiDay?.dayNumber;
  const finalStops = final?.stops ?? [];
  const finalPending = final?.pendingOptional ?? [];

  return (
    <Box p={4} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
      <HStack justify="space-between" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Heading size="sm">
            Day {dayNumber} · {formatDayDate(date)}
          </Heading>
          {aiDay?.dressCode && (
            <Text fontSize="xs" color="purple.500" mt={1}>
              👗 AI suggests: {aiDay.dressCode}
            </Text>
          )}
        </Box>
        <HStack spacing={2}>
          <Button size="xs" variant="outline" onClick={onUseSystem}>
            Use System day
          </Button>
          <Button size="xs" variant="outline" colorScheme="purple" onClick={onUseAi}>
            Use AI day
          </Button>
        </HStack>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
        <Box>
          <Text fontSize="2xs" fontWeight="bold" color="gray.500" mb={2} textTransform="uppercase">
            System ({systemDay?.distanceKm ?? 0} km)
          </Text>
          <Stack spacing={2}>
            {(systemDay?.stops ?? []).map((stop) => (
              <SourceStopCard key={stop.id} id={`sys:${date}:${stop.id}`} stop={stop} />
            ))}
          </Stack>
        </Box>

        <Box>
          <Text fontSize="2xs" fontWeight="bold" color="purple.500" mb={2} textTransform="uppercase">
            AI ({aiDay?.distanceKm ?? 0} km)
          </Text>
          <Stack spacing={2}>
            {(aiDay?.stops ?? []).map((stop) => (
              <SourceStopCard key={stop.id} id={`ai:${date}:${stop.id}`} stop={stop} />
            ))}
          </Stack>
        </Box>

        <Box>
          <Text fontSize="2xs" fontWeight="bold" color="brand.500" mb={2} textTransform="uppercase">
            Final {final ? `(${finalStops.length + finalPending.length})` : "— untouched, keeps System"}
          </Text>
          <SortableContext
            items={finalStops.map((s) => `final:${date}:stop:${s.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <FinalDropZone date={date}>
              {finalStops.length === 0 && finalPending.length === 0 ? (
                <Text fontSize="2xs" color="gray.400" p={2}>
                  Drag stops from System, AI, another day's Final, or Optional Places here — or use a quick-copy
                  button above.
                </Text>
              ) : (
                <>
                  {finalStops.map((stop) => (
                    <FinalStopCard
                      key={stop.id}
                      id={`final:${date}:stop:${stop.id}`}
                      stop={stop}
                      onRemove={() => onRemoveStop(stop.id)}
                    />
                  ))}
                  {finalPending.map((place) => (
                    <PendingOptionalCard
                      key={place.placeId}
                      place={place}
                      onRemove={() => onRemovePendingOptional(place.placeId)}
                    />
                  ))}
                </>
              )}
            </FinalDropZone>
          </SortableContext>
        </Box>
      </SimpleGrid>
    </Box>
  );
}

export function ItineraryComparePageContent() {
  const { id: tripId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const legId = searchParams.get("legId") ?? undefined;
  const navigate = useNavigate();
  const toast = useToast();

  const { data: trip } = useTripQuery(tripId);
  const { data: comparison, isLoading } = useItineraryComparisonQuery(tripId, legId);
  const generateAiCandidate = useGenerateAiCandidate(tripId);
  const keepSystem = useKeepSystemItinerary(tripId);
  const keepAi = useKeepAiItinerary(tripId);
  const applyMergedDays = useApplyMergedDays(tripId);

  const [finalByDate, setFinalByDate] = useState<Map<string, FinalDayState>>(new Map());
  const panelBorderColor = useColorModeValue("gray.200", "gray.700");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const currentDays = comparison?.currentDays ?? [];
  const currentOptionalPlaces = comparison?.currentOptionalPlaces ?? [];
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

  const handleUseSystem = (date: string, systemDay: ItineraryDayWithDistance) => {
    setFinalByDate((prev) => {
      const current = prev.get(date);
      return new Map(prev).set(date, {
        stops: systemDay.stops,
        pendingOptional: current?.pendingOptional ?? [],
        dressCode: systemDay.dressCode,
      });
    });
  };

  const handleUseAi = (date: string, aiDay: ItineraryDayWithDistance) => {
    setFinalByDate((prev) => {
      const current = prev.get(date);
      return new Map(prev).set(date, {
        stops: aiDay.stops,
        pendingOptional: current?.pendingOptional ?? [],
        dressCode: aiDay.dressCode,
      });
    });
  };

  const handleRemoveStop = (date: string, stopId: string) => {
    setFinalByDate((prev) => {
      const current = prev.get(date);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(date, { ...current, stops: current.stops.filter((s) => s.id !== stopId) });
      return next;
    });
  };

  const handleRemovePendingOptional = (date: string, placeId: string) => {
    setFinalByDate((prev) => {
      const current = prev.get(date);
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

    // A stop already sitting in some day's Final — either reordering within the same day, or
    // moving it to a different day entirely (e.g. day 2 -> day 5).
    if (activeId.startsWith("final:")) {
      const afterFinal = activeId.slice("final:".length); // "{sourceDate}:stop:{stopId}"
      const separatorIdx = afterFinal.indexOf(":stop:");
      if (separatorIdx === -1) return;
      const sourceDate = afterFinal.slice(0, separatorIdx);
      const stopId = afterFinal.slice(separatorIdx + ":stop:".length);

      if (sourceDate === targetDate) {
        setFinalByDate((prev) => {
          const current = prev.get(targetDate);
          if (!current) return prev;
          const oldIndex = current.stops.findIndex((s) => s.id === stopId);
          if (oldIndex === -1) return prev;
          const newIndex = insertIndexFor(current.stops);
          const next = new Map(prev);
          next.set(targetDate, { ...current, stops: arrayMove(current.stops, oldIndex, newIndex) });
          return next;
        });
      } else {
        setFinalByDate((prev) => {
          const sourceState = prev.get(sourceDate);
          if (!sourceState) return prev;
          const stopIdx = sourceState.stops.findIndex((s) => s.id === stopId);
          if (stopIdx === -1) return prev;
          const movedStop = sourceState.stops[stopIdx];

          const next = new Map(prev);
          next.set(sourceDate, { ...sourceState, stops: sourceState.stops.filter((s) => s.id !== stopId) });

          const targetState = next.get(targetDate) ?? { stops: [], pendingOptional: [], dressCode: undefined };
          if (targetState.stops.some((s) => s.placeId && s.placeId === movedStop.placeId)) return prev;
          const insertAt = insertIndexFor(targetState.stops);
          const nextStops = [...targetState.stops.slice(0, insertAt), movedStop, ...targetState.stops.slice(insertAt)];
          next.set(targetDate, { ...targetState, stops: nextStops });
          return next;
        });
      }
      return;
    }

    // Dragging a System/AI stop (from any date) into a day's Final
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
        const current = prev.get(targetDate) ?? { stops: [], pendingOptional: [], dressCode: sourceDay?.dressCode };
        if (sourceStop.placeId && current.stops.some((s) => s.placeId === sourceStop.placeId)) return prev;
        const clone: ItineraryStop = {
          ...sourceStop,
          id: `${sourceStop.id}-${Math.random().toString(36).slice(2, 8)}`,
        };
        const insertAt = insertIndexFor(current.stops);
        const nextStops = [...current.stops.slice(0, insertAt), clone, ...current.stops.slice(insertAt)];
        const next = new Map(prev);
        next.set(targetDate, { ...current, stops: nextStops });
        return next;
      });
      return;
    }

    // Dragging an Optional-place card into a day's Final
    if (activeId.startsWith("optional:")) {
      const placeId = activeId.slice("optional:".length);
      const optionalPlace = allOptionalPlaces.find((p) => p.placeId === placeId);
      if (!optionalPlace) return;

      setFinalByDate((prev) => {
        const current = prev.get(targetDate) ?? { stops: [], pendingOptional: [], dressCode: undefined };
        if (
          current.pendingOptional.some((p) => p.placeId === placeId) ||
          current.stops.some((s) => s.placeId === placeId)
        ) {
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
      toast({ title: "AI itinerary regenerated", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const handleKeepSystem = async () => {
    try {
      await keepSystem.mutateAsync(legId);
      toast({ title: "Kept the system itinerary", status: "success" });
      navigate(-1);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const handleKeepAi = async () => {
    try {
      await keepAi.mutateAsync(legId);
      toast({ title: "Switched to the AI itinerary", status: "success" });
      navigate(-1);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const handleSaveMerge = async () => {
    const mergedDays: ItineraryDay[] = [];
    const newlyScheduledFromOptional: { date: string; placeId: string }[] = [];

    for (const systemDay of currentDays) {
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
      toast({ title: "Pick or drag at least one day before saving", status: "info" });
      return;
    }

    try {
      await applyMergedDays.mutateAsync({ legId, days: mergedDays, newlyScheduledFromOptional });
      toast({ title: "Itinerary updated", status: "success" });
      navigate(-1);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  if (isLoading) return <LoadingState />;
  if (!comparison) return <EmptyState title="Itinerary not found" />;

  const leg = legId ? trip?.legs.find((l) => l.id === legId) : undefined;

  return (
    <Box>
      <Button leftIcon={<FiArrowLeft />} variant="ghost" size="sm" mb={2} onClick={() => navigate(-1)}>
        Back to trip
      </Button>
      <Flex justify="space-between" align="start" mb={4} flexWrap="wrap" gap={3}>
        <Box>
          <Heading size="lg" mb={1}>
            Compare with AI itinerary
          </Heading>
          <Text color="gray.500" fontSize="sm">
            {trip?.title}
            {leg ? ` · ${leg.name || leg.baseCity}` : ""} — drag stops from System or AI into Final to build your
            merged day. Untouched days keep the current System itinerary.
          </Text>
        </Box>
        <HStack spacing={2} flexWrap="wrap">
          <Button
            size="sm"
            leftIcon={<FiRefreshCw />}
            onClick={handleRegenerate}
            isLoading={generateAiCandidate.isPending}
          >
            {aiCandidate ? "Regenerate" : "Generate AI Itinerary"}
          </Button>
          {aiCandidate && (
            <>
              <Button size="sm" variant="outline" onClick={handleKeepSystem} isLoading={keepSystem.isPending}>
                Keep System
              </Button>
              <Button
                size="sm"
                variant="outline"
                colorScheme="purple"
                onClick={handleKeepAi}
                isLoading={keepAi.isPending}
              >
                Keep AI
              </Button>
              <Button
                size="sm"
                colorScheme="brand"
                onClick={handleSaveMerge}
                isLoading={applyMergedDays.isPending}
              >
                Save Merge ({finalByDate.size}/{currentDays.length})
              </Button>
            </>
          )}
        </HStack>
      </Flex>

      {!aiCandidate ? (
        <Box p={8} borderWidth="1px" borderColor={panelBorderColor} borderRadius="xl" textAlign="center">
          <Text fontWeight="semibold" fontSize="lg" mb={2}>
            No AI itinerary yet
          </Text>
          <Text color="gray.500" mb={4} fontSize="sm">
            Generate an AI alternative to compare against your current itinerary.
          </Text>
        </Box>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {visibleOptionalPlaces.length > 0 && (
            <Box mb={5} p={4} borderWidth="1px" borderColor={panelBorderColor} borderRadius="xl">
              <Heading size="sm" mb={1}>
                Optional Places
              </Heading>
              <Text fontSize="xs" color="gray.500" mb={3}>
                Didn't fit automatically. Drag one onto any day's Final column to schedule it.
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

          <Stack spacing={4}>
            {currentDays.map((systemDay, index) => (
              <Box key={systemDay.date}>
                {index > 0 && <Divider mb={4} />}
                <DayCompareRow
                  systemDay={systemDay}
                  aiDay={aiByDate.get(systemDay.date)}
                  final={finalByDate.get(systemDay.date)}
                  onUseSystem={() => handleUseSystem(systemDay.date, systemDay)}
                  onUseAi={() => {
                    const aiDay = aiByDate.get(systemDay.date);
                    if (aiDay) handleUseAi(systemDay.date, aiDay);
                  }}
                  onRemoveStop={(stopId) => handleRemoveStop(systemDay.date, stopId)}
                  onRemovePendingOptional={(placeId) => handleRemovePendingOptional(systemDay.date, placeId)}
                />
              </Box>
            ))}
          </Stack>
        </DndContext>
      )}
    </Box>
  );
}
