/**
 * Primitives for the app & public pages (dashboard, trip list, new trip, profile, auth, invite,
 * share). Built on the shared tokens only, so every piece is right in light and dark mode.
 */
import {
  Box,
  type BoxProps,
  Flex,
  HStack,
  Icon,
  Input,
  InputGroup,
  type InputProps,
  InputLeftElement,
  InputRightElement,
  Text,
} from "@chakra-ui/react";
import { forwardRef, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiUsers } from "react-icons/fi";
import { PhotoFallback, Pill } from "@/components/ui";
import { tripStatusInfo } from "./app-format";
import type { Trip } from "@/modules/trips/types/trip.types";

// ---------------------------------------------------------------------------------------------
// Visual pieces

/** The warm gradient header of a trip card with a dashed route drawn across it and the route label. */
export function RouteArt({ seed, label, height = "110px", ...rest }: { seed: string; label?: string; height?: BoxProps["h"] } & BoxProps) {
  return (
    <PhotoFallback seed={seed} h={height} justify="flex-start" align="flex-end" px="14px" py="12px" {...rest}>
      <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", opacity: 0.55 }} aria-hidden viewBox="0 0 300 110" preserveAspectRatio="none">
        <path d="M10 80 C 60 20, 110 100, 160 50 S 250 30, 290 70" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx="10" cy="80" r="5" fill="currentColor" />
        <circle cx="160" cy="50" r="5" fill="currentColor" />
        <circle cx="290" cy="70" r="5" fill="currentColor" />
      </svg>
      {label && (
        <Text position="relative" fontSize="13px" fontWeight={600} noOfLines={1}>
          {label}
        </Text>
      )}
    </PhotoFallback>
  );
}

/** 6px progress track (the design's `.bar`). */
export function ProgressBar({ value, label, ...rest }: { value: number; label?: string } & BoxProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <Box
      h="6px"
      borderRadius="full"
      bg="bg.subtle"
      overflow="hidden"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      {...rest}
    >
      <Box h="100%" w={`${pct}%`} bg="accent" borderRadius="full" />
    </Box>
  );
}

export function TripStatusPill({ trip, ...rest }: { trip: Trip } & Omit<BoxProps, "children">) {
  const info = tripStatusInfo(trip);
  return (
    <Pill tone={info.tone} {...rest}>
      {info.label}
    </Pill>
  );
}

/** People on a trip (owner + members). Names aren't in the trip list, so it's a count. */
export function MemberCount({ trip }: { trip: Trip }) {
  const n = (trip.memberIds?.length ?? 0) + 1;
  if (n < 2) return null;
  return (
    <HStack spacing={1} color="fg.muted" fontSize="12px" fontWeight={600} title={`${n} people on this trip`} aria-label={`${n} people on this trip`}>
      <Icon as={FiUsers} boxSize="14px" />
      <span>{n}</span>
    </HStack>
  );
}

/** Round step number used on form sections ("1 Where and when"). */
export function StepNumber({ n, solid, size = 26 }: { n: number | string; solid?: boolean; size?: number }) {
  return (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="full"
      bg={solid ? "accent" : "accent.soft"}
      color={solid ? "accent.fg" : "accent.text"}
      align="center"
      justify="center"
      fontSize={size >= 28 ? "14px" : "13px"}
      fontWeight={600}
      flexShrink={0}
    >
      {n}
    </Flex>
  );
}

/** Text input with a leading icon — the design's `.inp` row. Forwards its ref for react-hook-form. */
export const IconInput = forwardRef<HTMLInputElement, { icon: IconType; right?: ReactNode; h?: string } & Omit<InputProps, "h">>(
  function IconInput({ icon, right, h = "40px", ...rest }, ref) {
    return (
      <InputGroup>
        <InputLeftElement h={h} pointerEvents="none" color="fg.muted">
          <Icon as={icon} boxSize="16px" />
        </InputLeftElement>
        <Input
          ref={ref}
          h={h}
          pl="38px"
          // Date/time fields: the leading icon replaces the browser's own; the whole field opens the picker.
          sx={
            rest.type === "date" || rest.type === "time"
              ? { position: "relative", "&::-webkit-calendar-picker-indicator": { position: "absolute", inset: 0, w: "auto", h: "auto", opacity: 0, cursor: "pointer" } }
              : undefined
          }
          {...rest}
        />
        {right && <InputRightElement h={h}>{right}</InputRightElement>}
      </InputGroup>
    );
  },
);
