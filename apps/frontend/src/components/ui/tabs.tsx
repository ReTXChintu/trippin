/**
 * Shared building blocks for the trip workspace tabs (Places, Stays, Food, Bookings, Budget,
 * Checklist, Guide). Same token rules as `index.tsx` — only semantic colours.
 */
import { Box, type BoxProps, Flex, type FlexProps, Grid, Icon, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { dayToken } from "./day";
import { ChoiceChip, PhotoFallback } from "./index";

// ---------------------------------------------------------------------------------------------
// Layout

/**
 * Two panes: content on the left (fixed design width on wide screens), a map or side panel on the
 * right. Stacks below `xl`; `hideAsideBelow` hides the right pane on small screens (e.g. a map
 * that only repeats the list).
 */
export function TabSplit({
  main,
  aside,
  mainWidth = 720,
  stickyAside = true,
  hideAsideBelow,
}: {
  main: ReactNode;
  aside?: ReactNode;
  mainWidth?: number;
  stickyAside?: boolean;
  hideAsideBelow?: "lg" | "xl";
}) {
  if (!aside) return <Box minW={0}>{main}</Box>;
  const asideDisplay = hideAsideBelow === "xl" ? { base: "none", xl: "block" } : hideAsideBelow === "lg" ? { base: "none", lg: "block" } : undefined;
  return (
    <Grid
      templateColumns={{ base: "minmax(0,1fr)", lg: "minmax(0,1.15fr) minmax(0,1fr)", xl: `minmax(0,${mainWidth}px) minmax(0,1fr)` }}
      gap={{ base: 5, lg: 6 }}
      alignItems="start"
    >
      <Box minW={0}>{main}</Box>
      <Box minW={0} display={asideDisplay} position={stickyAside ? { lg: "sticky" } : undefined} top={stickyAside ? { lg: 4 } : undefined}>
        {aside}
      </Box>
    </Grid>
  );
}

/** Section heading (17/24 600) with something (meta text, a badge) on the right. */
export function SectionTitle({ children, aside, as = "h2", size = 17, ...rest }: { children: ReactNode; aside?: ReactNode; as?: "h2" | "h3"; size?: number } & FlexProps) {
  return (
    <Flex align="center" justify="space-between" gap={3} flexWrap="wrap" {...rest}>
      <Text as={as} fontWeight={600} fontSize={`${size}px`} lineHeight={size >= 17 ? "24px" : "20px"}>
        {children}
      </Text>
      {aside}
    </Flex>
  );
}

/** Horizontal card row (`.card.r.g12`, 12×14 padding) — the list item used across the tabs. */
export function RowCard({ children, dashed, tone, ...rest }: { children: ReactNode; dashed?: boolean; tone?: "warn" } & FlexProps) {
  return (
    <Flex
      align="center"
      gap={3}
      px="14px"
      py="12px"
      bg={tone === "warn" ? "warnSoft" : "sf"}
      color={tone === "warn" ? "warn" : undefined}
      borderWidth={dashed && tone === "warn" ? "1.5px" : "1px"}
      borderStyle={dashed ? "dashed" : "solid"}
      borderColor={tone === "warn" ? "warn" : "ln"}
      borderRadius="xl"
      minW={0}
      {...rest}
    >
      {children}
    </Flex>
  );
}

/** Icon tile (§7.5): radius 10, 36 neutral by default; `tone="accent"` for the 40px booking tile. */
export function IconTile({ icon, size = 36, tone = "neutral", ...rest }: { icon: IconType; size?: number; tone?: "neutral" | "accent" } & FlexProps) {
  return (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="md"
      bg={tone === "accent" ? "acSoft" : "sunk"}
      color={tone === "accent" ? "ac" : "tx2"}
      align="center"
      justify="center"
      flexShrink={0}
      {...rest}
    >
      <Icon as={icon} boxSize={size >= 40 ? "20px" : "18px"} />
    </Flex>
  );
}

/** 48px rounded thumbnail: photo if there is one, else the warm fallback with an icon. */
export function Thumb({ src, seed, icon, size = 48, alt = "" }: { src?: string | null; seed: string; icon?: IconType; size?: number; alt?: string }) {
  if (src) {
    return (
      <Box w={`${size}px`} h={`${size}px`} borderRadius="10px" overflow="hidden" flexShrink={0} bg="sunk">
        <img src={src} alt={alt} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </Box>
    );
  }
  return <PhotoFallback seed={seed} icon={icon} iconSize={20} w={`${size}px`} h={`${size}px`} borderRadius="10px" flexShrink={0} aria-hidden />;
}

/** Title + muted sub line, flexing to fill a row. */
export function RowText({ title, sub, titleSize }: { title: ReactNode; sub?: ReactNode; titleSize?: string }) {
  return (
    <Flex direction="column" flex={1} minW={0}>
      <Text fontWeight={600} fontSize={titleSize ?? "15px"} lineHeight="20px" noOfLines={1}>
        {title}
      </Text>
      {sub && (
        <Text fontSize="13px" lineHeight="18px" color="tx3" noOfLines={2}>
          {sub}
        </Text>
      )}
    </Flex>
  );
}

/** 6px progress track (`.bar`). */
export function Bar({ value, color = "ac", ...rest }: { value: number; color?: string } & BoxProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <Box h="6px" borderRadius="full" bg="sunk" overflow="hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} {...rest}>
      <Box h="100%" w={`${pct}%`} bg={color} borderRadius="full" transition="width .3s" />
    </Box>
  );
}

/** Round initials avatar in a day colour (`.av`). */
export function Initials({ name, index = 0, size = 30 }: { name: string; index?: number; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="full"
      bg={dayToken(index + 1)}
      color="pin.fg"
      align="center"
      justify="center"
      fontSize="12px"
      fontWeight={700}
      borderWidth="2px"
      borderColor="sf"
      flexShrink={0}
      aria-hidden
    >
      {initials || "?"}
    </Flex>
  );
}

/** Row of city chips used inside a tab (Places, Food). Hidden for single-city trips. */
export function CityChips({
  cities,
  value,
  onChange,
  label = "City",
}: {
  cities: { id: string; name: string; warn?: boolean }[];
  value: string;
  onChange?: (id: string) => void;
  label?: string;
}) {
  if (cities.length < 2 || !onChange) return null;
  return (
    <Flex gap="6px" flexWrap="wrap" role="group" aria-label={label}>
      {cities.map((c) => (
        <ChoiceChip key={c.id} selected={c.id === value} onClick={() => onChange(c.id)}>
          {c.name}
          {c.warn && <Box as="span" w="8px" h="8px" borderRadius="full" bg="warnFill" display="inline-block" aria-label="needs attention" />}
        </ChoiceChip>
      ))}
    </Flex>
  );
}

/** Night tile in the "Nights covered" strip — covered (accent soft) or a gap (dashed warn). */
export function NightTile({ top, bottom, covered, compact, title }: { top: ReactNode; bottom: ReactNode; covered: boolean; compact?: boolean; title?: string }) {
  return (
    <Flex
      direction="column"
      flex="1 1 0"
      minW={compact ? "40px" : "64px"}
      textAlign="center"
      py={compact ? "6px" : "8px"}
      borderRadius={compact ? "8px" : "10px"}
      bg={covered ? "acSoft" : "warnSoft"}
      color={covered ? "ac" : "warn"}
      borderWidth={covered ? 0 : "1.5px"}
      borderStyle="dashed"
      borderColor="warn"
      title={title}
    >
      <Text fontWeight={600} fontSize={compact ? "13px" : undefined}>
        {top}
      </Text>
      <Text fontSize="12px" fontWeight={600} letterSpacing="0.02em" noOfLines={1} px={1} className="num">
        {bottom}
      </Text>
    </Flex>
  );
}
