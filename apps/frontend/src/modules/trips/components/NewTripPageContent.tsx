import { Box, Heading, Text } from "@chakra-ui/react";
import { TripForm } from "@/modules/trips/components/TripForm";

export function NewTripPageContent() {
  return (
    <Box>
      <Heading size="lg" mb={1}>
        Create New Trip
      </Heading>
      <Text color="gray.500" mb={6}>
        Set up your destination, dates, and preferences
      </Text>

      <TripForm mode="create" />
    </Box>
  );
}
