import { Flex, HStack, Icon, Text } from "@chakra-ui/react";
import { LuSparkles } from "react-icons/lu";
import { AiStatusChip } from "@/components/layout/Navbar";
import { SurfaceCard } from "@/components/ui";
import { DescribeTripPanel } from "@/modules/trips/components/create/DescribeTripPanel";

/** Dashboard "Describe your trip" card: one sentence, AI drafts the trip. */
export function TripGeneratorCard() {
  return (
    <SurfaceCard as="section" raised borderRadius="18px" p={{ base: "14px", md: "20px" }} aria-labelledby="describe-trip-title">
      <Flex justify="space-between" align="center" mb={{ base: "10px", md: "12px" }} gap="8px">
        <HStack spacing="8px">
          <Icon as={LuSparkles} color="accent.text" boxSize={{ base: "16px", md: "18px" }} />
          <Text
            as="h2"
            id="describe-trip-title"
            fontFamily={{ base: "body", md: "heading" }}
            fontWeight={600}
            fontSize={{ base: "14px", md: "20px" }}
            letterSpacing={{ md: "-0.01em" }}
          >
            Describe your trip
          </Text>
        </HStack>
        <AiStatusChip />
      </Flex>
      <DescribeTripPanel />
    </SurfaceCard>
  );
}
