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
  IconButton,
  Input,
  InputGroup,
  type InputProps,
  InputLeftElement,
  InputRightElement,
  Text,
} from "@chakra-ui/react";
import { forwardRef, useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiEye, FiEyeOff, FiUsers } from "react-icons/fi";
import { PhotoFallback, Pill } from "@/components/ui";
import { initials, tripStatusInfo } from "./app-format";
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
      bg="sunk"
      overflow="hidden"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      {...rest}
    >
      <Box h="100%" w={`${pct}%`} bg="ac" borderRadius="full" />
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

const AVATAR_COLORS = ["day.1", "day.2", "day.3", "day.4", "day.5", "day.6"];

/** People on a trip as overlapping initials avatars (owner first). Hidden for solo trips. */
export function MemberCount({ trip, max = 3 }: { trip: Trip; max?: number }) {
  const n = (trip.memberIds?.length ?? 0) + 1;
  if (n < 2) return null;
  const people = trip.people ?? [];
  if (people.length === 0) {
    return (
      <HStack spacing={1} color="tx3" fontSize="12px" fontWeight={600} title={`${n} people on this trip`} aria-label={`${n} people on this trip`}>
        <Icon as={FiUsers} boxSize="14px" />
        <span>{n}</span>
      </HStack>
    );
  }
  const shown = people.slice(0, max);
  const extra = n - shown.length;
  return (
    <HStack spacing={0} aria-label={`On this trip: ${people.map((p) => p.name).join(", ")}`} title={people.map((p) => p.name).join(", ")}>
      {shown.map((p, i) => (
        <Flex
          key={p.id}
          w="30px"
          h="30px"
          ml={i === 0 ? 0 : "-8px"}
          borderRadius="full"
          borderWidth="2px"
          borderColor="bg"
          bg={AVATAR_COLORS[i % AVATAR_COLORS.length]}
          color="pin.fg"
          fontSize="12px"
          fontWeight={700}
          align="center"
          justify="center"
          overflow="hidden"
          aria-hidden
        >
          {p.avatar ? <img src={p.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(p.name)}
        </Flex>
      ))}
      {extra > 0 && (
        <Flex w="30px" h="30px" ml="-8px" borderRadius="full" borderWidth="2px" borderColor="bg" bg="sunk" color="tx2" fontSize="12px" fontWeight={700} align="center" justify="center" aria-hidden>
          +{extra}
        </Flex>
      )}
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
      bg={solid ? "ac" : "acSoft"}
      color={solid ? "acTx" : "ac"}
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

/**
 * Password / secret field (design system 7.2): every password, PIN and API key field gets an eye
 * button that shows and hides the value. 44px field, 44×44 ghost button at the right, labelled
 * "Show key" / "Hide key" (the noun follows the object) with `aria-pressed`. While shown, the value
 * switches to IBM Plex Mono so look-alike characters are clear.
 */
export const SecretInput = forwardRef<HTMLInputElement, { icon?: IconType; noun?: string; h?: string } & Omit<InputProps, "h" | "type">>(
  function SecretInput({ icon, noun = "password", h = "44px", ...rest }, ref) {
    const [shown, setShown] = useState(false);
    const label = `${shown ? "Hide" : "Show"} ${noun}`;
    return (
      <InputGroup>
        {icon && (
          <InputLeftElement h={h} w="44px" pointerEvents="none" color="tx3">
            <Icon as={icon} boxSize="18px" />
          </InputLeftElement>
        )}
        <Input
          ref={ref}
          type={shown ? "text" : "password"}
          h={h}
          pl={icon ? "44px" : undefined}
          pr="48px"
          fontFamily={shown ? "mono" : undefined}
          {...rest}
        />
        <InputRightElement h={h} w={h}>
          <IconButton
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={shown}
            aria-controls={rest.id}
            icon={<Icon as={shown ? FiEyeOff : FiEye} boxSize="20px" />}
            variant="ghost"
            colorScheme="gray"
            w={h}
            h={h}
            minW={h}
            borderRadius="md"
            onClick={() => setShown((s) => !s)}
          />
        </InputRightElement>
      </InputGroup>
    );
  },
);

/** Text input with a leading icon — the design's `.inp` row. Forwards its ref for react-hook-form. */
export const IconInput = forwardRef<HTMLInputElement, { icon: IconType; right?: ReactNode; h?: string } & Omit<InputProps, "h">>(
  function IconInput({ icon, right, h = "44px", ...rest }, ref) {
    return (
      <InputGroup>
        <InputLeftElement h={h} w="44px" pointerEvents="none" color="tx3">
          <Icon as={icon} boxSize="18px" />
        </InputLeftElement>
        <Input
          ref={ref}
          h={h}
          pl="44px"
          // Date/time fields: the leading icon replaces the browser's own; the whole field opens the picker.
          sx={
            rest.type === "date" || rest.type === "time"
              ? { position: "relative", "&::-webkit-calendar-picker-indicator": { position: "absolute", inset: 0, w: "auto", h: "auto", opacity: 0, cursor: "pointer" } }
              : undefined
          }
          {...rest}
        />
        {right && <InputRightElement h={h} w={h}>{right}</InputRightElement>}
      </InputGroup>
    );
  },
);
