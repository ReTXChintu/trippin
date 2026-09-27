import { Box, Button, Heading, HStack, Stack, Text, Tooltip, useColorModeValue, useToast } from "@chakra-ui/react";
import { FiRefreshCw, FiSearch } from "react-icons/fi";
import { getApiErrorMessage } from "@/lib/api";
import { useGenerateLegGuide } from "@/modules/itinerary/hooks/useItinerary";
import { useDiscoverVehicleRentals } from "@/modules/places/hooks/usePlaces";
import { DestinationGuidePanel } from "@/modules/itinerary/components/DestinationGuidePanel";
import { VehicleRentalPanel } from "@/modules/trips/components/VehicleRentalPanel";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";

interface LegExplorePanelProps {
  trip: Trip;
  leg: TripLeg;
}

export function LegExplorePanel({ trip, leg }: LegExplorePanelProps) {
  const toast = useToast();
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bg = useColorModeValue("white", "gray.800");

  const discoverRentals = useDiscoverVehicleRentals(trip.id);
  const generateGuide = useGenerateLegGuide(trip.id);

  const hasRentals = leg.vehicleRentalSuggestions.length > 0;
  const hasGuide = Boolean(leg.destinationBrief);
  const hasHotel = Boolean(leg.hotelCoordinates);

  const handleSearchRentals = async () => {
    try {
      const result = await discoverRentals.mutateAsync(leg.id);
      toast({
        title: `Found ${result.vehicleRentalSuggestions.length} rental option(s)`,
        status: "success",
      });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const handleGenerateGuide = async () => {
    try {
      await generateGuide.mutateAsync(leg.id);
      toast({ title: "Local guide generated", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Stack spacing={6}>
      <Box p={5} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
        <HStack justify="space-between" align="center" mb={4} flexWrap="wrap" gap={2}>
          <Heading size="sm">Local guide</Heading>
          <Button
            size="sm"
            leftIcon={<FiRefreshCw />}
            onClick={handleGenerateGuide}
            isLoading={generateGuide.isPending}
          >
            {hasGuide ? "Refresh local guide" : "Generate local guide"}
          </Button>
        </HStack>
        <DestinationGuidePanel legs={[{ leg, brief: leg.destinationBrief }]} />
      </Box>
      <Box p={5} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
        <HStack justify="space-between" align="center" mb={4} flexWrap="wrap" gap={2}>
          <Heading size="sm">Scooter & bike rentals</Heading>
          <Tooltip label="Add a stay on the Stays tab first" isDisabled={hasHotel}>
            <Box>
              <Button
                size="sm"
                leftIcon={<FiSearch />}
                onClick={handleSearchRentals}
                isLoading={discoverRentals.isPending}
                isDisabled={!hasHotel}
              >
                {hasRentals ? "Refresh rentals" : "Search rentals"}
              </Button>
            </Box>
          </Tooltip>
        </HStack>
        {hasRentals ? (
          <VehicleRentalPanel trip={trip} legId={leg.id} />
        ) : (
          <Text fontSize="sm" color="gray.500">
            {hasHotel
              ? 'No rental suggestions yet — click "Search rentals".'
              : "Add a stay on the Stays tab to search rentals near it."}
          </Text>
        )}
      </Box>

    </Stack>
  );
}
