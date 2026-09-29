import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Badge,
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from "@chakra-ui/react";
import { FiCalendar, FiClock, FiMapPin, FiMove } from "react-icons/fi";
import type { ItineraryStop, MealType } from "@/modules/itinerary/types";
import { HypeBadge, StopTypeBadge } from "@/modules/itinerary/components/DestinationGuidePanel";
import { MealSlotEditor } from "@/modules/itinerary/components/MealSlotEditor";

export interface AvailableDay {
  dayNumber: number;
  label: string;
}

/**
 * Non-draggable rendering for structural stops (transfer / return-to-hotel) that are always
 * pinned first/last within a day — dragging them would break the "start/end of day" invariant
 * the itinerary engine enforces server-side.
 */
export function PinnedTimelineStop({ stop, isLast = false }: { stop: ItineraryStop; isLast?: boolean }) {
  const borderColor = "border.line";
  const dotColor = "accent";
  const lineColor = "border.line";
  const cardBg = "bg.subtle";

  return (
    <Flex gap={3} position="relative" pb={isLast ? 0 : 4}>
      <Box position="relative" w="20px" flexShrink={0}>
        <Box w="12px" h="12px" borderRadius="full" bg={dotColor} position="absolute" top="6px" left="4px" />
        {!isLast && <Box position="absolute" top="18px" left="9px" w="2px" bottom="-4px" bg={lineColor} />}
      </Box>
      <Box flex={1} p={3} borderWidth="1px" borderColor={borderColor} borderRadius="lg" bg={cardBg}>
        <HStack spacing={2} mb={0.5} flexWrap="wrap">
          <Badge colorScheme="brand" fontSize="2xs">
            {stop.stopType === "transfer" ? "Transfer" : "Return to hotel"}
          </Badge>
          <Text fontWeight="semibold" fontSize="sm">
            {stop.placeName}
          </Text>
        </HStack>
        {stop.notes && (
          <Text fontSize="xs" color="fg.muted" mt={0.5}>
            {stop.notes}
          </Text>
        )}
        <Flex mt={2} gap={4} flexWrap="wrap" fontSize="xs" color="fg.muted">
          <Flex align="center" gap={1}>
            <Icon as={FiClock} />
            <Text>
              {stop.arrivalTime} – {stop.departureTime}
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

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  tiffin: "Snacks",
  dinner: "Dinner",
};

interface TimelineStopProps {
  stop: ItineraryStop;
  isLast?: boolean;
  availableDays?: AvailableDay[];
  onMoveToDay?: (toDayNumber: number) => void;
  isMoving?: boolean;
  tripId?: string;
  dayNumber?: number;
  destinationCity?: string;
  destinationCountry?: string;
}

export function TimelineStop({
  stop,
  isLast = false,
  availableDays,
  onMoveToDay,
  isMoving = false,
  tripId,
  dayNumber,
  destinationCity,
  destinationCountry,
}: TimelineStopProps) {
  const borderColor = "border.line";
  const dotColor = "accent";
  const lineColor = "border.line";
  const mealDotColor = "warn";
  const cardBg = "bg.surface";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const canMove = onMoveToDay && availableDays && availableDays.length > 0;
  const isMeal = stop.stopType === "meal";
  const isAssignedMeal = isMeal && Boolean(stop.placeId);

  return (
    <Flex ref={setNodeRef} style={style} gap={3} position="relative" pb={isLast ? 0 : 4}>
      <Box position="relative" w="20px" flexShrink={0}>
        <Box
          w="12px"
          h="12px"
          borderRadius="full"
          bg={isMeal ? mealDotColor : dotColor}
          position="absolute"
          top="6px"
          left="4px"
        />
        {!isLast && (
          <Box
            position="absolute"
            top="18px"
            left="9px"
            w="2px"
            bottom="-4px"
            bg={lineColor}
          />
        )}
      </Box>

      <Box
        flex={1}
        p={3}
        borderWidth="1px"
        borderColor={borderColor}
        borderStyle={isMeal && !isAssignedMeal ? "dashed" : "solid"}
        borderRadius="lg"
        bg={cardBg}
      >
        <Flex justify="space-between" align="start" gap={2}>
          <Box flex={1}>
            <HStack spacing={2} mb={0.5} flexWrap="wrap">
              {isMeal && stop.mealType && (
                <Badge colorScheme="orange" fontSize="2xs">
                  {MEAL_LABELS[stop.mealType]}
                </Badge>
              )}
              <Text fontWeight="semibold" fontSize="sm">
                {isAssignedMeal || !isMeal ? stop.placeName : "Not assigned yet"}
              </Text>
              {!isMeal && <StopTypeBadge stopType={stop.stopType} />}
              <HypeBadge level={stop.visitIntel?.hypeLevel} />
            </HStack>
            {stop.category && (
              <Text fontSize="xs" color="fg.muted" mt={0.5}>
                {stop.category}
              </Text>
            )}
            {stop.aiNotes && (
              <Text fontSize="xs" color="fg.muted" mt={1.5} fontStyle="italic">
                {stop.aiNotes}
              </Text>
            )}
            {stop.visitIntel?.bestTime && !stop.aiNotes && (
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Best time: {stop.visitIntel.bestTime}
              </Text>
            )}
          </Box>

          <HStack spacing={1}>
            {isMeal && tripId && dayNumber !== undefined && (
              <MealSlotEditor
                tripId={tripId}
                dayNumber={dayNumber}
                stop={stop}
                destinationCity={destinationCity}
                destinationCountry={destinationCountry}
              />
            )}
            {canMove && (
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<FiCalendar />}
                  size="xs"
                  variant="ghost"
                  aria-label="Move to another day"
                  isLoading={isMoving}
                />
                <MenuList>
                  {availableDays!.map((day) => (
                    <MenuItem key={day.dayNumber} onClick={() => onMoveToDay!(day.dayNumber)}>
                      Move to {day.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            )}
            <Box
              {...attributes}
              {...listeners}
              cursor="grab"
              color="fg.muted"
              _hover={{ color: "gray.600" }}
              p={1}
              aria-label="Drag to reorder"
            >
              <Icon as={FiMove} />
            </Box>
          </HStack>
        </Flex>

        <Flex mt={2} gap={4} flexWrap="wrap" fontSize="xs" color="fg.muted">
          <Flex align="center" gap={1}>
            <Icon as={FiClock} />
            <Text>
              {stop.arrivalTime} – {stop.departureTime}
              {!isMeal ? ` (${stop.visitDurationMinutes} min)` : ""}
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
