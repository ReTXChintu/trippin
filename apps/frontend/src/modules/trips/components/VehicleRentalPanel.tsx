import {
  Badge,
  Box,
  Heading,
  HStack,
  Link,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FiExternalLink, FiMapPin, FiStar } from "react-icons/fi";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import type { VehicleRentalSuggestion } from "@/modules/trips/types/trip-enrichment.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";

interface VehicleRentalPanelProps {
  trip: Trip;
  legId?: string;
}

function RentalCard({ rental }: { rental: VehicleRentalSuggestion }) {
  const borderColor = "border.line";
  const bg = "bg.surface";

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
        <Text fontSize="xs" color="fg.muted" mb={2}>
          {rental.address}
        </Text>
      )}

      <HStack spacing={3} fontSize="xs" color="fg.muted" mb={2} flexWrap="wrap">
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

export function VehicleRentalPanel({ trip, legId }: VehicleRentalPanelProps) {
  const legs = getEffectiveLegs(trip).filter((leg) => !legId || leg.id === legId);

  const sections = legs
    .map((leg) => ({ leg, rentals: leg.vehicleRentalSuggestions }))
    .filter((s) => s.rentals.length > 0);

  if (sections.length === 0) return null;

  return (
    <Stack spacing={6}>
      {sections.map(({ leg, rentals }) => (
        <LegRentalSection key={leg.id} leg={leg} rentals={rentals} />
      ))}
    </Stack>
  );
}
