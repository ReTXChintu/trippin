/**
 * Trippin' plan primitives — shared by the trip workspace (header, stage bar, plan timeline, map
 * overlays). Tokens only, so every piece is correct in light and dark.
 */
import { Box, type BoxProps, Flex, type FlexProps, Icon, IconButton, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { LuBedDouble, LuX } from "react-icons/lu";
import { dayToken } from "./day";


// ---------------------------------------------------------------------------------------------
// Small pieces

/** A day's colour dot (day chips, map legend). */
export function DayDot({ dayNumber, size = 10, ...rest }: { dayNumber: number; size?: number } & BoxProps) {
  return (
    <Box
      as="span"
      display="inline-block"
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="full"
      bg={dayToken(dayNumber)}
      flexShrink={0}
      boxShadow="0 0 0 2px var(--chakra-colors-sf)"
      {...rest}
    />
  );
}

/** Rounded count next to a tab label ("14", "0/2"), warn tone for gaps ("1 gap"). */
export function TabCount({ children, warn }: { children: ReactNode; warn?: boolean }) {
  return (
    <Flex
      as="span"
      display="inline-flex"
      align="center"
      h="20px"
      px="7px"
      borderRadius="full"
      fontSize="12px"
      fontWeight={500}
      bg={warn ? "warnSoft" : "sunk"}
      color={warn ? "warn" : "tx3"}
    >
      {children}
    </Flex>
  );
}

/** Timeline marker for a stay (start/return): dark rounded square with a bed. */
export function StayMarker({ size = 28, icon = LuBedDouble, ...rest }: { size?: number; icon?: IconType } & FlexProps) {
  return (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="md"
      bg="tx"
      color="bg"
      align="center"
      justify="center"
      flexShrink={0}
      {...rest}
    >
      <Icon as={icon} boxSize="15px" />
    </Flex>
  );
}

/** Outlined round marker (meal slots). */
export function RingMarker({ icon, size = 28, ...rest }: { icon: IconType; size?: number } & FlexProps) {
  return (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="full"
      borderWidth="2px"
      borderColor="ln"
      bg="sf"
      color="tx3"
      align="center"
      justify="center"
      flexShrink={0}
      {...rest}
    >
      <Icon as={icon} boxSize="14px" />
    </Flex>
  );
}

/** Drawer / modal heading: 19/24 title, a muted context line, a round close button. */
export function PanelHeader({
  title,
  subtitle,
  onClose,
  ...rest
}: { title: ReactNode; subtitle?: ReactNode; onClose?: () => void } & FlexProps) {
  return (
    <Flex justify="space-between" align="center" gap={3} px={6} py={5} borderBottomWidth="1px" borderColor="ln" {...rest}>
      <Box minW={0}>
        <Text as="h2" fontWeight={600} fontSize="19px" lineHeight="24px" noOfLines={2}>
          {title}
        </Text>
        {subtitle && (
          <Text fontSize="13px" color="tx3" mt={0.5}>
            {subtitle}
          </Text>
        )}
      </Box>
      {onClose && <IconButton aria-label="Close" icon={<LuX size={20} />} variant="ghost" colorScheme="gray" borderRadius="full" onClick={onClose} flexShrink={0} />}
    </Flex>
  );
}

/** Section label inside drawers ("Trip details", "Opening hours"): 12/16 600 +.02em, sentence case. */
export function SectionLabel({ children, ...rest }: { children: ReactNode } & BoxProps) {
  return (
    <Text as="span" display="block" fontSize="12px" lineHeight="16px" fontWeight={600} letterSpacing="0.02em" color="tx2" {...rest}>
      {children}
    </Text>
  );
}

/** Inverse toast (§7.12) used for AI results and undoable changes. */
export function Snackbar({ icon, children, action }: { icon?: IconType; children: ReactNode; action?: ReactNode }) {
  return (
    <Flex
      role="status"
      align="center"
      gap={3}
      pl={4}
      pr={2}
      py="10px"
      minH="52px"
      borderRadius="lg"
      bg="tx"
      color="bg"
      boxShadow="ds2"
      maxW="min(560px, calc(100vw - 32px))"
    >
      {icon && <Icon as={icon} boxSize="20px" flexShrink={0} />}
      <Text fontSize="14px" lineHeight="20px" flex={1} minW={0}>
        {children}
      </Text>
      {action}
    </Flex>
  );
}
