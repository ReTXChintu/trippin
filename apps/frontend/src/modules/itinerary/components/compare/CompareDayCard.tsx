import { Box, Flex, Icon, Stack, Text } from "@chakra-ui/react";
import { FiAlertTriangle } from "react-icons/fi";
import { DayBadge, Pill } from "@/components/ui";
import type { ItineraryDayWithDistance } from "@/modules/itinerary/types";
import { formatDayDate } from "@/modules/itinerary/utils/plan.utils";
import { routeLine, stopsLabel } from "./compare.utils";

/** A day on the Compare page: day square, title, "N stops · km", the route, optional difference pills. */
export function CompareDayCard({
  day,
  chosen,
  side,
  differences,
  showCity,
}: {
  day?: ItineraryDayWithDistance;
  chosen: boolean;
  side: "system" | "ai";
  differences?: string[];
  showCity?: boolean;
}) {
  if (!day) {
    return (
      <Flex h="100%" minH="72px" align="center" justify="center" px="14px" py="12px" borderWidth="1px" borderStyle="dashed" borderColor="ln" borderRadius="xl" color="tx3" fontSize="12px">
        {side === "ai" ? "The AI plan has no day here" : "No day in your plan"}
      </Flex>
    );
  }

  const title = day.dayType === "transfer" && day.transferLabel ? day.transferLabel : formatDayDate(day.date, "EEEE d MMM");
  const route = routeLine(day);

  return (
    <Box
      aria-label={`${side === "ai" ? "AI plan" : "Your plan"}, day ${day.dayNumber}${chosen ? ", chosen" : ""}`}
      role="group"
      h="100%"
      px="14px"
      py="12px"
      borderRadius="xl"
      borderWidth="1px"
      borderColor={chosen ? "ac" : "ln"}
      boxShadow={chosen ? "0 0 0 1px var(--chakra-colors-ac)" : undefined}
      bg={chosen ? "acSoft" : "sf"}
      transition="background .12s, border-color .12s"
    >
      <Stack spacing="6px">
        <Flex justify="space-between" align="center" gap={2}>
          <Flex align="center" gap={2} minW={0}>
            <DayBadge dayNumber={day.dayNumber} size={28} />
            <Box minW={0}>
              <Text fontWeight={700} noOfLines={1} title={title}>
                {title}
              </Text>
              {showCity && day.legName && (
                <Text fontSize="12px" color="tx3" noOfLines={1}>
                  {day.legName}
                </Text>
              )}
            </Box>
          </Flex>
          <Text fontSize="12px" color="tx3" flexShrink={0}>
            {stopsLabel(day)}
          </Text>
        </Flex>
        <Text fontSize="12px" color="tx3" noOfLines={2} title={route}>
          {route || "Nothing planned"}
        </Text>
        {differences && differences.length > 0 && (
          <Flex gap="6px" wrap="wrap">
            {differences.map((d) => (
              <Pill key={d} tone="warn">
                <Icon as={FiAlertTriangle} boxSize="12px" />
                {d}
              </Pill>
            ))}
          </Flex>
        )}
      </Stack>
    </Box>
  );
}

/** Per-day System / AI switch (vertical on desktop, horizontal on phones). `value` null = hand-merged. */
export function PlanChooser({
  dayNumber,
  value,
  aiAvailable,
  disabled,
  onChange,
  direction = "column",
}: {
  dayNumber: number;
  value: "system" | "ai" | null;
  aiAvailable: boolean;
  disabled?: boolean;
  onChange: (v: "system" | "ai") => void;
  direction?: "row" | "column";
}) {
  const options: { v: "system" | "ai"; label: string; enabled: boolean }[] = [
    { v: "system", label: "System", enabled: true },
    { v: "ai", label: "AI", enabled: aiAvailable },
  ];
  return (
    <Flex direction={direction} bg="sunk" borderRadius="md" p="3px" gap="2px" role="radiogroup" aria-label={`Choose plan for day ${dayNumber}`} display="inline-flex">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <Flex
            key={o.v}
            as="button"
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled || !o.enabled}
            onClick={() => onChange(o.v)}
            align="center"
            justify="center"
            h="30px"
            minW="64px"
            px={3}
            borderRadius="8px"
            fontSize="13px"
            fontWeight={on ? 600 : 500}
            color={on ? "tx" : "tx3"}
            bg={on ? "sf" : "transparent"}
            boxShadow={on ? "ds1" : undefined}
            _disabled={{ opacity: 0.45, cursor: "not-allowed" }}
            _focusVisible={{ outline: "2px solid", outlineColor: "ac", outlineOffset: "1px" }}
          >
            {o.label}
          </Flex>
        );
      })}
    </Flex>
  );
}
