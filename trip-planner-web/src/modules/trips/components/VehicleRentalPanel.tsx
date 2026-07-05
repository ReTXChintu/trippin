"use client";

import {
  Badge,
  Box,
  Heading,
  HStack,
  Link,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiExternalLink, FiMapPin, FiStar } from "react-icons/fi";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import type { VehicleRentalSuggestion } from "@/modules/trips/types/trip-enrichment.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";

interface VehicleRentalPanelProps {
  trip: Trip;
}

function RentalCard({ rental }: { rental: VehicleRentalSuggestion }) {
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bg = useColorModeValue("white", "gray.800");

  return (
    <Box p={4} borderWidth="1px" borderColor={borderColor} borderRadius="lg" bg={bg}>
      <HStack justify="space-between" align="start" mb={2}>
        <Heading size="sm">{rental.name}</Heading>
        {rental.rating != null && (
          <Badge colorScheme="yellow" display="flex" alignItems="center" gap={1}>
            <FiStar />
            {rental.rating.toFixed(1)}
          </Badge>
        )}
      </HStack>

      {rental.address && (
        <Text fontSize="xs" color="gray.500" mb={2}>
          {rental.address}
        </Text>
      )}

      <HStack spacing={3} fontSize="xs" color="gray.500" mb={2} flexWrap="wrap">
        {rental.distanceKm != null && (
          <HStack spacing={1}>
            <FiMapPin />
            <Text>{rental.distanceKm} km from stay</Text>
          </HStack>
        )}
        <Text>{rental.vehicleTypes.join(" · ")}</Text>
      </HStack>

      {rental.googleMapsUrl && (
        <Link
          href={rental.googleMapsUrl}
          isExternal
          fontSize="sm"
          color="brand.500"
          display="inline-flex"
          alignItems="center"
          gap={1}
        >
          View on Maps
          <FiExternalLink />
        </Link>
      )}
    </Box>
  );
}

function LegRentalSection({ leg, rentals }: { leg: TripLeg; rentals: VehicleRentalSuggestion[] }) {
  if (rentals.length === 0) return null;

  return (
    <Box>
      <Heading size="sm" mb={3}>
        {leg.name || leg.baseCity}
        {leg.hotelName ? ` · near ${leg.hotelName}` : ""}
      </Heading>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        {rentals.map((rental) => (
          <RentalCard key={rental.googlePlaceId} rental={rental} />
        ))}
      </SimpleGrid>
    </Box>
  );
}

export function VehicleRentalPanel({ trip }: VehicleRentalPanelProps) {
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bg = useColorModeValue("gray.50", "gray.900");

  const legs = getEffectiveLegs(trip);
  const isMultiLeg = trip.legs.length > 0;

  const sections = isMultiLeg
    ? legs
        .map((leg) => ({ leg, rentals: leg.vehicleRentalSuggestions }))
        .filter((s) => s.rentals.length > 0)
    : trip.vehicleRentalSuggestions.length > 0
      ? [{ leg: legs[0], rentals: trip.vehicleRentalSuggestions }]
      : [];

  if (sections.length === 0) return null;

  return (
    <Box p={5} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
      <Heading size="md" mb={1}>
        Nearby vehicle rentals
      </Heading>
      <Text fontSize="sm" color="gray.500" mb={4}>
        Scooter & bike rental shops near your stay — run Discover Places to refresh suggestions.
      </Text>
      <Stack spacing={6}>
        {sections.map(({ leg, rentals }) => (
          <LegRentalSection key={leg.id} leg={leg} rentals={rentals} />
        ))}
      </Stack>
    </Box>
  );
}
