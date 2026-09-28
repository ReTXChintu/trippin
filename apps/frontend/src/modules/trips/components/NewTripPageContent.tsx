import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiCalendar, FiEdit3, FiMap, FiSliders, FiZap } from "react-icons/fi";
import { useSearchParams } from "react-router-dom";
import { DescribeTripPanel } from "@/modules/trips/components/create/DescribeTripPanel";
import { SimpleTripForm } from "@/modules/trips/components/create/SimpleTripForm";

type Mode = "setup" | "describe";

const AI_GETS = [
  { icon: FiMap, title: "Cities in order", text: "One city or several, with days in each and travel days between them." },
  { icon: FiCalendar, title: "Real dates", text: "From the month or dates you mention — or two weeks from now." },
  { icon: FiSliders, title: "Your style", text: "Pace, getting around, budget and interests picked up from your words." },
];

export function NewTripPageContent() {
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get("mode") === "describe" ? "describe" : "setup";
  const cardBg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const muted = useColorModeValue("gray.500", "gray.400");
  const accentBg = useColorModeValue("brand.50", "whiteAlpha.100");

  return (
    <Box>
      <Flex justify="space-between" align={{ base: "flex-start", md: "flex-end" }} gap={4} mb={6} direction={{ base: "column", md: "row" }}>
        <Box>
          <Heading size="lg" mb={1}>
            New trip
          </Heading>
          <Text color={muted}>Just the basics — places, stays, bookings and the day-by-day plan come next.</Text>
        </Box>
        <ButtonGroup size="sm" isAttached variant="outline" flexShrink={0}>
          <Button
            leftIcon={<FiEdit3 />}
            colorScheme={mode === "setup" ? "brand" : "gray"}
            variant={mode === "setup" ? "solid" : "outline"}
            onClick={() => setParams({}, { replace: true })}
          >
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
      </Flex>

      {mode === "setup" ? (
        <SimpleTripForm />
      ) : (
        <Grid templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) 400px", "2xl": "minmax(0, 1fr) 460px" }} gap={6} alignItems="start">
          <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="xl" p={{ base: 4, md: 8 }}>
            <Heading size="md" mb={1}>
              Tell us about your trip
            </Heading>
            <Text fontSize="sm" color={muted} mb={5}>
              Where, how long, when and what you enjoy — any country. You can change everything afterwards.
            </Text>
            <DescribeTripPanel rows={8} />
          </Box>
          <Box bg={accentBg} borderRadius="xl" p={6}>
            <Text fontSize="xs" textTransform="uppercase" letterSpacing="wider" color={muted} fontWeight="semibold" mb={4}>
              What AI sets up for you
            </Text>
            <Stack spacing={5}>
              {AI_GETS.map((g) => (
                <HStack key={g.title} align="flex-start" spacing={3}>
                  <Flex w={9} h={9} borderRadius="lg" bg="brand.500" color="white" align="center" justify="center" flexShrink={0}>
                    <Icon as={g.icon} />
                  </Flex>
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm">
                      {g.title}
                    </Text>
                    <Text fontSize="sm" color={muted}>
                      {g.text}
                    </Text>
                  </Box>
                </HStack>
              ))}
            </Stack>
            <Text fontSize="xs" color={muted} mt={6}>
              Uses the OpenAI or Gemini key from your Profile. Without one, only simple requests like “3 days in Jaipur” are understood.
            </Text>
          </Box>
        </Grid>
      )}
    </Box>
  );
}
