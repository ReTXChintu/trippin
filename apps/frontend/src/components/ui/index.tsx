/**
 * Trippin' UI primitives, built on the shared design system (docs/design-system.md §7). They only
 * use the spec's semantic tokens (sf, ln, tx, ac…), so they're correct in both modes and match
 * SpendLog and InFrame piece for piece.
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
import { FiCheck, FiChevronRight } from "react-icons/fi";
import { dayToken } from "./day";

// ---------------------------------------------------------------------------------------------
// Text

/** Eyebrow label above a section ("Next trip", "Suggested next"): 12/16 600 +.02em, sentence case. */
export function Overline({ children, ...rest }: { children: ReactNode } & BoxProps) {
  return (
    <Text as="span" display="block" fontSize="12px" lineHeight="16px" fontWeight={600} letterSpacing="0.02em" color="tx2" {...rest}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------------------------
// Surfaces

/** The section card: surface, 1px hairline, radius 14, no shadow. `raised` is only for cards that
 * float over a map or picture, and gets the small lift. */
export function SurfaceCard({ raised, children, ...rest }: { raised?: boolean; children?: ReactNode } & BoxProps) {
  return (
    <Box bg="sf" borderWidth="1px" borderColor="ln" borderRadius="xl" boxShadow={raised ? "ds1" : "none"} {...rest}>
      {children}
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Badges and chips

export type Tone = "neutral" | "accent" | "warn" | "danger" | "success";

/** Soft fill + strong text, per tone (§7.4). */
const TONES: Record<Tone, { bg: string; color: string }> = {
  neutral: { bg: "sunk", color: "tx2" },
  accent: { bg: "acSoft", color: "ac" },
  warn: { bg: "warnSoft", color: "warn" },
  danger: { bg: "critSoft", color: "crit" },
  success: { bg: "goodSoft", color: "good" },
};

/** Status badge: 24 high, radius 6, 12/600 ("Draft", "Not booked", "Done"). */
export function Pill({ tone = "neutral", icon, children, ...rest }: { tone?: Tone; icon?: IconType; children: ReactNode } & FlexProps) {
  const t = TONES[tone];
  return (
    <Flex
      as="span"
      display="inline-flex"
      align="center"
      gap={1}
      h="24px"
      px={2}
      borderRadius="sm"
      fontSize="12px"
      lineHeight="16px"
      fontWeight={600}
      whiteSpace="nowrap"
      sx={{ fontVariantNumeric: "tabular-nums" }}
      bg={t.bg}
      color={t.color}
      {...rest}
    >
      {icon && <Icon as={icon} boxSize="14px" flexShrink={0} />}
      {children}
    </Flex>
  );
}

/** An 8px attention dot (a city without a stay, an unbooked transfer). */
export function WarnDot({ ...rest }: BoxProps) {
  return <Box as="span" display="inline-block" w="8px" h="8px" borderRadius="full" bg="warnFill" flexShrink={0} {...rest} />;
}

/** Filter / choice chip (§7.4): off is outlined, on is ink-filled, soft is an AI suggestion. */
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
      h={size === "lg" ? "40px" : "36px"}
      px="14px"
      borderRadius="full"
      borderWidth="1px"
      borderColor={selected ? "tx" : soft ? "transparent" : "ln2"}
      bg={selected ? "tx" : soft ? "acSoft" : "sf"}
      color={selected ? "bg" : soft ? "ac" : "tx"}
      fontSize="13px"
      fontWeight={500}
      whiteSpace="nowrap"
      transition="background .12s, border-color .12s, color .12s"
      _hover={selected ? undefined : soft ? { boxShadow: "inset 0 0 0 1px var(--chakra-colors-acLine)" } : { bg: "sf2", borderColor: "tx3" }}
      _focusVisible={{ outline: "3px solid", outlineColor: "ac", outlineOffset: "3px" }}
      {...rest}
    >
      {selected && !icon ? <Icon as={FiCheck} boxSize="14px" /> : icon ? <Icon as={icon} boxSize="14px" /> : null}
      {children}
    </Flex>
  );
}

/** Segmented control (§7.3): sunk track, radius 12, padding 4; the selected segment is a raised
 * surface thumb. The only tab style in the system (List / Map, Day / Whole trip). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "md",
  ...rest
}: {
  value: T;
  options: { value: NoInfer<T>; label: ReactNode; icon?: IconType }[];
  onChange: (v: NoInfer<T>) => void;
  size?: "sm" | "md";
} & Omit<FlexProps, "onChange">) {
  return (
    <Flex display="inline-flex" bg="sunk" borderRadius="lg" p={1} gap={1} role="tablist" maxW="full" {...rest}>
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
            justify="center"
            gap="6px"
            h={size === "sm" ? "32px" : "36px"}
            px={3}
            flex="1 1 0"
            borderRadius="9px"
            fontSize={size === "sm" ? "13px" : "14px"}
            fontWeight={on ? 600 : 500}
            whiteSpace="nowrap"
            color={on ? "tx" : "tx2"}
            bg={on ? "sf" : "transparent"}
            boxShadow={on ? "ds1" : undefined}
            transition="background .2s, color .2s"
            _hover={on ? undefined : { color: "tx" }}
            _focusVisible={{ outline: "3px solid", outlineColor: "ac", outlineOffset: "1px" }}
          >
            {o.icon && <Icon as={o.icon} boxSize="16px" />}
            {o.label}
          </Flex>
        );
      })}
    </Flex>
  );
}

// ---------------------------------------------------------------------------------------------
// Icon tiles

/** The universal leading element (§7.5): a radius-10 square in a soft tint with the icon in the
 * strong tint. 40 for rows and cards, 36 inline. */
export function DsIconTile({ icon, tone = "accent", size = 40, ...rest }: { icon: IconType; tone?: Tone; size?: number } & FlexProps) {
  const t = TONES[tone];
  return (
    <Flex w={`${size}px`} h={`${size}px`} borderRadius="md" bg={t.bg} color={t.color} align="center" justify="center" flexShrink={0} {...rest}>
      <Icon as={icon} boxSize={size >= 40 ? "20px" : "18px"} />
    </Flex>
  );
}

// ---------------------------------------------------------------------------------------------
// Days

/** The numbered square at the start of a day card (tabular numeral on the day's colour). */
export function DayBadge({ dayNumber, size = 44, ...rest }: { dayNumber: number; size?: number } & BoxProps) {
  return (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="md"
      bg={dayToken(dayNumber)}
      color="pin.fg"
      align="center"
      justify="center"
      fontWeight={600}
      fontSize={size >= 40 ? "19px" : "15px"}
      letterSpacing="-0.01em"
      sx={{ fontVariantNumeric: "tabular-nums lining-nums" }}
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
      sx={{ fontVariantNumeric: "tabular-nums" }}
      borderWidth="2px"
      borderColor="sf"
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
      <Flex position="relative" overflow="hidden" bg="sunk" {...rest}>
        <img src={src} alt={alt} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Flex>
    );
  }
  return <PhotoFallback seed={seed} icon={icon} aria-label={alt} role="img" {...rest} />;
}

// ---------------------------------------------------------------------------------------------
// Blocks

/** Stat tile (§7.5): label 12/600 tx2 with a 16px icon, value 22/28 600 tabular, optional footnote. */
export function StatTile({ label, value, icon, foot, ...rest }: { label: string; value: ReactNode; icon?: IconType; foot?: ReactNode } & BoxProps) {
  return (
    <SurfaceCard p={4} display="flex" flexDirection="column" gap="6px" {...rest}>
      <HStack spacing={2} color="tx2" fontSize="12px" lineHeight="16px" fontWeight={600} letterSpacing="0.02em">
        {icon && <Icon as={icon} boxSize="16px" />}
        <Text>{label}</Text>
      </HStack>
      <Text fontWeight={600} fontSize="22px" lineHeight="28px" className="num">
        {value}
      </Text>
      {foot && (
        <Text fontSize="12px" lineHeight="16px" color="tx3">
          {foot}
        </Text>
      )}
    </SurfaceCard>
  );
}

/** Empty state (§7.11): an icon tile, a title, one line, one clear action. */
export function EmptyState({
  icon,
  title,
  text,
  action,
  compact,
  ...rest
}: { icon?: IconType; title: string; text?: ReactNode; action?: ReactNode; compact?: boolean } & BoxProps) {
  return (
    <Flex direction="column" align="center" textAlign="center" gap={compact ? 2 : 3} py={compact ? 6 : 12} px={6} {...rest}>
      {icon && (
        <Flex w={compact ? "40px" : "48px"} h={compact ? "40px" : "48px"} borderRadius="md" bg="sunk" color="tx3" align="center" justify="center">
          <Icon as={icon} boxSize={compact ? "20px" : "24px"} />
        </Flex>
      )}
      <Text fontWeight={600} fontSize={compact ? "15px" : "17px"} lineHeight={compact ? "20px" : "24px"}>
        {title}
      </Text>
      {text && (
        <Text color="tx2" fontSize={compact ? "13px" : "15px"} lineHeight={compact ? "18px" : "22px"} maxW="440px">
          {text}
        </Text>
      )}
      {action}
    </Flex>
  );
}

/** Callout / banner (§7.5) for gaps and limits ("Udaipur has 3 nights without a stay"). Info
 * (accent) is an accent tint with ink text; the others are soft + strong. */
export function Banner({
  tone = "warn",
  icon,
  children,
  action,
  ...rest
}: { tone?: Tone; icon?: IconType; children: ReactNode; action?: ReactNode } & FlexProps) {
  const t = TONES[tone];
  const color = tone === "accent" ? "tx" : t.color;
  return (
    <Flex align="center" gap={3} px={4} py={3} borderRadius="lg" bg={t.bg} color={color} flexWrap={{ base: "wrap", sm: "nowrap" }} {...rest}>
      {icon && <Icon as={icon} boxSize="20px" flexShrink={0} color={t.color} />}
      <Box flex={1} fontSize={tone === "neutral" ? "13px" : "14px"} lineHeight={tone === "neutral" ? "18px" : "20px"} fontWeight={tone === "neutral" ? 400 : 500} minW={0}>
        {children}
      </Box>
      {action}
    </Flex>
  );
}

/** Page heading block: eyebrow + 22/28 page title + optional actions on the right. */
export function PageHeader({ overline, title, subtitle, actions }: { overline?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <Flex justify="space-between" align={{ base: "flex-start", md: "flex-end" }} gap={4} direction={{ base: "column", md: "row" }}>
      <Box minW={0}>
        {overline && <Overline mb={1}>{overline}</Overline>}
        <Text as="h1" fontWeight={600} fontSize="22px" lineHeight="28px">
          {title}
        </Text>
        {subtitle && (
          <Text color="tx2" fontSize="14px" lineHeight="20px" mt={1}>
            {subtitle}
          </Text>
        )}
      </Box>
      {actions && <HStack spacing={2} flexShrink={0} flexWrap="wrap">{actions}</HStack>}
    </Flex>
  );
}

/** Link row (§7.6) used in sheets and settings lists: icon, label, value, chevron. */
export function ListRowButton({ icon, label, value, onClick }: { icon: IconType; label: string; value?: ReactNode; onClick?: () => void }) {
  return (
    <Button
      variant="ghost"
      colorScheme="gray"
      onClick={onClick}
      justifyContent="flex-start"
      h="auto"
      minH="48px"
      px={4}
      borderRadius={0}
      fontWeight={400}
      fontSize="14px"
      color="tx"
      w="full"
      gap={3}
    >
      <Icon as={icon} boxSize="20px" color="tx2" />
      <Text flex={1} textAlign="left">
        {label}
      </Text>
      {value && (
        <Text fontSize="13px" color="tx3">
          {value}
        </Text>
      )}
      <Icon as={FiChevronRight} boxSize="18px" color="tx3" />
    </Button>
  );
}
