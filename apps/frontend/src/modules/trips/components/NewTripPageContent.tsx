import { Box, Flex, Grid, Heading, HStack, Icon, Stack, Text } from "@chakra-ui/react";
import { FiCalendar, FiEdit2, FiMap, FiSliders } from "react-icons/fi";
import { LuSparkles } from "react-icons/lu";
import { useSearchParams } from "react-router-dom";
import { Overline, Segmented, SurfaceCard } from "@/components/ui";
import { AiStatusChip } from "@/components/layout/Navbar";
import { DescribeTripPanel } from "@/modules/trips/components/create/DescribeTripPanel";
import { SimpleTripForm } from "@/modules/trips/components/create/SimpleTripForm";

type Mode = "setup" | "describe";

const AI_GETS = [
  { icon: FiMap, title: "Cities in order", text: "One city or several, with days in each and travel days between them." },
  { icon: FiCalendar, title: "Real dates", text: "From the month or dates you mention — or two weeks from now." },
  { icon: FiSliders, title: "Your style", text: "Pace, getting around, budget and interests picked up from your words." },
];

function Header({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  return (
    <Flex justify="space-between" align={{ base: "center", md: "flex-start" }} gap="16px" wrap="wrap">
      <Box>
        <Heading as="h1" fontSize="22px" lineHeight="28px">
          New trip
        </Heading>
        <Text color="tx2" fontSize="14px" lineHeight="20px" mt={1} display={{ base: "none", md: "block" }}>
          Everything here can be changed later.
        </Text>
      </Box>
      <Segmented<Mode>
        value={mode}
        onChange={onMode}
        aria-label="How to start"
        options={[
          {
            value: "setup",
            icon: FiEdit2,
            label: (
              <>
                <Box as="span" display={{ base: "none", sm: "inline" }}>
                  Set it up
                </Box>
                <Box as="span" display={{ base: "inline", sm: "none" }}>
                  Set up
                </Box>
              </>
            ),
          },
          {
            value: "describe",
            icon: LuSparkles,
            label: (
              <>
                <Box as="span" display={{ base: "none", sm: "inline" }}>
                  Describe it in a sentence
                </Box>
                <Box as="span" display={{ base: "inline", sm: "none" }}>
                  Sentence
                </Box>
              </>
            ),
          },
        ]}
        sx={{ "& > button": { px: { base: "10px", md: "14px" } }, "& svg": { display: { base: "none", sm: "block" } } }}
      />
    </Flex>
  );
}

export function NewTripPageContent() {
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get("mode") === "describe" ? "describe" : "setup";
  const setMode = (m: Mode) => setParams(m === "describe" ? { mode: "describe" } : {}, { replace: true });
  const header = <Header mode={mode} onMode={setMode} />;

  if (mode === "setup") return <SimpleTripForm header={header} />;

  return (
    <Grid
      templateColumns={{ base: "minmax(0, 1fr)", xl: "minmax(0, 1fr) clamp(360px, 32vw, 460px)" }}
      columnGap={{ xl: "2.5rem" }}
      mr={{ xl: "-2rem" }}
      mt={{ xl: "-1.5rem" }}
      mb={{ lg: "-3rem" }}
      alignItems="start"
    >
      <Stack spacing={{ base: "14px", md: "20px" }} minW={0} pt={{ xl: "24px" }} pb={{ lg: "48px" }}>
        {header}
        <SurfaceCard as="section" p={{ base: 4, md: 5 }} aria-labelledby="describe-title">
          <Flex justify="space-between" align="center" gap={2} mb={3}>
            <HStack spacing={3}>
              <Flex w="36px" h="36px" borderRadius="md" bg="acSoft" color="ac" align="center" justify="center" flexShrink={0}>
                <Icon as={LuSparkles} boxSize="18px" />
              </Flex>
              <Heading as="h2" id="describe-title" fontSize="17px" lineHeight="24px">
                Tell us about your trip
              </Heading>
            </HStack>
            <AiStatusChip />
          </Flex>
          <Text fontSize="13px" lineHeight="18px" color="tx3" mb={3}>
            Where, how long, when and what you enjoy — any country. You can change everything afterwards.
          </Text>
          <DescribeTripPanel variant="page" rows={6} />
        </SurfaceCard>

        <SurfaceCard p={5} display={{ base: "block", xl: "none" }}>
          <AiGets />
        </SurfaceCard>
      </Stack>

      <Flex
        as="aside"
        aria-label="What AI sets up"
        display={{ base: "none", xl: "flex" }}
        direction="column"
        position="sticky"
        top="72px"
        h="calc(100vh - 72px)"
        overflowY="auto"
        bg="sf"
        borderLeftWidth="1px"
        borderColor="ln"
        px={6}
        py={5}
      >
        <AiGets />
      </Flex>
    </Grid>
  );
}

function AiGets() {
  return (
    <Stack spacing="20px">
      <Overline>What AI sets up for you</Overline>
      {AI_GETS.map((g) => (
        <HStack key={g.title} align="flex-start" spacing="12px">
          <Flex w="36px" h="36px" borderRadius="md" bg="acSoft" color="ac" align="center" justify="center" flexShrink={0}>
            <Icon as={g.icon} boxSize="18px" />
          </Flex>
          <Box>
            <Text fontWeight={600} fontSize="15px" lineHeight="20px">
              {g.title}
            </Text>
            <Text fontSize="13px" lineHeight="18px" color="tx2" mt="2px">
              {g.text}
            </Text>
          </Box>
        </HStack>
      ))}
      <Text fontSize="12px" color="tx3">
        Uses the OpenAI or Gemini key from your Profile (or a shared one). Without one, only simple requests like &ldquo;3 days in Jaipur&rdquo;
        are understood.
      </Text>
    </Stack>
  );
}
