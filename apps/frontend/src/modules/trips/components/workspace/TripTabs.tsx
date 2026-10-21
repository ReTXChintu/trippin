import {
  Box,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  Icon,
  Text,
} from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  LuBedDouble,
  LuChevronRight,
  LuEllipsis,
  LuMap,
  LuMapPin,
  LuNavigation2,
} from "react-icons/lu";
import { Link } from "react-router-dom";
import { TabCount } from "@/components/ui/plan";
import { TRIP_TABS } from "./tabs";
import type { TripTabKey } from "@/modules/trips/utils/trip-stage";


export type TabBadges = Partial<Record<TripTabKey, { text: string; warn?: boolean }>>;

/** Desktop tab row as the segmented control (design system 7.3, which has no underline tabs): icon,
 * label, count; the active tab is the raised surface thumb. Scrolls sideways when it runs out of room. */
export function TripTabBar({ tab, badges, onChange }: { tab: TripTabKey; badges: TabBadges; onChange: (t: TripTabKey) => void }) {
  return (
    <Flex
      role="tablist"
      aria-label="Trip sections"
      display="inline-flex"
      maxW="full"
      gap={1}
      p={1}
      mb={4}
      bg="sunk"
      borderRadius="lg"
      overflowX="auto"
      sx={{ scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
    >
      {TRIP_TABS.map((t) => {
        const on = t.key === tab;
        const badge = badges[t.key];
        return (
          <Flex
            key={t.key}
            as="button"
            type="button"
            role="tab"
            id={`trip-tab-${t.key}`}
            aria-selected={on}
            aria-controls={`trip-panel-${t.key}`}
            onClick={() => onChange(t.key)}
            align="center"
            gap={2}
            h="36px"
            px={3}
            flexShrink={0}
            borderRadius="9px"
            fontSize="14px"
            fontWeight={on ? 600 : 500}
            color={on ? "tx" : "tx2"}
            bg={on ? "sf" : "transparent"}
            boxShadow={on ? "ds1" : undefined}
            whiteSpace="nowrap"
            transition="background .2s, color .2s"
            _hover={on ? undefined : { color: "tx" }}
            _focusVisible={{ outline: "3px solid", outlineColor: "ac", outlineOffset: "-3px" }}
          >
            <Icon as={t.icon} boxSize="16px" color={on ? "ac" : undefined} />
            {t.label}
            {badge && <TabCount warn={badge.warn}>{badge.text}</TabCount>}
          </Flex>
        );
      })}
    </Flex>
  );
}

function NavItem({ icon, label, on, onClick }: { icon: IconType; label: string; on?: boolean; onClick: () => void }) {
  return (
    <Flex
      as="button"
      type="button"
      onClick={onClick}
      flex={1}
      direction="column"
      align="center"
      justify="center"
      gap="4px"
      minH="48px"
      color={on ? "ac" : "tx2"}
      aria-current={on ? "page" : undefined}
    >
      <Flex w="56px" h="32px" borderRadius="2xl" bg={on ? "acSoft" : "transparent"} align="center" justify="center" transition="background .2s">
        <Icon as={icon} boxSize="24px" />
      </Flex>
      <Text fontSize="12px" lineHeight="16px" fontWeight={600}>
        {label}
      </Text>
    </Flex>
  );
}

/** Phone trip navigation: Plan, Places, big round Today, Stays, More. */
export function TripBottomNav({
  tab,
  todayHref,
  moreOpen,
  onTab,
  onMore,
}: {
  /** Active workspace tab; null outside the workspace (e.g. on Today). */
  tab: TripTabKey | null;
  todayHref: string;
  moreOpen: boolean;
  onTab: (t: TripTabKey) => void;
  onMore: () => void;
}) {
  const inMore = tab !== null && !["plan", "places", "stays"].includes(tab);
  return (
    <Flex
      as="nav"
      aria-label="Trip"
      position="fixed"
      left={0}
      right={0}
      bottom={0}
      zIndex="sticky"
      h="calc(72px + env(safe-area-inset-bottom))"
      px="6px"
      pb="env(safe-area-inset-bottom)"
      bg="sf"
      borderTopWidth="1px"
      borderColor="ln"
      display={{ base: "flex", lg: "none" }}
      sx={{ "@media print": { display: "none" } }}
    >
      <NavItem icon={LuMap} label="Plan" on={tab === "plan" && !moreOpen} onClick={() => onTab("plan")} />
      <NavItem icon={LuMapPin} label="Places" on={tab === "places" && !moreOpen} onClick={() => onTab("places")} />
      <Flex as={Link} to={todayHref} flex={1} direction="column" align="center" gap="4px" mt="-16px" aria-label="Today">
        <Flex w="52px" h="52px" borderRadius="2xl" bg="ac" color="acTx" boxShadow="ds1" borderWidth="3px" borderColor="sf" align="center" justify="center">
          <Icon as={LuNavigation2} boxSize="24px" />
        </Flex>
        <Text fontSize="12px" lineHeight="16px" fontWeight={600} color="tx">
          Today
        </Text>
      </Flex>
      <NavItem icon={LuBedDouble} label="Stays" on={tab === "stays" && !moreOpen} onClick={() => onTab("stays")} />
      <NavItem icon={LuEllipsis} label="More" on={moreOpen || inMore} onClick={onMore} />
    </Flex>
  );
}

export interface MoreSheetItem {
  key: string;
  icon: IconType;
  label: string;
  value?: ReactNode;
  onClick: () => void;
}

/** Bottom sheet behind "More" on phones. */
export function MoreSheet({ isOpen, onClose, items }: { isOpen: boolean; onClose: () => void; items: MoreSheetItem[] }) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="bottom">
      <DrawerOverlay />
      <DrawerContent borderTopRadius="20px" bg="sf" pb={4} aria-label="More">
        <DrawerBody px={4} pt={2} pb={0}>
          <Box w="36px" h="4px" borderRadius="2px" bg="ln2" mx="auto" mb={3} />
          <Text fontSize="12px" lineHeight="16px" fontWeight={600} letterSpacing="0.02em" color="tx2" mb={1} px={3}>
            Trip
          </Text>
          {items.map((item) => (
            <Flex
              key={item.key}
              as="button"
              type="button"
              onClick={() => {
                onClose();
                item.onClick();
              }}
              w="full"
              align="center"
              gap={3}
              minH="52px"
              px={3}
              borderRadius="md"
              _hover={{ bg: "sunk" }}
              textAlign="left"
            >
              <Icon as={item.icon} boxSize="20px" color="tx2" />
              <Text flex={1} fontSize="15px" fontWeight={500}>
                {item.label}
              </Text>
              {item.value && (
                <Text fontSize="13px" color="tx3">
                  {item.value}
                </Text>
              )}
              <Icon as={LuChevronRight} boxSize="18px" color="tx3" />
            </Flex>
          ))}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

