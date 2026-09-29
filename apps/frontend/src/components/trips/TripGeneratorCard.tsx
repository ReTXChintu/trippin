import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import { DescribeTripPanel } from "@/modules/trips/components/create/DescribeTripPanel";

export function TripGeneratorCard() {
  const bg = "bg.surface";
  const borderColor = "border.line";

  return (
    <Box p={6} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
      <VStack align="stretch" spacing={4}>
        <Box>
          <Heading size="md" mb={1}>
            Describe your trip
          </Heading>
          <Text color="fg.muted" fontSize="sm">
            Where, how long, when and what you enjoy — any country, one city or several. We&apos;ll set up the
            cities, dates and interests for you.
          </Text>
        </Box>
        <DescribeTripPanel />
      </VStack>
    </Box>
  );
}
