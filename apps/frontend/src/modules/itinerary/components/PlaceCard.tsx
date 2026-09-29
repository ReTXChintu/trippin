import { Badge, Box, HStack, Text } from "@chakra-ui/react";
import type { ItineraryStop } from "@/modules/itinerary/types";

interface PlaceCardProps {
  stop: ItineraryStop;
  compact?: boolean;
}

export function PlaceCard({ stop, compact = false }: PlaceCardProps) {
  const borderColor = "border.line";
  const bg = "bg.subtle";

  return (
    <Box
      p={compact ? 2 : 3}
      bg={bg}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
    >
      <Text fontWeight="medium" fontSize={compact ? "sm" : "md"} noOfLines={1}>
        {stop.placeName}
      </Text>
      <HStack spacing={2} mt={1} flexWrap="wrap">
        {stop.category && (
          <Badge size="sm" colorScheme="brand">
            {stop.category}
          </Badge>
        )}
        <Text fontSize="xs" color="fg.muted">
          {stop.arrivalTime} – {stop.departureTime}
        </Text>
        <Text fontSize="xs" color="fg.muted">
          {stop.visitDurationMinutes} min visit
        </Text>
      </HStack>
    </Box>
  );
}
