import { Flex, Icon, Text } from "@chakra-ui/react";
import type { ItineraryStop } from "@/modules/itinerary/types";
import { categoryIcon } from "@/modules/trips/components/tabs/placeMeta";

interface PlaceCardProps {
  stop: ItineraryStop;
  compact?: boolean;
}

/** Compact stop card: name, category, time window, visit length. */
export function PlaceCard({ stop, compact = false }: PlaceCardProps) {
  return (
    <Flex direction="column" gap="4px" px={compact ? "10px" : "14px"} py={compact ? "8px" : "12px"} bg="sf" borderWidth="1px" borderColor="ln" borderRadius="xl">
      <Text fontWeight={600} fontSize={compact ? "13px" : "14px"} noOfLines={1}>
        {stop.placeName}
      </Text>
      <Flex align="center" gap={2} fontSize="12px" color="tx3" flexWrap="wrap">
        {stop.category && (
          <Flex align="center" gap={1}>
            <Icon as={categoryIcon(stop.category)} boxSize="13px" />
            <Text>{stop.category}</Text>
          </Flex>
        )}
        <Text>
          {stop.arrivalTime} – {stop.departureTime}
        </Text>
        <Text>· {stop.visitDurationMinutes} min visit</Text>
      </Flex>
    </Flex>
  );
}
