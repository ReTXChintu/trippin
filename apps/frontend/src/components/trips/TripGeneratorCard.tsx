import { Box, Heading, Text, useColorModeValue, VStack } from "@chakra-ui/react";
import { DescribeTripPanel } from "@/modules/trips/components/create/DescribeTripPanel";

export function TripGeneratorCard() {
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  return (
    <Box p={6} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
      <VStack align="stretch" spacing={4}>
        <Box>
          <Heading size="md" mb={1}>
            Describe your trip
          </Heading>
          <Text color="gray.500" fontSize="sm">
            Where, how long, when and what you enjoy — any country, one city or several. We&apos;ll set up the
            cities, dates and interests for you.
          </Text>
        </Box>
        <DescribeTripPanel />
      </VStack>
    </Box>
  );
}
