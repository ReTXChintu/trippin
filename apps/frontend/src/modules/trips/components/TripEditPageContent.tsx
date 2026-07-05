import { Box, Heading, Text } from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import { TripForm } from "@/modules/trips/components/TripForm";
import { useTripQuery } from "@/modules/trips/hooks/useTrips";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

export function TripEditPageContent() {
  const { id = "" } = useParams();
  const { data: trip, isLoading } = useTripQuery(id);

  if (isLoading) return <LoadingState />;
  if (!trip) return <EmptyState title="Trip not found" />;

  return (
    <Box>
      <Heading size="lg" mb={1}>
        Edit Trip
      </Heading>
      <Text color="gray.500" mb={6}>
        Update your trip details and preferences
      </Text>
      <TripForm mode="edit" trip={trip} />
    </Box>
  );
}
