import { Box, Flex, Icon, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiMap, FiUsers } from "react-icons/fi";
import { LuKeyRound } from "react-icons/lu";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { MobileAppDownloadButton } from "@/components/layout/MobileAppDownloadButton";
import { SurfaceCard } from "@/components/ui";
import { IllustratedMap } from "@/modules/landing/components/IllustratedMap";

/**
 * The suite's sign-in layout (design system 6.2): two panels in a wrapping row. The brand panel
 * (sf2, 1 1 520px) comes first; the form panel (1 1 480px) centres a column of at most 440px.
 * Below ~1000px they stack, and on phones the brand panel drops its product glimpse.
 */
export function AuthSplit({ brand, children, topRight }: { brand: ReactNode; children: ReactNode; topRight?: ReactNode }) {
  return (
    <Flex minH="100vh" bg="bg" flexWrap="wrap">
      <Flex
        as="section"
        aria-label="About Trippin'"
        flex="1 1 520px"
        minW={0}
        direction="column"
        gap={8}
        bg="sf2"
        borderRightWidth={{ base: 0, lg: "1px" }}
        borderBottomWidth={{ base: "1px", lg: 0 }}
        borderColor="ln"
        px={{ base: 4, md: 12 }}
        py={{ base: 6, md: 10 }}
      >
        {brand}
      </Flex>
      <Flex as="main" flex="1 1 480px" minW={0} position="relative" direction="column" justify="center" align="center" px={{ base: 4, md: 12 }} py={{ base: 6, md: 10 }}>
        {topRight && (
          <Box position="absolute" top={4} right={4}>
            {topRight}
          </Box>
        )}
        <Stack w="full" maxW="440px" spacing={6} pt={topRight ? { base: 10, md: 0 } : 0}>
          {children}
        </Stack>
      </Flex>
    </Flex>
  );
}

/** The auth card (6.2): surface, hairline, radius 14, padding 32 (20 on phones), gap 20. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <SurfaceCard p={{ base: 5, md: 8 }} display="flex" flexDirection="column" gap={5}>
      {children}
    </SurfaceCard>
  );
}

function Benefit({ icon, title, text }: { icon: IconType; title: string; text: string }) {
  return (
    <Flex gap={3} align="flex-start">
      <Flex w="36px" h="36px" borderRadius="md" bg="acSoft" color="ac" align="center" justify="center" flexShrink={0}>
        <Icon as={icon} boxSize="18px" />
      </Flex>
      <Box>
        <Text fontWeight={600} fontSize="15px" lineHeight="20px">
          {title}
        </Text>
        <Text fontSize="13px" lineHeight="18px" color="tx2" mt="2px">
          {text}
        </Text>
      </Box>
    </Flex>
  );
}

/** Brand panel for the sign-in page: logo, a 40/48 headline, three benefits and a product glimpse. */
function SignInBrand() {
  return (
    <>
      <Box as={Link} to="/" alignSelf="flex-start" aria-label="Trippin' home">
        <BrandLogo />
      </Box>
      <Text as="p" fontWeight={600} fontSize={{ base: "28px", md: "40px" }} lineHeight={{ base: "34px", md: "48px" }} letterSpacing="-0.02em" maxW="560px">
        One calm place to plan the whole trip.
      </Text>
      <Stack spacing={4} maxW="560px">
        <Benefit icon={FiMap} title="Places, stays and a plan on a map" text="Timed days with travel between stops, ready to take with you." />
        <Benefit icon={FiUsers} title="Everyone sees the same plan" text="Editors change it; viewers vote and comment on any stop." />
        <Benefit icon={LuKeyRound} title="One account for the suite" text="The same sign-in works for Trippin, SpendLog and InFrame." />
      </Stack>
      <Box
        position="relative"
        display={{ base: "none", md: "block" }}
        h="260px"
        maxW="560px"
        borderRadius="xl"
        overflow="hidden"
        borderWidth="1px"
        borderColor="ln"
        aria-hidden
      >
        <IllustratedMap
          height={260}
          position="absolute"
          inset={0}
          pins={[
            { x: 200, y: 90, label: "1" },
            { x: 330, y: 150, label: "2" },
            { x: 470, y: 110, label: "3" },
          ]}
          stay={{ x: 260, y: 200 }}
        />
        <SurfaceCard raised position="absolute" left={4} bottom={4} px="14px" py={3}>
          <Text fontWeight={600} fontSize="15px" lineHeight="20px">
            Day 2 · 3 stops
          </Text>
          <Text fontSize="12px" lineHeight="16px" color="tx3" className="num">
            1 h 05 travel · back at the hotel by 6:30 pm
          </Text>
        </SurfaceCard>
      </Box>
    </>
  );
}

/** The sign-in page: brand panel and the auth card. */
export function AuthPageWrapper({ children }: { children: ReactNode }) {
  return (
    <AuthSplit brand={<SignInBrand />} topRight={<MobileAppDownloadButton />}>
      <AuthCard>{children}</AuthCard>
    </AuthSplit>
  );
}
