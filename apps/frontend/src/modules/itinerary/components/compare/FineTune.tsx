/**
 * "Fine-tune stop by stop" — the drag-and-drop merge on the Compare page. Stops are dragged from
 * Your plan / AI plan (or the optional-places pool) into each day's merged column. The drag logic
 * (ids like `sys:{date}:{stopId}`, `final:{date}:stop:{id}`) lives in ItineraryComparePageContent.
 */
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Flex, HStack, Icon, IconButton, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { FiMove, FiX } from "react-icons/fi";
import { DayBadge, Overline, Pill } from "@/components/ui";
import { HypeBadge } from "@/modules/itinerary/components/DestinationGuidePanel";
import type { ItineraryDayWithDistance, ItineraryStop, OptionalItineraryPlace } from "@/modules/itinerary/types";
import { formatDayDate } from "@/modules/itinerary/utils/plan.utils";

export interface PendingOptional {
  placeId: string;
  placeName: string;
  category?: string;
}

export type FinalSource = "system" | "ai" | "custom";

export interface FinalDayState {
  stops: ItineraryStop[];
  pendingOptional: PendingOptional[];
  dressCode?: string;
  /** Which side the day was taken from; "custom" once stops were dragged/removed by hand. */
  source: FinalSource;
}

function StopCard({ stop }: { stop: ItineraryStop }) {
  return (
    <Box px={3} py="10px" borderWidth="1px" borderColor="border.line" borderRadius="md" bg="bg.surface">
      <Text fontWeight={600} fontSize="13px" noOfLines={2}>
        {stop.placeName}
      </Text>
      <HStack spacing={2} mt={1} fontSize="12px" color="fg.muted" flexWrap="wrap">
        <Text sx={{ fontVariantNumeric: "tabular-nums" }}>
          {stop.arrivalTime}–{stop.departureTime}
        </Text>
        {stop.category && <Text>· {stop.category}</Text>}
        <HypeBadge level={stop.visitIntel?.hypeLevel} />
      </HStack>
      {stop.aiNotes && (
        <Text fontSize="12px" color="fg.muted" mt={1} noOfLines={2}>
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
  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      opacity={isDragging ? 0.5 : 1}
      px={3}
      py="10px"
      borderWidth="1px"
      borderColor="accent"
      borderRadius="md"
      bg="accent.soft"
      color="accent.text"
    >
      <HStack justify="space-between" align="start">
        <Box flex={1} minW={0} {...listeners} {...attributes} cursor="grab">
          <HStack spacing="6px">
            <Icon as={FiMove} boxSize="11px" />
            <Text fontWeight={600} fontSize="13px" noOfLines={1}>
              {stop.placeName}
            </Text>
          </HStack>
          <Text fontSize="12px" mt="2px" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {stop.arrivalTime}–{stop.departureTime}
          </Text>
        </Box>
        <IconButton aria-label={`Remove ${stop.placeName}`} icon={<FiX />} size="xs" variant="ghost" onClick={onRemove} />
      </HStack>
    </Box>
  );
}

function PendingOptionalCard({ place, onRemove }: { place: PendingOptional; onRemove: () => void }) {
  return (
    <Box px={3} py="10px" borderWidth="1px" borderStyle="dashed" borderColor="accent" borderRadius="md" bg="accent.soft" color="accent.text">
      <HStack justify="space-between" align="start">
        <Box flex={1} minW={0}>
          <Text fontWeight={600} fontSize="13px" noOfLines={1}>
            {place.placeName}
          </Text>
          <Text fontSize="12px" mt="2px">
            Time set when you merge
          </Text>
        </Box>
        <IconButton aria-label={`Remove ${place.placeName}`} icon={<FiX />} size="xs" variant="ghost" onClick={onRemove} />
      </HStack>
    </Box>
  );
}

/** A place that didn't fit either plan — drag it onto any day's merged column. */
export function OptionalSourceCard({ id, place }: { id: string; place: OptionalItineraryPlace & { sources: string[] } }) {
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
      px={3}
      py="10px"
      w="200px"
      borderWidth="1px"
      borderColor="border.line"
      borderRadius="md"
      bg="bg.surface"
    >
      <Text fontWeight={600} fontSize="13px" noOfLines={1}>
        {place.placeName}
      </Text>
      <HStack spacing={1} mt={1}>
        {place.sources.map((s) => (
          <Pill key={s} tone={s === "AI" ? "accent" : "neutral"} h="20px" px="8px">
            {s === "AI" ? "AI" : "Yours"}
          </Pill>
        ))}
      </HStack>
      <Text fontSize="12px" color="fg.muted" mt={1} noOfLines={2}>
        {place.reason}
      </Text>
    </Box>
  );
}

function FinalDropZone({ date, children }: { date: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `final:${date}` });
  return (
    <Stack
      ref={setNodeRef}
      spacing={2}
      p={2}
      minH="80px"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor={isOver ? "accent" : "border.line"}
      borderRadius="md"
      bg={isOver ? "accent.soft" : undefined}
    >
      {children}
    </Stack>
  );
}

/** One day in the fine-tune panel: Your plan stops | AI stops | merged (drop target). */
export function FineTuneDayRow({
  systemDay,
  aiDay,
  final,
  onRemoveStop,
  onRemovePendingOptional,
}: {
  systemDay: ItineraryDayWithDistance;
  aiDay?: ItineraryDayWithDistance;
  final: FinalDayState | undefined;
  onRemoveStop: (stopId: string) => void;
  onRemovePendingOptional: (placeId: string) => void;
}) {
  const date = systemDay.date;
  const finalStops = final?.stops ?? [];
  const finalPending = final?.pendingOptional ?? [];

  return (
    <Box p={4} bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl">
      <Flex align="center" gap={2} mb={3} wrap="wrap">
        <DayBadge dayNumber={systemDay.dayNumber} size={28} />
        <Text fontWeight={600}>
          Day {systemDay.dayNumber} · {formatDayDate(date, "EEE d MMM")}
        </Text>
        {aiDay?.dressCode && (
          <Pill tone="accent" ml="auto">
            AI suggests: {aiDay.dressCode}
          </Pill>
        )}
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
        <Box>
          <Overline mb={2}>Your plan · {systemDay.distanceKm ?? 0} km</Overline>
          <Stack spacing={2}>
            {systemDay.stops.map((stop) => (
              <SourceStopCard key={stop.id} id={`sys:${date}:${stop.id}`} stop={stop} />
            ))}
          </Stack>
        </Box>

        <Box>
          <Overline mb={2} color="accent.text">
            AI plan · {aiDay?.distanceKm ?? 0} km
          </Overline>
          <Stack spacing={2}>
            {(aiDay?.stops ?? []).map((stop) => (
              <SourceStopCard key={stop.id} id={`ai:${date}:${stop.id}`} stop={stop} />
            ))}
          </Stack>
        </Box>

        <Box>
          <Overline mb={2} color="fg.default">
            Merged · {finalStops.length + finalPending.length} stops
          </Overline>
          <SortableContext items={finalStops.map((s) => `final:${date}:stop:${s.id}`)} strategy={verticalListSortingStrategy}>
            <FinalDropZone date={date}>
              {finalStops.length === 0 && finalPending.length === 0 ? (
                <Text fontSize="12px" color="fg.muted" p={2}>
                  Drag stops here from either plan, another day or the optional places.
                </Text>
              ) : (
                <>
                  {finalStops.map((stop) => (
                    <FinalStopCard key={stop.id} id={`final:${date}:stop:${stop.id}`} stop={stop} onRemove={() => onRemoveStop(stop.id)} />
                  ))}
                  {finalPending.map((place) => (
                    <PendingOptionalCard key={place.placeId} place={place} onRemove={() => onRemovePendingOptional(place.placeId)} />
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
