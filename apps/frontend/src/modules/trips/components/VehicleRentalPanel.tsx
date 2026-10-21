import { Flex, HStack, Icon, IconButton, Stack, Text, Tooltip } from "@chakra-ui/react";
import { FiExternalLink, FiPhone, FiStar } from "react-icons/fi";
import { LuBike } from "react-icons/lu";
import { IconTile, RowCard, RowText } from "@/components/ui/tabs";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import type { VehicleRentalSuggestion } from "@/modules/trips/types/trip-enrichment.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";

interface VehicleRentalPanelProps {
  trip: Trip;
  legId?: string;
}

function RentalRow({ rental }: { rental: VehicleRentalSuggestion }) {
  const sub = [rental.distanceKm != null && `${rental.distanceKm} km from stay`, rental.vehicleTypes.join(" · "), rental.address].filter(Boolean).join(" · ");
  return (
    <RowCard>
      <IconTile icon={LuBike} />
      <RowText title={rental.name} sub={sub} />
      {rental.rating != null && (
        <HStack spacing={1} fontSize="13px" fontWeight={600} flexShrink={0}>
          <Icon as={FiStar} color="warn" boxSize="12px" />
          <Text>{rental.rating.toFixed(1)}</Text>
        </HStack>
      )}
      {rental.phone && (
        <Tooltip label={rental.phone} hasArrow>
          <IconButton as="a" href={`tel:${rental.phone}`} aria-label={`Call ${rental.name}`} icon={<FiPhone size={16} />} variant="ghost" colorScheme="gray" />
        </Tooltip>
      )}
      {rental.googleMapsUrl && (
        <Tooltip label="View on Maps" hasArrow>
          <IconButton as="a" href={rental.googleMapsUrl} target="_blank" rel="noopener noreferrer" aria-label={`${rental.name} on Maps`} icon={<FiExternalLink size={16} />} variant="ghost" colorScheme="gray" />
        </Tooltip>
      )}
    </RowCard>
  );
}

function LegRentalSection({ leg, rentals, showTitle }: { leg: TripLeg; rentals: VehicleRentalSuggestion[]; showTitle: boolean }) {
  if (rentals.length === 0) return null;
  return (
    <Stack spacing={2}>
      {showTitle && (
        <Text fontWeight={600} fontSize="13px">
          {leg.name || leg.baseCity}
          {leg.hotelName ? ` · near ${leg.hotelName}` : ""}
        </Text>
      )}
      {rentals.map((rental) => (
        <RentalRow key={rental.googlePlaceId} rental={rental} />
      ))}
    </Stack>
  );
}

/** Vehicle / scooter rental suggestions near each city's stay. */
export function VehicleRentalPanel({ trip, legId }: VehicleRentalPanelProps) {
  const legs = getEffectiveLegs(trip).filter((leg) => !legId || leg.id === legId);
  const sections = legs.map((leg) => ({ leg, rentals: leg.vehicleRentalSuggestions })).filter((s) => s.rentals.length > 0);
  if (sections.length === 0) return null;

  return (
    <Flex direction="column" gap={4}>
      {sections.map(({ leg, rentals }) => (
        <LegRentalSection key={leg.id} leg={leg} rentals={rentals} showTitle={!legId} />
      ))}
    </Flex>
  );
}
