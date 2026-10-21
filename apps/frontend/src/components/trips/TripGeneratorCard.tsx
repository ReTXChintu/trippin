import { Flex, HStack, Icon, Text } from "@chakra-ui/react";
import { LuSparkles } from "react-icons/lu";
import { AiStatusChip } from "@/components/layout/Navbar";
import { SurfaceCard } from "@/components/ui";
import { DescribeTripPanel } from "@/modules/trips/components/create/DescribeTripPanel";

/** Dashboard "Describe your trip" card: one sentence, AI drafts the trip. */
export function TripGeneratorCard() {
  return (
    <SurfaceCard as="section" p={{ base: 4, md: 5 }} aria-labelledby="describe-trip-title">
      <Flex justify="space-between" align="center" mb={3} gap={2}>
        <HStack spacing={3}>
          <Flex w="36px" h="36px" borderRadius="md" bg="acSoft" color="ac" align="center" justify="center" flexShrink={0}>
            <Icon as={LuSparkles} boxSize="18px" />
          </Flex>
          <Text as="h2" id="describe-trip-title" fontWeight={600} fontSize="17px" lineHeight="24px">
            Describe your trip
          </Text>
        </HStack>
        <AiStatusChip />
      </Flex>
      <DescribeTripPanel />
    </SurfaceCard>
  );
}
