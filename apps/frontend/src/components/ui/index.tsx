/**
 * Trippin' UI primitives — the small pieces every screen of the redesign is built from. They only
 * use semantic tokens (bg.surface, border.line, accent.soft…), so they're correct in both modes.
 */
import {
  Box,
  type BoxProps,
  Button,
  Flex,
  type FlexProps,
  HStack,
  Icon,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { dayToken } from "./day";

// ---------------------------------------------------------------------------------------------
// Text

/** Small caps label above a section ("NEXT TRIP", "SUGGESTED NEXT"). */
export function Overline({ children, ...rest }: { children: ReactNode } & BoxProps) {
  return (
    <Text as="span" display="block" fontSize="12px" fontWeight={600} textTransform="uppercase" letterSpacing="0.06em" color="fg.muted" {...rest}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------------------------
// Surfaces

/** The standard card: surface, 1px line, 14px radius. `raised` adds the soft elevation. */
export function SurfaceCard({ raised, children, ...rest }: { raised?: boolean; children?: ReactNode } & BoxProps) {
  return (
    <Box bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl" boxShadow={raised ? "raised" : undefined} {...rest}>
      {children}
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Pills and chips

export type Tone = "neutral" | "accent" | "warn" | "danger" | "success";

const TONES: Record<Tone, { bg: string; color: string }> = {
  neutral: { bg: "bg.subtle", color: "fg.muted" },
  accent: { bg: "accent.soft", color: "accent.text" },
  warn: { bg: "warn.soft", color: "warn" },
  danger: { bg: "danger.soft", color: "danger" },
  success: { bg: "success.soft", color: "success" },
};

/** Status pill: 24px, rounded, 12px semibold ("Draft", "Not booked", "Done"). */
export function Pill({ tone = "neutral", icon, children, ...rest }: { tone?: Tone; icon?: IconType; children: ReactNode } & FlexProps) {
  const t = TONES[tone];
  return (
    <Flex as="span" display="inline-flex" align="center" gap="6px" h="24px" px="10px" borderRadius="full" fontSize="12px" fontWeight={600} whiteSpace="nowrap" bg={t.bg} color={t.color} {...rest}>
      {icon && <Icon as={icon} boxSize="12px" />}
      {children}
    </Flex>
  );
}

/** A small warning dot (a city without a stay, an unbooked transfer). */
export function WarnDot({ ...rest }: BoxProps) {
  return <Box as="span" display="inline-block" w="8px" h="8px" borderRadius="full" bg="warn" flexShrink={0} {...rest} />;
}

/** Filter / choice chip: off (outline), on (accent fill), soft (AI suggestion). */
export function ChoiceChip({
  selected,
  soft,
  size = "md",
  icon,
  children,
  onClick,
  ...rest
}: {
  selected?: boolean;
  soft?: boolean;
  size?: "md" | "lg";
  icon?: IconType;
  children: ReactNode;
  onClick?: () => void;
} & Omit<FlexProps, "onClick">) {
  return (
    <Flex
      as="button"
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      display="inline-flex"
      align="center"
      gap="6px"
      h={size === "lg" ? "40px" : "32px"}
      px={size === "lg" ? 4 : 3}
      borderRadius="full"
      borderWidth="1px"
      borderColor={selected ? "accent" : soft ? "transparent" : "border.line"}
      bg={selected ? "accent" : soft ? "accent.soft" : "bg.surface"}
      color={selected ? "accent.fg" : soft ? "accent.text" : "fg.default"}
      fontSize="13px"
      fontWeight={selected ? 600 : 500}
      whiteSpace="nowrap"
      transition="background .12s, border-color .12s"
      _hover={selected || soft ? { filter: "brightness(1.04)" } : { bg: "bg.subtle" }}
      _focusVisible={{ outline: "2px solid", outlineColor: "accent", outlineOffset: "2px" }}
      {...rest}
    >
      {icon && <Icon as={icon} boxSize="14px" />}
      {children}
    </Flex>
  );
}

/** Segmented control (List / Map, Log in / Create account, Day / Whole trip). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  ...rest
}: {
  value: T;
  options: { value: T; label: ReactNode; icon?: IconType }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
} & Omit<FlexProps, "onChange">) {
  return (
    <Flex display="inline-flex" bg="bg.subtle" borderRadius="md" p="3px" gap="2px" role="tablist" {...rest}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Flex
            key={o.value}
            as="button"
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            align="center"
            gap="6px"
            h={size === "sm" ? "26px" : "30px"}
            px={3}
            borderRadius="8px"
            fontSize="13px"
            fontWeight={on ? 600 : 500}
            color={on ? "fg.default" : "fg.muted"}
            bg={on ? "bg.surface" : "transparent"}
            boxShadow={on ? "0 1px 2px rgba(0,0,0,.12)" : undefined}
          >
            {o.icon && <Icon as={o.icon} boxSize="14px" />}
            {o.label}
          </Flex>
        );
      })}
    </Flex>
  );
}

// ---------------------------------------------------------------------------------------------
// Days

/** The numbered square at the start of a day card (Fraunces numeral on the day's colour). */
export function DayBadge({ dayNumber, size = 44, ...rest }: { dayNumber: number; size?: number } & BoxProps) {
  return (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      borderRadius={size >= 40 ? "10px" : "8px"}
      bg={dayToken(dayNumber)}
      color="pin.fg"
      align="center"
      justify="center"
      fontFamily="heading"
      fontWeight={600}
      fontSize={size >= 40 ? "22px" : "16px"}
      flexShrink={0}
      {...rest}
    >
      {dayNumber}
    </Flex>
  );
}

/** Round numbered marker used in timelines (stop 1, 2, 3 on a day). */
export function StopNumber({ n, dayNumber, dim, ...rest }: { n: number | string; dayNumber: number; dim?: boolean } & BoxProps) {
  return (
    <Flex
      w="28px"
      h="28px"
      borderRadius="full"
      bg={dayToken(dayNumber)}
      color="pin.fg"
      align="center"
      justify="center"
      fontSize="12px"
      fontWeight={700}
      borderWidth="2.5px"
      borderColor="bg.surface"
      boxShadow="0 2px 6px rgba(0,0,0,.2)"
      opacity={dim ? 0.45 : 1}
      flexShrink={0}
      {...rest}
    >
      {n}
    </Flex>
  );
}

// ---------------------------------------------------------------------------------------------
// Photos

const PH_LIGHT = [
  ["#F1D9C4", "#E7B98E", "#7A3F12"],
  ["#D3E6DA", "#9CC7AE", "#1F5A3B"],
  ["#D5DEF1", "#A8B9E2", "#2A3F86"],
  ["#EAD3E6", "#D0A2C8", "#6C2A63"],
  ["#F3E7BE", "#E3CB7A", "#6A5410"],
];
const PH_DARK = [
  ["#4A3324", "#6B4526", "#F0C79E"],
  ["#1F3A2C", "#2F5E47", "#B4E3C8"],
  ["#252F52", "#36457C", "#C1CEF5"],
  ["#432A3E", "#6A3E62", "#F0C4E8"],
  ["#4A3F16", "#6B5A1E", "#F3E19A"],
];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Warm gradient tile with the category icon — used wherever a place has no photo. */
export function PhotoFallback({
  seed,
  icon,
  label,
  iconSize = 24,
  children,
  ...rest
}: { seed: string; icon?: IconType; label?: string; iconSize?: number; children?: ReactNode } & FlexProps) {
  const palette = useColorModeValue(PH_LIGHT, PH_DARK);
  const [from, to, fg] = palette[hash(seed) % palette.length];
  return (
    <Flex position="relative" align="center" justify="center" overflow="hidden" bgGradient={`linear(135deg, ${from}, ${to})`} color={fg} {...rest}>
      {icon && <Icon as={icon} boxSize={`${iconSize}px`} />}
      {label && (
        <Text position="absolute" left={2} bottom={1.5} fontSize="12px" fontWeight={500} opacity={0.85}>
          {label}
        </Text>
      )}
      {children}
    </Flex>
  );
}

/** Photo if there is one, otherwise the gradient fallback. */
export function PlacePhoto({ src, alt, seed, icon, ...rest }: { src?: string | null; alt: string; seed: string; icon?: IconType } & FlexProps) {
  if (src) {
    return (
      <Flex position="relative" overflow="hidden" bg="bg.subtle" {...rest}>
        <img src={src} alt={alt} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Flex>
    );
  }
  return <PhotoFallback seed={seed} icon={icon} aria-label={alt} role="img" {...rest} />;
}

// ---------------------------------------------------------------------------------------------
// Blocks

/** Dashboard-style number tile. */
export function StatTile({ label, value, icon, ...rest }: { label: string; value: ReactNode; icon?: IconType } & BoxProps) {
  return (
    <SurfaceCard p={4} {...rest}>
      <HStack spacing={1.5} color="fg.muted" fontSize="13px">
        {icon && <Icon as={icon} boxSize="14px" />}
        <Text>{label}</Text>
      </HStack>
      <Text fontFamily="heading" fontWeight={600} fontSize="34px" lineHeight={1.1} mt={1.5}>
        {value}
      </Text>
    </SurfaceCard>
  );
}

/** Empty state: icon, title, one line, one clear action. */
export function EmptyState({
  icon,
  title,
  text,
  action,
  compact,
  ...rest
}: { icon?: IconType; title: string; text?: ReactNode; action?: ReactNode; compact?: boolean } & BoxProps) {
  return (
    <Flex direction="column" align="center" textAlign="center" gap={3} py={compact ? 6 : 12} px={6} {...rest}>
      {icon && (
        <Flex w="52px" h="52px" borderRadius="14px" bg="accent.soft" color="accent.text" align="center" justify="center">
          <Icon as={icon} boxSize="24px" />
        </Flex>
      )}
      <Text fontFamily="heading" fontWeight={600} fontSize="20px">
        {title}
      </Text>
      {text && (
        <Text color="fg.muted" maxW="440px">
          {text}
        </Text>
      )}
      {action}
    </Flex>
  );
}

/** Inline banner for gaps and limits ("Udaipur has 3 nights without a stay", "Add a Maps key"). */
export function Banner({
  tone = "warn",
  icon,
  children,
  action,
  ...rest
}: { tone?: Tone; icon?: IconType; children: ReactNode; action?: ReactNode } & FlexProps) {
  const t = TONES[tone];
  return (
    <Flex align="center" gap={3} px={4} py={3} borderRadius="lg" bg={t.bg} color={t.color} {...rest}>
      {icon && <Icon as={icon} boxSize="18px" flexShrink={0} />}
      <Box flex={1} fontSize="13px" minW={0}>
        {children}
      </Box>
      {action}
    </Flex>
  );
}

/** Page heading block: overline + Fraunces title + optional actions on the right. */
export function PageHeader({ overline, title, subtitle, actions }: { overline?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <Flex justify="space-between" align={{ base: "flex-start", md: "flex-end" }} gap={4} direction={{ base: "column", md: "row" }}>
      <Box minW={0}>
        {overline && <Overline mb={1}>{overline}</Overline>}
        <Text as="h1" fontFamily="heading" fontWeight={600} fontSize={{ base: "28px", md: "34px" }} lineHeight={1.15} letterSpacing="-0.01em">
          {title}
        </Text>
        {subtitle && (
          <Text color="fg.muted" mt={1}>
            {subtitle}
          </Text>
        )}
      </Box>
      {actions && <HStack spacing={2} flexShrink={0}>{actions}</HStack>}
    </Flex>
  );
}

/** Row button used in sheets and settings lists (icon, label, value, chevron). */
export function ListRowButton({ icon, label, value, onClick }: { icon: IconType; label: string; value?: ReactNode; onClick?: () => void }) {
  return (
    <Button variant="ghost" onClick={onClick} justifyContent="flex-start" h="56px" px={4} borderRadius={0} fontWeight={600} w="full">
      <Icon as={icon} boxSize="20px" mr={4} />
      <Text flex={1} textAlign="left">
        {label}
      </Text>
      {value && (
        <Text fontSize="13px" fontWeight={400} color="fg.muted" mr={3}>
          {value}
        </Text>
      )}
    </Button>
  );
}
