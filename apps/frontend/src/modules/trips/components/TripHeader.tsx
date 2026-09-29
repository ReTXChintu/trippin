import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  HStack,
  Icon,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  Tooltip,
  useDisclosure,
} from "@chakra-ui/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  LuCalendar,
  LuChevronRight,
  LuClock,
  LuMessageSquare,
  LuNavigation2,
  LuPencil,
  LuSlidersHorizontal,
  LuSun,
} from "react-icons/lu";
import { Pill, type Tone } from "@/components/ui";
import { dayToken } from "@/components/ui/day";
import { PanelHeader } from "@/components/ui/plan";
import { modeIcon } from "@/components/ui/plan.utils";
import { useCommentsQuery, useTripMembersQuery } from "@/modules/trips/hooks/useTrips";
import { CommentsDrawer } from "@/modules/trips/components/collab/CommentsDrawer";
import { AddLegModal } from "@/modules/trips/components/AddLegModal";
import { LegOverviewPanel } from "@/modules/trips/components/LegOverviewPanel";
import { TripActionsMenu } from "@/modules/trips/components/TripActionsMenu";
import { TripHeaderPanel } from "@/modules/trips/components/TripHeaderPanel";
import { StageBanner, StageBar } from "@/modules/trips/components/workspace/StageBar";
import { CityRow } from "@/modules/trips/components/workspace/CityRow";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TransportationMode } from "@/types";
import type { NextStep, StageSummary, TripStage, TripTabKey } from "@/modules/trips/utils/trip-stage";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import { formatDayDate } from "@/modules/itinerary/utils/plan.utils";
import type { ItineraryExportActions } from "@/modules/itinerary/components/useItineraryExport";

const STATUS: Record<Trip["status"], { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  active: { label: "Active", tone: "success" },
  completed: { label: "Completed", tone: "accent" },
  archived: { label: "Archived", tone: "warn" },
};

const MODE_LABEL: Record<TransportationMode, string> = {
  Walking: "Walking",
  Cab: "Taxi / cab",
  "Self Drive": "Self-drive",
  Bike: "Bike",
  "Public Transport": "Public transport",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/** "5–11 Oct 2026" / "28 Sep – 3 Oct 2026". */
function dateRange(start: string, end: string): string {
  const s = start.slice(0, 10);
  const e = end.slice(0, 10);
  const sameMonth = formatDayDate(s, "MMM yyyy") === formatDayDate(e, "MMM yyyy");
  return sameMonth ? `${formatDayDate(s, "d")}–${formatDayDate(e, "d MMM yyyy")}` : `${formatDayDate(s, "d MMM")} – ${formatDayDate(e, "d MMM yyyy")}`;
}

function shortRange(start: string, end: string): string {
  const s = start.slice(0, 10);
  const e = end.slice(0, 10);
  return formatDayDate(s, "MMM") === formatDayDate(e, "MMM")
    ? `${formatDayDate(s, "d")}–${formatDayDate(e, "d MMM")}`
    : `${formatDayDate(s, "d MMM")} – ${formatDayDate(e, "d MMM")}`;
}

interface TripHeaderProps {
  trip: Trip;
  currentUserId: string;
  isOwner: boolean;
  canEdit: boolean;
  cityId: string | null;
  stages: StageSummary;
  exportActions: ItineraryExportActions;
  onGo: (tab: TripTabKey, legId?: string | null) => void;
  onCity: (legId: string | null) => void;
  onCityAdded: (legId: string) => void;
  /** Trip settings drawer — owned by the page so other tabs (and the phone More sheet) can open it. */
  settings: { isOpen: boolean; onOpen: () => void; onClose: () => void };
  /** Discussion drawer — also owned by the page. */
  discussion: { isOpen: boolean; onOpen: () => void; onClose: () => void };
  /** Desktop tab bar, rendered at the bottom of the header band. */
  tabs?: React.ReactNode;
  /** Banners (missing keys, view-only) shown at the top of the band. */
  banners?: React.ReactNode;
}

export function TripHeader({
  trip,
  currentUserId,
  isOwner,
  canEdit,
  cityId,
  stages,
  exportActions,
  onGo,
  onCity,
  onCityAdded,
  settings,
  discussion,
  tabs,
  banners,
}: TripHeaderProps) {
  const navigate = useNavigate();
  const addCity = useDisclosure();
  const [editingLegId, setEditingLegId] = useState<string | null>(null);
  const { data: commentsData } = useCommentsQuery(trip.id);
  const { data: membersData } = useTripMembersQuery(trip.id);
  const tripComments = (commentsData?.comments ?? []).filter((c) => c.targetType === "trip").length;
  const members = membersData?.members ?? [];

  const legs = getEffectiveLegs(trip);
  const editingLeg = trip.legs.find((l) => l.id === editingLegId);
  const start = trip.startDate.slice(0, 10);
  const end = trip.endDate.slice(0, 10);
  const totalDays = (() => {
    try {
      return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
    } catch {
      return undefined;
    }
  })();
  const now = new Date();
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isTripToday = todayLocal >= start && todayLocal <= end;
  const daysToStart = (() => {
    try {
      return differenceInCalendarDays(parseISO(start), parseISO(todayLocal));
    } catch {
      return undefined;
    }
  })();
  const ModeIcon = modeIcon(trip.transportationMode);
  const status = STATUS[trip.status];
  const todayHref = `/trips/${trip.id}/today`;

  const timing =
    daysToStart === undefined
      ? null
      : daysToStart > 0
        ? daysToStart === 1
          ? "Starts tomorrow"
          : `Starts in ${daysToStart} days`
        : isTripToday
          ? `Day ${1 - daysToStart} of ${totalDays}`
          : null;

  const handleStage = (stage: TripStage) => {
    if (stage.tab) onGo(stage.tab);
    else if (stage.key === "travel") navigate(todayHref);
  };

  const handleNext = (next: NextStep) => {
    if (next.today) navigate(todayHref);
    else if (next.tab) onGo(next.tab, next.legId ?? undefined);
    else if (trip.legs.length > 0 && canEdit) addCity.onOpen();
    else settings.onOpen();
  };

  const canAddCity = canEdit && trip.legs.length > 0;

  return (
    <Box>
      {banners}

      {/* ---------- Desktop ---------- */}
      <Box display={{ base: "none", lg: "block" }}>
        <Flex justify="space-between" align="flex-start" gap={4} mb={3} flexWrap="wrap">
          <Box minW={0}>
            <HStack as="nav" aria-label="Breadcrumb" spacing={2} fontSize="13px" color="fg.muted">
              <Link to="/trips">My trips</Link>
              <Icon as={LuChevronRight} boxSize="12px" />
              <Text as="span" aria-current="page" noOfLines={1}>
                {trip.title}
              </Text>
            </HStack>
            <HStack spacing={3} mt={1} flexWrap="wrap">
              <Text as="h1" fontFamily="heading" fontWeight={600} fontSize="28px" lineHeight={1.2} letterSpacing="-0.01em">
                {trip.title}
              </Text>
              <Pill tone={status.tone} icon={trip.status === "draft" ? LuPencil : undefined}>
                {status.label}
              </Pill>
              {timing && (
                <Pill tone="accent" icon={LuCalendar}>
                  {timing}
                </Pill>
              )}
            </HStack>
            <Flex gap={4} mt="2px" fontSize="13px" color="fg.muted" flexWrap="wrap">
              <HStack spacing="6px">
                <Icon as={LuCalendar} boxSize="14px" />
                <Text>
                  {dateRange(start, end)}
                  {totalDays ? ` · ${totalDays} day${totalDays === 1 ? "" : "s"}` : ""}
                </Text>
              </HStack>
              <HStack spacing="6px">
                <Icon as={ModeIcon} boxSize="14px" />
                <Text>{MODE_LABEL[trip.transportationMode] ?? trip.transportationMode}</Text>
              </HStack>
              <HStack spacing="6px">
                <Icon as={LuClock} boxSize="14px" />
                <Text>{trip.travelStyle === "Fast Paced" ? "Fast pace" : `${trip.travelStyle} pace`}</Text>
              </HStack>
              <HStack spacing="6px">
                <Icon as={LuSun} boxSize="14px" />
                <Text>
                  {trip.dailyStartTime}–{trip.dailyEndTime} daily
                </Text>
              </HStack>
            </Flex>
          </Box>

          <HStack spacing={2} flexWrap="wrap">
            <Button variant="outline" leftIcon={<LuMessageSquare size={16} />} onClick={discussion.onOpen}>
              Discussion
              {tripComments > 0 && (
                <Pill tone="accent" h="20px" px="7px" ml={1}>
                  {tripComments}
                </Pill>
              )}
            </Button>
            {members.length > 1 && (
              <Tooltip label={members.map((m) => m.name).join(", ")} hasArrow>
                <Flex
                  as="button"
                  type="button"
                  onClick={settings.onOpen}
                  pl="8px"
                  mr="6px"
                  aria-label={`${members.length} people on this trip — manage members`}
                >
                  {members.slice(0, 4).map((m, i) => (
                    <Flex
                      key={m.id}
                      ml="-8px"
                      w="30px"
                      h="30px"
                      borderRadius="full"
                      bg={dayToken(i + 1)}
                      color="pin.fg"
                      fontSize="12px"
                      fontWeight={700}
                      align="center"
                      justify="center"
                      borderWidth="2px"
                      borderColor="bg.surface"
                    >
                      {initials(m.name)}
                    </Flex>
                  ))}
                  {members.length > 4 && (
                    <Flex ml="-8px" w="30px" h="30px" borderRadius="full" bg="bg.subtle" color="fg.muted" fontSize="12px" fontWeight={700} align="center" justify="center" borderWidth="2px" borderColor="bg.surface">
                      +{members.length - 4}
                    </Flex>
                  )}
                </Flex>
              </Tooltip>
            )}
            {isTripToday ? (
              <Button as={Link} to={todayHref} leftIcon={<LuNavigation2 size={16} />}>
                Today
              </Button>
            ) : (
              <Button
                as={Link}
                to={todayHref}
                variant="outline"
                leftIcon={<LuNavigation2 size={16} />}
                title={daysToStart && daysToStart > 0 ? `Today unlocks on ${formatDayDate(start, "d MMM")}` : undefined}
              >
                Preview Today
              </Button>
            )}
            <Button variant="outline" leftIcon={<LuSlidersHorizontal size={16} />} onClick={settings.onOpen}>
              Trip settings
            </Button>
            <TripActionsMenu trip={trip} isOwner={isOwner} exportActions={exportActions} />
          </HStack>
        </Flex>

        <StageBar summary={stages} onStage={handleStage} onNext={handleNext} />

        <Box py="10px" borderTopWidth="1px" borderColor="border.line">
          <CityRow
            trip={trip}
            legs={legs}
            cityId={cityId}
            onCity={onCity}
            onEditCity={trip.legs.length > 0 && canEdit ? setEditingLegId : undefined}
            onAddCity={canAddCity ? addCity.onOpen : undefined}
            onTransfer={() => onGo("bookings")}
          />
        </Box>

        {tabs}
      </Box>

      {/* ---------- Phone ---------- */}
      <Box display={{ base: "block", lg: "none" }} mx={-4}>
        <Flex justify="space-between" align="flex-start" pl={4} pr={2} pt={2} pb={1}>
          <Box minW={0}>
            <Text as="h1" fontFamily="heading" fontWeight={600} fontSize="22px" lineHeight={1.2} noOfLines={2}>
              {trip.title}
            </Text>
            <Text fontSize="13px" color="fg.muted">
              {shortRange(start, end)}
              {totalDays ? ` · ${totalDays} day${totalDays === 1 ? "" : "s"}` : ""} · {trip.travelStyle}
            </Text>
          </Box>
          <HStack spacing={0} flexShrink={0}>
            <IconButton aria-label="Discussion" icon={<LuMessageSquare size={18} />} variant="ghost" color="fg.default" size="lg" onClick={discussion.onOpen} />
            <IconButton aria-label="Trip settings" icon={<LuSlidersHorizontal size={18} />} variant="ghost" color="fg.default" size="lg" onClick={settings.onOpen} />
            <TripActionsMenu trip={trip} isOwner={isOwner} exportActions={exportActions} variant="ghost" size="lg" />
          </HStack>
        </Flex>
        <StageBanner summary={stages} onNext={handleNext} />
        <Box px={4} pb={2}>
          <CityRow
            trip={trip}
            legs={legs}
            cityId={cityId}
            onCity={onCity}
            onEditCity={trip.legs.length > 0 && canEdit ? setEditingLegId : undefined}
            onTransfer={() => onGo("bookings")}
            compact
          />
        </Box>
      </Box>

      <Drawer isOpen={settings.isOpen} onClose={settings.onClose} size="md" placement="right">
        <DrawerOverlay />
        <DrawerContent maxW={{ base: "100vw", md: "540px" }} bg="bg.surface">
          <PanelHeader title="Trip settings" subtitle={trip.title} onClose={settings.onClose} />
          <DrawerBody px={6} py={5}>
            <TripHeaderPanel trip={trip} currentUserId={currentUserId} isOwner={isOwner} embedded />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Modal isOpen={Boolean(editingLeg)} onClose={() => setEditingLegId(null)} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="heading" fontSize="22px">
            {editingLeg?.name || editingLeg?.baseCity}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>{editingLeg && <LegOverviewPanel trip={trip} leg={editingLeg} />}</ModalBody>
        </ModalContent>
      </Modal>

      <CommentsDrawer
        trip={trip}
        target={discussion.isOpen ? { type: "trip", id: "", label: trip.title } : null}
        onClose={discussion.onClose}
      />

      <AddLegModal
        isOpen={addCity.isOpen}
        onClose={addCity.onClose}
        trip={trip}
        onAdded={(legId) => {
          addCity.onClose();
          onCityAdded(legId);
        }}
      />
    </Box>
  );
}
