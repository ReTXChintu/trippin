import { Box, Button, Collapse, Flex, HStack, Icon, Stack, Text, useDisclosure } from "@chakra-ui/react";
import { FiCheck, FiEye, FiFlag, FiLock, FiNavigation } from "react-icons/fi";
import { Pill, PhotoFallback, type Tone } from "@/components/ui";
import { categoryIcon } from "@/components/ui/plan.utils";
import type { ItineraryStop } from "@/modules/itinerary/types";
import { formatDuration } from "@/modules/itinerary/utils/plan.utils";
import { isOpenMeal, type FocusState } from "./today.utils";

const PILL_TONE: Record<FocusState["tone"], Tone> = { now: "accent", next: "accent", preview: "neutral", late: "warn" };

/** The big "Now / Next" card on Today: stop, countdown, Directions / Details, Mark done / Skip. */
export function NowCard({
  stop,
  state,
  directionsUrl,
  canEdit,
  busy,
  disabled,
  onDone,
  onSkip,
}: {
  stop: ItineraryStop;
  state: FocusState;
  directionsUrl?: string;
  canEdit: boolean;
  busy: boolean;
  /** Buttons stay visible but can't be pressed (e.g. offline). */
  disabled?: boolean;
  onDone: () => void;
  onSkip: () => void;
}) {
  const details = useDisclosure();
  const late = state.tone === "late";
  const name = isOpenMeal(stop) ? `${stop.placeName} — pick somewhere nearby` : stop.placeName;
  const meta = [stop.category, formatDuration(stop.visitDurationMinutes), stop.locked && "locked"].filter(Boolean).join(" · ");
  const tips = stop.visitIntel?.tips ?? [];

  return (
    <Box
      as="section"
      aria-label={`${state.pill}: ${stop.placeName}`}
      bg="bg.surface"
      borderWidth="2px"
      borderColor={late ? "warn" : "accent"}
      borderRadius="xl"
      boxShadow="raised"
      p="18px"
    >
      <Stack spacing="12px">
        <Flex justify="space-between" align="center" gap={2}>
          <Pill tone={PILL_TONE[state.tone]} icon={FiNavigation}>
            {state.pill}
          </Pill>
          <Text fontSize="12px" color="fg.muted" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {stop.arrivalTime} – {stop.departureTime}
          </Text>
        </Flex>

        <Flex gap="12px" align="center">
          <PhotoFallback seed={stop.placeName} icon={categoryIcon(stop.category, stop.stopType)} iconSize={26} w="64px" h="64px" borderRadius="14px" flexShrink={0} aria-hidden />
          <Box minW={0}>
            <Text as="h2" fontFamily="heading" fontWeight={600} fontSize={{ base: "24px", md: "26px" }} lineHeight={1.15} letterSpacing="-0.01em" noOfLines={2}>
              {name}
            </Text>
            {meta && (
              <HStack spacing={1} fontSize="12px" color="fg.muted" mt="2px">
                {stop.locked && <Icon as={FiLock} boxSize="11px" />}
                <Text>{meta}</Text>
              </HStack>
            )}
          </Box>
        </Flex>

        <Flex justify="space-between" align="center" gap={3} bg="bg.subtle" borderRadius="12px" px="14px" py="10px">
          <Box minW={0}>
            <Text fontSize="12px" letterSpacing="0.02em" color="fg.muted">
              {state.countdownLabel}
            </Text>
            <Text fontFamily="heading" fontWeight={600} fontSize={{ base: "26px", md: "28px" }} lineHeight={1.2} color={late ? "warn" : "fg.default"} sx={{ fontVariantNumeric: "tabular-nums" }}>
              {state.countdownValue}
            </Text>
          </Box>
          {state.sideLabel && (
            <Box textAlign="right" flexShrink={0}>
              <Text fontSize="12px" letterSpacing="0.02em" color="fg.muted">
                {state.sideLabel}
              </Text>
              <Text fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
                {state.sideValue}
              </Text>
            </Box>
          )}
        </Flex>

        {state.detail && state.tone !== "late" && (
          <Text fontSize="13px" fontWeight={500}>
            {state.detail}
          </Text>
        )}

        {stop.warnings && stop.warnings.length > 0 && (
          <Flex gap="6px" wrap="wrap">
            {stop.warnings.map((w) => (
              <Pill key={w} tone="warn" whiteSpace="normal" h="auto" minH="24px" py="2px">
                {w}
              </Pill>
            ))}
          </Flex>
        )}

        <Flex gap={2}>
          {directionsUrl && (
            <Button as="a" href={directionsUrl} target="_blank" rel="noopener noreferrer" size="xl" h="52px" borderRadius="lg" flex={1} leftIcon={<FiNavigation />}>
              Directions
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            h="52px"
            flex={directionsUrl ? undefined : 1}
            leftIcon={<FiEye />}
            onClick={details.onToggle}
            aria-expanded={details.isOpen}
          >
            Details
          </Button>
        </Flex>

        <Collapse in={details.isOpen} animateOpacity>
          <Stack spacing={2} fontSize="13px" bg="bg.subtle" borderRadius="12px" px="14px" py="12px">
            <Text>
              <Text as="span" color="fg.muted">
                Planned:{" "}
              </Text>
              {stop.arrivalTime}–{stop.departureTime} · {formatDuration(stop.visitDurationMinutes)} here
              {stop.travelDurationMinutes > 0 && ` · ${formatDuration(stop.travelDurationMinutes)} to get there`}
              {stop.travelDistanceKm ? ` (${stop.travelDistanceKm} km)` : ""}
            </Text>
            {stop.fixedStartTime && (
              <Text>
                <Text as="span" color="fg.muted">
                  Fixed start:{" "}
                </Text>
                {stop.fixedStartTime}
              </Text>
            )}
            {stop.openingHoursToday && (
              <Text>
                <Text as="span" color="fg.muted">
                  Open today:{" "}
                </Text>
                {stop.openingHoursToday}
              </Text>
            )}
            {stop.visitIntel?.bestTime && (
              <Text>
                <Text as="span" color="fg.muted">
                  Best time:{" "}
                </Text>
                {stop.visitIntel.bestTime}
              </Text>
            )}
            {stop.visitIntel?.why && <Text>{stop.visitIntel.why}</Text>}
            {stop.notes && <Text>Note: {stop.notes}</Text>}
            {stop.aiNotes && <Text color="fg.muted">{stop.aiNotes}</Text>}
            {tips.map((t) => (
              <Text key={t}>· {t}</Text>
            ))}
          </Stack>
        </Collapse>

        {canEdit && (
          <Flex gap={2}>
            <Button variant="outline" size="lg" h="48px" flex={1} color="success" leftIcon={<FiCheck />} onClick={onDone} isLoading={busy} isDisabled={disabled}>
              Mark done
            </Button>
            <Button variant="outline" size="lg" h="48px" flex={1} leftIcon={<FiFlag />} onClick={onSkip} isDisabled={busy || disabled}>
              Skip
            </Button>
          </Flex>
        )}
      </Stack>
    </Box>
  );
}
