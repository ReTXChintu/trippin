import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Box,
  Flex,
  HStack,
  Icon,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiClock, FiMapPin, FiMove } from "react-icons/fi";
import type { ItineraryStop } from "@/modules/itinerary/types";
import { HypeBadge, StopTypeBadge } from "@/modules/itinerary/components/DestinationGuidePanel";

interface TimelineStopProps {
  stop: ItineraryStop;
  isLast?: boolean;
}

export function TimelineStop({ stop, isLast = false }: TimelineStopProps) {
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const dotColor = useColorModeValue("brand.500", "brand.300");
  const lineColor = useColorModeValue("gray.200", "gray.600");

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

  return (
    <Flex ref={setNodeRef} style={style} gap={3} position="relative" pb={isLast ? 0 : 4}>
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
        borderRadius="lg"
        bg={useColorModeValue("white", "gray.800")}
      >
        <Flex justify="space-between" align="start" gap={2}>
          <Box flex={1}>
            <HStack spacing={2} mb={0.5} flexWrap="wrap">
              <Text fontWeight="semibold" fontSize="sm">
                {stop.placeName}
              </Text>
              <StopTypeBadge stopType={stop.stopType} />
              <HypeBadge level={stop.visitIntel?.hypeLevel} />
            </HStack>
            {stop.category && (
              <Text fontSize="xs" color="gray.500" mt={0.5}>
                {stop.category}
              </Text>
            )}
            {stop.aiNotes && (
              <Text fontSize="xs" color="gray.600" mt={1.5} fontStyle="italic">
                {stop.aiNotes}
              </Text>
            )}
            {stop.visitIntel?.bestTime && !stop.aiNotes && (
              <Text fontSize="xs" color="gray.500" mt={1}>
                Best time: {stop.visitIntel.bestTime}
              </Text>
            )}
          </Box>
          <Box
            {...attributes}
            {...listeners}
            cursor="grab"
            color="gray.400"
            _hover={{ color: "gray.600" }}
            p={1}
            aria-label="Drag to reorder"
          >
            <Icon as={FiMove} />
          </Box>
        </Flex>

        <Flex mt={2} gap={4} flexWrap="wrap" fontSize="xs" color="gray.500">
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
