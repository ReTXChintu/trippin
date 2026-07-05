"use client";

import { Box, Heading, Text } from "@chakra-ui/react";
import { TripForm } from "@/modules/trips/components/TripForm";
import type { Trip } from "@/modules/trips/types/trip.types";

interface TripEditPageContentProps {
  trip: Trip;
}

export function TripEditPageContent({ trip }: TripEditPageContentProps) {
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
