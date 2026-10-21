import { Box, Flex, HStack, Icon, LinkBox, LinkOverlay, Text } from "@chakra-ui/react";
import { FiArrowRight, FiCalendar, FiMap } from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import { PhotoFallback } from "@/components/ui";
import { MemberCount, ProgressBar, RouteArt, TripStatusPill } from "@/components/ui/app";
import { formatDateRange, tripRouteLabel, tripWhenLabel } from "@/components/ui/app-format";
import { TripActionsMenu } from "@/modules/trips/components/TripActionsMenu";
import type { Trip } from "@/modules/trips/types/trip.types";
import { getTripStages } from "@/modules/trips/utils/trip-stage";

interface TripCardProps {
  trip: Trip;
  /** Owner gets Delete; members get Leave. */
  isOwner: boolean;
  /** grid: route-art card · compact: phone row with a tile · row: list row. */
  variant?: "grid" | "compact" | "row";
  /** What the footer line says: the suggested next step, or just "Open trip →". */
  footer?: "next" | "open";
  /** Hide the ⋯ menu (e.g. the dashboard's Recent list). */
  hideActions?: boolean;
}

function lowerFirst(s: string) {
  return s ? s[0].toLowerCase() + s.slice(1) : s;
}

function tripProgress(trip: Trip) {
  const finished = trip.status === "completed";
  let pct = 100;
  let next: string | null = null;
  if (!finished) {
    try {
      const summary = getTripStages(trip, trip.planInfo);
      pct = (summary.doneCount / summary.stages.length) * 100;
      next = summary.next ? summary.next.text : null;
    } catch {
      pct = 0;
    }
  }
  return { pct, next, finished };
}

/** The ⋯ menu sits above the card-wide link; styled like the design's ghost square button. */
function Actions({ trip, isOwner }: { trip: Trip; isOwner: boolean }) {
  return (
    <Box
      position="relative"
      zIndex={1}
      flexShrink={0}
      mr="-6px"
      sx={{ "& > button": { bg: "transparent", borderColor: "transparent", w: "36px", h: "36px", minW: "36px", borderRadius: "full", color: "tx2" }, "& > button:hover": { bg: "sunk" } }}
    >
      <TripActionsMenu trip={trip} isOwner={isOwner} />
    </Box>
  );
}

export function TripCard({ trip, isOwner, variant = "grid", footer = "open", hideActions }: TripCardProps) {
  const { pct, next, finished } = tripProgress(trip);
  const route = tripRouteLabel(trip);
  const href = `/trips/${trip.id}`;
  const footerText = finished ? "Trip finished" : footer === "next" && next ? `Next: ${lowerFirst(next)}` : null;

  if (variant === "compact") {
    return (
      <LinkBox as="article" display="flex" gap="12px" p="12px" bg="sf" borderWidth="1px" borderColor="ln" borderRadius="xl" transition="border-color .12s" _hover={{ borderColor: "ln2" }}>
        <PhotoFallback seed={trip.id} icon={FiMap} iconSize={20} w="64px" h="64px" borderRadius="12px" flexShrink={0} />
        <Flex direction="column" gap="4px" flex={1} minW={0}>
          <LinkOverlay as={RouterLink} to={href} fontWeight={600} fontSize="15px" lineHeight="20px" noOfLines={1}>
            {trip.title}
          </LinkOverlay>
          <Text fontSize="13px" lineHeight="18px" color="tx3" noOfLines={1} className="num">
            {[tripWhenLabel(trip), route].filter(Boolean).join(" · ")}
          </Text>
          <ProgressBar value={pct} label={`${trip.title} progress`} />
          <Text fontSize="12px" lineHeight="16px" color="tx3" noOfLines={1}>
            {footerText ?? "Open trip →"}
          </Text>
        </Flex>
      </LinkBox>
    );
  }

  if (variant === "row") {
    return (
      <LinkBox as="article" display="flex" alignItems="center" gap={3} px={4} py={3} minH="64px" _hover={{ bg: "sf2" }}>
        <PhotoFallback seed={trip.id} icon={FiMap} iconSize={18} w="44px" h="44px" borderRadius="10px" flexShrink={0} />
        <Flex direction="column" flex={1} minW={0}>
          <LinkOverlay as={RouterLink} to={href} fontWeight={600} fontSize="15px" lineHeight="20px" noOfLines={1}>
            {trip.title}
          </LinkOverlay>
          <Text fontSize="13px" lineHeight="18px" color="tx3" noOfLines={1} className="num">
            {formatDateRange(trip.startDate, trip.endDate)}
            {route ? ` · ${route}` : ""}
          </Text>
        </Flex>
        {!hideActions && (
          <Box w="120px" display={{ base: "none", md: "block" }} flexShrink={0}>
            <ProgressBar value={pct} label={`${trip.title} progress`} />
          </Box>
        )}
        <TripStatusPill trip={trip} />
        {!hideActions && <Actions trip={trip} isOwner={isOwner} />}
      </LinkBox>
    );
  }

  return (
    <LinkBox
      as="article"
      display="flex"
      flexDirection="column"
      bg="sf"
      borderWidth="1px"
      borderColor="ln"
      borderRadius="xl"
      transition="border-color .12s"
      _hover={{ borderColor: "ln2" }}
    >
      {/* No overflow:hidden on the card — it would clip the ⋯ menu — so the art rounds itself. */}
      <RouteArt seed={trip.id} label={route} borderTopRadius="13px" />
      <Flex direction="column" gap={2} pt="14px" px={4} pb={4}>
        <Flex justify="space-between" align="center" gap={2} minH="36px">
          <LinkOverlay as={RouterLink} to={href} fontWeight={600} fontSize="17px" lineHeight="24px" noOfLines={1}>
            {trip.title}
          </LinkOverlay>
          {!hideActions && <Actions trip={trip} isOwner={isOwner} />}
        </Flex>
        <HStack spacing={2} fontSize="13px" lineHeight="18px" color="tx3" flexWrap="wrap" rowGap={1} className="num">
          <HStack spacing="6px">
            <Icon as={FiCalendar} boxSize="16px" />
            <Text>{tripWhenLabel(trip)}</Text>
          </HStack>
          <TripStatusPill trip={trip} />
        </HStack>
        <ProgressBar value={pct} label={`${trip.title} progress`} />
        <Flex justify="space-between" align="center" gap={2} fontSize="12px" lineHeight="16px" minH="36px">
          <Text color="tx3" noOfLines={1}>
            {footerText ?? (
              <>
                Open trip <Icon as={FiArrowRight} boxSize="12px" verticalAlign="-1px" />
              </>
            )}
          </Text>
          <MemberCount trip={trip} />
        </Flex>
      </Flex>
    </LinkBox>
  );
}
