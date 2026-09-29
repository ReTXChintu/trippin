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

/** Desktop tab row: icon, label, count. Underline on the active tab. */
export function TripTabBar({ tab, badges, onChange }: { tab: TripTabKey; badges: TabBadges; onChange: (t: TripTabKey) => void }) {
  return (
    <Flex
      role="tablist"
      aria-label="Trip sections"
      pl="2px"
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
            h="44px"
            px={1}
            mr="22px"
            flexShrink={0}
            fontSize="14px"
            fontWeight={on ? 600 : 500}
            color={on ? "fg.default" : "fg.muted"}
            borderBottomWidth="2px"
            borderColor={on ? "accent" : "transparent"}
            whiteSpace="nowrap"
            _hover={{ color: "fg.default" }}
            _focusVisible={{ outline: "2px solid", outlineColor: "accent", outlineOffset: "-2px" }}
          >
            <Icon as={t.icon} boxSize="16px" />
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
      gap="2px"
      minH="44px"
      color={on ? "accent.text" : "fg.muted"}
      aria-current={on ? "page" : undefined}
    >
      <Icon as={icon} boxSize="22px" />
      <Text fontSize="12px" fontWeight={on ? 600 : 500}>
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
      h="68px"
      px="6px"
      pb="env(safe-area-inset-bottom)"
      bg="bg.surface"
      borderTopWidth="1px"
      borderColor="border.line"
      display={{ base: "flex", lg: "none" }}
      sx={{ "@media print": { display: "none" } }}
    >
      <NavItem icon={LuMap} label="Plan" on={tab === "plan" && !moreOpen} onClick={() => onTab("plan")} />
      <NavItem icon={LuMapPin} label="Places" on={tab === "places" && !moreOpen} onClick={() => onTab("places")} />
      <Flex as={Link} to={todayHref} flex={1} direction="column" align="center" gap="2px" mt="-14px" aria-label="Today">
        <Flex w="52px" h="52px" borderRadius="full" bg="accent" color="accent.fg" boxShadow="raised" align="center" justify="center">
          <Icon as={LuNavigation2} boxSize="24px" />
        </Flex>
        <Text fontSize="12px" fontWeight={600} color="fg.default">
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
      <DrawerContent borderTopRadius="20px" bg="bg.surface" pb={4} aria-label="More">
        <DrawerBody px={4} pt={2} pb={0}>
          <Box w="40px" h="4px" borderRadius="2px" bg="border.line" mx="auto" mb={2} />
          <Text fontSize="12px" fontWeight={600} textTransform="uppercase" letterSpacing="0.06em" color="fg.muted" mb={1}>
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
              h="52px"
              px={3}
              borderRadius="md"
              _hover={{ bg: "bg.subtle" }}
              textAlign="left"
            >
              <Icon as={item.icon} boxSize="20px" />
              <Text flex={1} fontWeight={600}>
                {item.label}
              </Text>
              {item.value && (
                <Text fontSize="13px" color="fg.muted">
                  {item.value}
                </Text>
              )}
              <Icon as={LuChevronRight} boxSize="14px" color="fg.muted" />
            </Flex>
          ))}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

