import { Box, Button, Divider, Flex, Heading, HStack, Icon, Link, SimpleGrid, Stack, Text, Textarea } from "@chakra-ui/react";
import { useState } from "react";
import type { IconType } from "react-icons";
import { FiArrowRight, FiCheck, FiCornerUpLeft, FiEdit2, FiGlobe, FiMap, FiMapPin, FiNavigation, FiShield, FiUsers } from "react-icons/fi";
import { LuBedDouble, LuSparkles, LuWallet } from "react-icons/lu";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { BRAND_NAME, BrandLogo } from "@/components/brand/BrandLogo";
import { Overline, Pill, SurfaceCard } from "@/components/ui";
import { IllustratedMap } from "./IllustratedMap";
import { savePendingTripPrompt } from "../pending-prompt";
import { useApkInfo } from "@/components/layout/useApkInfo";

const STAGES: { icon: IconType; title: string; text: string }[] = [
  { icon: LuSparkles, title: "Set up", text: "Say it in a sentence or fill a short form." },
  { icon: FiMapPin, title: "Pick places", text: "Discover by interest, vote as a group." },
  { icon: LuBedDouble, title: "Sort stays", text: "Every day starts and ends where you sleep." },
  { icon: FiMap, title: "Generate plan", text: "Timed days with travel between stops." },
  { icon: FiEdit2, title: "Refine", text: "Drag, lock, pick meals, ask AI. Undo anything." },
  { icon: LuWallet, title: "Book & budget", text: "Bookings set real travel times; split costs." },
  { icon: FiNavigation, title: "Travel", text: "Phone-first Today view, works offline." },
];

const TICKS = ["Free to start", "AI is optional", "Works offline on the trip"];


/** Illustration only: a sample day on a drawn map, the way the planner shows a real one. */
function HeroMap() {
  return (
    <Box position="relative" h={{ base: "380px", md: "480px", xl: "560px" }} borderRadius="24px" overflow="hidden" borderWidth="1px" borderColor="border.line" boxShadow="raised">
      <IllustratedMap
        height={560}
        position="absolute"
        inset={0}
        pins={[
          { x: 150, y: 150, label: "1" },
          { x: 260, y: 240, label: "2" },
          { x: 360, y: 180, label: "3" },
          { x: 440, y: 300, label: "4" },
        ]}
        stay={{ x: 210, y: 330 }}
        label="Example: one day of a trip drawn on a map — four numbered stops joined by a route, and the hotel"
      />
      <SurfaceCard raised position="absolute" left={{ base: 3, md: 6 }} bottom={{ base: 3, md: 6 }} w={{ base: "calc(100% - 24px)", sm: "300px" }} p="14px" aria-hidden>
        <Text fontFamily="heading" fontWeight={600} fontSize="18px">
          Day 2 · Tue 6 Oct
        </Text>
        <Text fontSize="12px" color="fg.muted" mt={2}>
          4 stops · 1 h 05 travel
        </Text>
        <Divider my={2} />
        <Stack spacing={2}>
          {[
            ["09:15", "Amber Fort"],
            ["13:30", "Jantar Mantar"],
            ["15:00", "City Palace"],
          ].map(([t, n]) => (
            <HStack key={n} spacing={2}>
              <Text w="44px" fontSize="12px" fontWeight={600}>
                {t}
              </Text>
              <Text fontWeight={600}>{n}</Text>
            </HStack>
          ))}
        </Stack>
      </SurfaceCard>
      <SurfaceCard raised position="absolute" right={{ base: 3, md: 6 }} top={{ base: 3, md: 6 }} px={3} py={2} display={{ base: "none", sm: "flex" }} alignItems="center" gap={2} aria-hidden>
        <Icon as={FiCornerUpLeft} boxSize="15px" />
        <Text fontSize="12px" fontWeight={600}>
          Undo: Move Amber Fort to Day 3
        </Text>
      </SurfaceCard>
    </Box>
  );
}

export function LandingPage() {
  const apk = useApkInfo();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");

  const start = () => {
    const text = prompt.trim();
    if (text) savePendingTripPrompt(text);
    const next = text ? "/trips/new?mode=describe" : "/trips/new";
    navigate(`/login?callbackUrl=${encodeURIComponent(next)}`);
  };

  const navLink = { fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "3px", _hover: { color: "accent.text" } } as const;

  return (
    <Flex direction="column" minH="100vh" bg="bg.canvas" color="fg.default" overflowX="clip">
      <Flex as="header" align="center" justify="space-between" h="76px" px={{ base: "16px", md: "32px", xl: "64px" }} flexShrink={0} gap={4}>
        <RouterLink to="/" aria-label={`${BRAND_NAME} home`}>
          <BrandLogo />
        </RouterLink>
        <HStack as="nav" aria-label="Site" spacing={6} display={{ base: "none", md: "flex" }}>
          <Link href="#how-it-works" {...navLink}>
            How it works
          </Link>
          <Link href="#collaboration" {...navLink}>
            Collaboration
          </Link>
          <Link href="#about-ai" {...navLink}>
            About AI
          </Link>
        </HStack>
        <HStack spacing={2}>
          <Button as={RouterLink} to="/login">
            Sign in
          </Button>
        </HStack>
      </Flex>

      <Box as="main" flex={1}>
        <Flex
          as="section"
          direction={{ base: "column", lg: "row" }}
          gap="32px"
          px={{ base: "16px", md: "32px", xl: "64px" }}
          pt={{ base: "24px", md: "48px" }}
          pb="40px"
          align={{ lg: "center" }}
        >
          <Stack spacing="24px" w={{ base: "full", lg: "520px", xl: "600px" }} flexShrink={0}>
            <Pill tone="accent" icon={FiGlobe} alignSelf="flex-start">
              Works in any country, any currency
            </Pill>
            <Heading as="h1" fontSize={{ base: "40px", md: "56px", xl: "64px" }} lineHeight={1.02}>
              One calm place to plan the whole trip.
            </Heading>
            <Text color="fg.muted" fontSize={{ base: "17px", md: "19px" }} maxW="520px">
              From &ldquo;I want to go somewhere&rdquo; to &ldquo;I&rsquo;m on the trip today&rdquo;. Pick places, sort stays, get a day-by-day
              plan on a map, then take it with you.
            </Text>
            <SurfaceCard
              raised
              as="form"
              p="14px"
              maxW="560px"
              onSubmit={(e: React.FormEvent) => {
                e.preventDefault();
                start();
              }}
            >
              <label htmlFor="hero-describe">
                <Overline mb={3}>Describe your trip</Overline>
              </label>
              <Textarea
                id="hero-describe"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                placeholder="10 days in Japan in April — Tokyo, Kyoto, Osaka; we love food and temples"
                fontSize="16px"
                variant="unstyled"
                resize="none"
                px={0.5}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) start();
                }}
              />
              <Flex mt={3} justify="space-between" align="center" gap={3} wrap="wrap">
                <Link as={RouterLink} to={`/login?callbackUrl=${encodeURIComponent("/trips/new")}`} fontSize="12px" color="fg.muted">
                  Or set it up yourself, step by step
                </Link>
                <Button type="submit" size="lg" leftIcon={<FiArrowRight />}>
                  Start planning
                </Button>
              </Flex>
            </SurfaceCard>
            <HStack spacing="16px" fontSize="12px" color="fg.muted" flexWrap="wrap" rowGap={1}>
              {TICKS.map((t) => (
                <HStack key={t} spacing={1.5}>
                  <Icon as={FiCheck} boxSize="14px" />
                  <Text>{t}</Text>
                </HStack>
              ))}
            </HStack>
          </Stack>
          <Box flex={1} minW={0}>
            <HeroMap />
          </Box>
        </Flex>

        <Stack as="section" id="how-it-works" spacing="24px" px={{ base: "16px", md: "32px", xl: "64px" }} py="32px" scrollMarginTop="16px">
          <Stack spacing="8px" maxW="640px">
            <Overline>How it works</Overline>
            <Heading as="h2" fontSize={{ base: "28px", md: "36px" }} lineHeight={1.3}>
              Always one clear next step, never a wizard.
            </Heading>
          </Stack>
          <SimpleGrid columns={{ base: 1, sm: 2, md: 4, xl: 7 }} spacing="12px">
            {STAGES.map((s, i) => (
              <SurfaceCard key={s.title} p="16px">
                <Icon as={s.icon} boxSize="22px" color="accent" />
                <Text fontWeight={600} mt="8px">
                  {i + 1} · {s.title}
                </Text>
                <Text fontSize="12px" color="fg.muted" mt="8px">
                  {s.text}
                </Text>
              </SurfaceCard>
            ))}
          </SimpleGrid>
        </Stack>

        <SimpleGrid as="section" columns={{ base: 1, md: 2 }} spacing="16px" px={{ base: "16px", md: "32px", xl: "64px" }} pt="24px" pb="40px">
          <SurfaceCard id="collaboration" p="24px" scrollMarginTop="16px">
            <Icon as={FiUsers} boxSize="24px" color="accent" />
            <Heading as="h3" fontSize="24px" mt="10px">
              Plan together
            </Heading>
            <Text color="fg.muted" mt="10px">
              Invite family with one link. Editors change the plan; viewers can still vote with hearts and comment on any stop.
            </Text>
          </SurfaceCard>
          <SurfaceCard id="about-ai" p="24px" scrollMarginTop="16px">
            <Icon as={FiShield} boxSize="24px" color="accent" />
            <Heading as="h3" fontSize="24px" mt="10px">
              Honest about AI
            </Heading>
            <Text color="fg.muted" mt="10px">
              Bring your own OpenAI or Gemini key, or use a shared one. Without a key you still get the full planner &mdash; AI only adds
              shortcuts.
            </Text>
          </SurfaceCard>
        </SimpleGrid>
      </Box>

      <Flex
        as="footer"
        justify="space-between"
        align="center"
        gap={3}
        wrap="wrap"
        px={{ base: "16px", md: "32px", xl: "64px" }}
        py="24px"
        borderTopWidth="1px"
        borderColor="border.line"
        fontSize="12px"
        color="fg.muted"
      >
        <Text>
          &copy; {BRAND_NAME}
        </Text>
        <HStack spacing={4}>
          <Link as={RouterLink} to="/login" textDecoration="underline">
            Sign in
          </Link>
          {apk && (
            <Link href={apk.url} download="trippin.apk" title={`Android app, version ${apk.version}`} textDecoration="underline">
              Download app
            </Link>
          )}
        </HStack>
      </Flex>
    </Flex>
  );
}
