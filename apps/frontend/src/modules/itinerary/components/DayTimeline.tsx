import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Box,
  Flex,
  Heading,
  Icon,
  Text,
} from "@chakra-ui/react";
import { FiClock, FiMapPin } from "react-icons/fi";
import { format, parseISO } from "date-fns";
import { PinnedTimelineStop, TimelineStop, type AvailableDay } from "./TimelineStop";
import type { ItineraryDay } from "@/modules/itinerary/types";

interface DayTimelineProps {
  day: ItineraryDay;
  onReorder?: (dayNumber: number, stopIds: string[]) => void;
  isReordering?: boolean;
  readOnly?: boolean;
  availableDays?: AvailableDay[];
  onMoveStop?: (stopId: string, toDayNumber: number) => void;
  movingStopId?: string | null;
  tripId?: string;
  destinationCity?: string;
  destinationCountry?: string;
}

function formatDayDate(date: string) {
  try {
    return format(parseISO(date), "EEEE, MMM d");
  } catch {
    return date;
  }
}

export function DayTimeline({
  day,
  onReorder,
  isReordering,
  readOnly = false,
  availableDays,
  onMoveStop,
  movingStopId,
  tripId,
  destinationCity,
  destinationCountry,
}: DayTimelineProps) {
  const borderColor = "border.line";
  const bg = "bg.surface";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const pinnedFirst = day.stops.filter((s) => s.stopType === "transfer");
  const pinnedLast = day.stops.filter((s) => s.stopType === "return");
  const draggableStops = day.stops.filter((s) => s.stopType !== "transfer" && s.stopType !== "return");

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;

    const ids = draggableStops.map((s) => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...ids];
    const [removed] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, removed);
    onReorder(day.dayNumber, [
      ...pinnedFirst.map((s) => s.id),
      ...reordered,
      ...pinnedLast.map((s) => s.id),
    ]);
  };

  return (
    <Box
      p={4}
      bg={bg}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="xl"
      opacity={isReordering ? 0.7 : 1}
      pointerEvents={isReordering ? "none" : "auto"}
    >
      <Heading size="sm" mb={1}>
        Day {day.dayNumber}
        {day.legName ? ` · ${day.legName}` : ""}
        {day.dayType === "transfer" ? " (Travel)" : ""}
      </Heading>
      <Text fontSize="sm" color="fg.muted" mb={4}>
        {formatDayDate(day.date)}
        {day.transferLabel ? ` · ${day.transferLabel}` : ""}
        {" · "}
        {day.stops.length} stop{day.stops.length !== 1 ? "s" : ""}
      </Text>

      {day.stops.length === 0 ? (
        <Text fontSize="sm" color="fg.muted">
          No stops scheduled for this day.
        </Text>
      ) : readOnly ? (
        day.stops.map((stop, index) => (
          <ReadOnlyStop key={stop.id} stop={stop} isLast={index === day.stops.length - 1} />
        ))
      ) : (
        <>
          {pinnedFirst.map((stop) => (
            <PinnedTimelineStop key={stop.id} stop={stop} isLast={stop.id === day.stops[day.stops.length - 1]?.id} />
          ))}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={draggableStops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {draggableStops.map((stop) => (
                <TimelineStop
                  key={stop.id}
                  stop={stop}
                  isLast={stop.id === day.stops[day.stops.length - 1]?.id}
                  availableDays={availableDays}
                  onMoveToDay={onMoveStop ? (toDayNumber) => onMoveStop(stop.id, toDayNumber) : undefined}
                  isMoving={movingStopId === stop.id}
                  tripId={tripId}
                  dayNumber={day.dayNumber}
                  destinationCity={destinationCity}
                  destinationCountry={destinationCountry}
                />
              ))}
            </SortableContext>
          </DndContext>
          {pinnedLast.map((stop) => (
            <PinnedTimelineStop key={stop.id} stop={stop} isLast={stop.id === day.stops[day.stops.length - 1]?.id} />
          ))}
        </>
      )}
    </Box>
  );
}

function ReadOnlyStop({
  stop,
  isLast,
}: {
  stop: ItineraryDay["stops"][number];
  isLast: boolean;
}) {
  const borderColor = "border.line";
  const dotColor = "accent";
  const lineColor = "border.line";
  const cardBg = "bg.surface";

  return (
    <Flex gap={3} position="relative" pb={isLast ? 0 : 4}>
      <Box position="relative" w="20px" flexShrink={0}>
        <Box
          w="12px"
          h="12px"
          borderRadius="full"
          bg={dotColor}
          position="absolute"
          top="6px"
          left="4px"
        />
        {!isLast && (
          <Box position="absolute" top="18px" left="9px" w="2px" bottom="-4px" bg={lineColor} />
        )}
      </Box>
      <Box flex={1} p={3} borderWidth="1px" borderColor={borderColor} borderRadius="lg" bg={cardBg}>
        <Text fontWeight="semibold" fontSize="sm">
          {stop.placeName}
        </Text>
        {stop.category && (
          <Text fontSize="xs" color="fg.muted" mt={0.5}>
            {stop.category}
          </Text>
        )}
        <Flex mt={2} gap={4} flexWrap="wrap" fontSize="xs" color="fg.muted">
          <Flex align="center" gap={1}>
            <Icon as={FiClock} />
            <Text>
              {stop.arrivalTime} – {stop.departureTime} ({stop.visitDurationMinutes} min)
            </Text>
          </Flex>
          {stop.travelDurationMinutes > 0 && (
            <Flex align="center" gap={1}>
              <Icon as={FiMapPin} />
              <Text>{stop.travelDurationMinutes} min travel</Text>
            </Flex>
          )}
        </Flex>
      </Box>
    </Flex>
  );
}
