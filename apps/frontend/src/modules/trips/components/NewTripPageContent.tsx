import { Box, Button, ButtonGroup, Heading, Text, useColorModeValue } from "@chakra-ui/react";
import { FiEdit3, FiZap } from "react-icons/fi";
import { useSearchParams } from "react-router-dom";
import { DescribeTripPanel } from "@/modules/trips/components/create/DescribeTripPanel";
import { SimpleTripForm } from "@/modules/trips/components/create/SimpleTripForm";

type Mode = "setup" | "describe";

export function NewTripPageContent() {
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get("mode") === "describe" ? "describe" : "setup";
  const cardBg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const muted = useColorModeValue("gray.500", "gray.400");

  return (
    <Box maxW="4xl">
      <Heading size="lg" mb={1}>
        New trip
      </Heading>
      <Text color={muted} mb={5}>
        Just the basics — places, stays, bookings and the day-by-day plan come next.
      </Text>

      <ButtonGroup size="sm" isAttached variant="outline" mb={5}>
        <Button leftIcon={<FiEdit3 />} colorScheme={mode === "setup" ? "brand" : "gray"} variant={mode === "setup" ? "solid" : "outline"} onClick={() => setParams({}, { replace: true })}>
          Set it up
        </Button>
        <Button
          leftIcon={<FiZap />}
          colorScheme={mode === "describe" ? "brand" : "gray"}
          variant={mode === "describe" ? "solid" : "outline"}
          onClick={() => setParams({ mode: "describe" }, { replace: true })}
        >
          Describe it in a sentence
        </Button>
      </ButtonGroup>

      {mode === "setup" ? (
        <SimpleTripForm />
      ) : (
        <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="xl" p={{ base: 4, md: 6 }}>
          <Text fontSize="sm" color={muted} mb={4}>
            Where, how long, when and what you enjoy — any country, one city or several. AI sets up the cities, dates
            and interests; you can change anything afterwards.
          </Text>
          <DescribeTripPanel rows={5} />
        </Box>
      )}
    </Box>
  );
}
