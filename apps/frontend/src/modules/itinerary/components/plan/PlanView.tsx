import {
  Box,
  Button,
  ButtonGroup,
  Collapse,
  Flex,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Skeleton,
  Stack,
  Text,
  useBreakpointValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuBedDouble,
  LuCheck,
  LuChevronDown,
  LuColumns2,
  LuEye,
  LuFileText,
  LuInfo,
  LuLayers,
  LuList,
  LuListChecks,
  LuMap,
  LuMapPin,
  LuNavigation2,
  LuRefreshCw,
  LuSparkles,
  LuTrainFront,
  LuUndo2,
  LuX,
  LuZap,
} from "react-icons/lu";
import { getApiErrorMessage } from "@/lib/api";
import {
  useAddStop,
  useDayRouteQuery,
  useGenerateItinerary,
  useItineraryQuery,
  useMoveItineraryStop,
  useMovePlaceToDay,
  useRemoveStop,
  useReorderItineraryStops,
  useSetStopLock,
  useSetStopStatus,
  useSummarizeItinerary,
  useUndoItinerary,
  useUpdateMealSlot,
} from "@/modules/itinerary/hooks/useItinerary";
import { useCommentsQuery, useWeatherQuery } from "@/modules/trips/hooks/useTrips";
import { CommentsDrawer, type CommentThreadTarget } from "@/modules/trips/components/collab/CommentsDrawer";
import { ItineraryExportMenu } from "@/modules/itinerary/components/ItineraryExportMenu";
import { MapView } from "@/modules/itinerary/components/MapView";
import { mapChromeSx } from "@/modules/itinerary/components/map-pins";
import { AskAiBar } from "@/modules/itinerary/components/plan/AskAiBar";
import { TripMapView } from "@/modules/itinerary/components/TripMapView";
import { PlaceDetailModal } from "@/modules/places/components/PlaceDetailModal";
import type { ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";
import { formatDayDate } from "@/modules/itinerary/utils/plan.utils";
import type { Trip } from "@/modules/trips/types/trip.types";
import { buildTripDayPlans, getEffectiveLegs, isDayOwnedByLeg } from "@/modules/trips/utils/trip-leg.utils";
import { addDays, getDayStartStay, getEffectiveStays, getUncoveredNights } from "@/modules/trips/utils/stay.utils";
import { ChoiceChip, PhotoFallback, Segmented, WarnDot } from "@/components/ui";
import { DayDot } from "@/components/ui/plan";
import { categoryIcon } from "@/components/ui/plan.utils";
import { DayCard } from "./DayCard";
import { EditStopModal } from "./EditStopModal";
import { AddStopModal } from "./AddStopModal";
import { MealPickerDrawer } from "./MealPickerDrawer";
import { PlanProvider, type PlanActions } from "./PlanContext";
import { StopQuickActions } from "./StopRow";

export type TripTab = "plan" | "places" | "stays" | "food" | "bookings" | "budget" | "checklist" | "guide";

interface PlanViewProps {
  trip: Trip;
  /** View-only members see the plan but can't change it. */
  canEdit: boolean;
  /** Whether the trip owner has a Google Maps key (real route times vs estimates). */
  hasMapsKey: boolean;
  hasAiKey: boolean;
  isOwner?: boolean;
  cityId: string | null;
  onCityChange: (legId: string | null) => void;
  onGoTo: (tab: TripTab, legId?: string) => void;
}

type StopTarget = { stop: ItineraryStop; day: ItineraryDay } | null;

/** Navbar (60) + plan toolbar (64). */
const TOOLBAR_TOP = "60px";
const PANE_TOP = "124px";

function PlanSkeleton() {
  return (
    <Stack spacing="10px" p={{ base: 4, md: 7 }} maxW="660px" aria-label="Loading your plan" role="status">
      {[70, 55, 80, 60].map((w, i) => (
        <HStack key={i} spacing="10px">
          <Skeleton w="44px" h="44px" borderRadius="8px" startColor="bg.subtle" endColor="border.line" />
          <Stack flex={1} spacing="6px">
            <Skeleton h="14px" w={`${w}%`} borderRadius="8px" startColor="bg.subtle" endColor="border.line" />
            <Skeleton h="12px" w={`${w - 20}%`} borderRadius="8px" startColor="bg.subtle" endColor="border.line" />
          </Stack>
        </HStack>
      ))}
    </Stack>
  );
}

function SetupStep({ done, index, title, description }: { done: boolean; index: number; title: string; description: string }) {
  return (
    <Flex gap="10px" align="flex-start">
      {done ? (
        <Flex w="24px" h="24px" borderRadius="full" bg="accent" color="accent.fg" align="center" justify="center" flexShrink={0}>
          <Icon as={LuCheck} boxSize="13px" />
        </Flex>
      ) : (
        <Flex w="24px" h="24px" borderRadius="full" borderWidth="1.5px" borderColor="border.line" color="fg.muted" fontSize="12px" fontWeight={700} align="center" justify="center" flexShrink={0}>
          {index}
        </Flex>
      )}
      <Box>
        <Text fontWeight={done ? 400 : 600} color={done ? "fg.muted" : "fg.default"}>
          {title}
        </Text>
        <Text fontSize="12px" color="fg.muted">
          {description}
        </Text>
      </Box>
    </Flex>
  );
}

export function PlanView({ trip, canEdit, hasMapsKey, hasAiKey, isOwner = true, cityId, onGoTo }: PlanViewProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const compact = useBreakpointValue({ base: true, lg: false }, { ssr: false }) ?? false;
  const { data, isLoading } = useItineraryQuery(trip.id);
  const itinerary = data?.itinerary ?? null;

  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  const [highlightedStopId, setHighlightedStopId] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<StopTarget>(null);
  const [mealTarget, setMealTarget] = useState<(StopTarget & { tab?: "nearby" | "saved" }) | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<StopTarget>(null);
  const [addDay, setAddDay] = useState<ItineraryDay | null>(null);
  const [busyStopId, setBusyStopId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<"day" | "trip">("day");
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [commentTarget, setCommentTarget] = useState<CommentThreadTarget | null>(null);
  const { data: commentsData } = useCommentsQuery(trip.id);
  const commentCounts = new Map<string, number>();
  for (const c of commentsData?.comments ?? []) {
    if (c.targetType === "stop") commentCounts.set(c.targetId, (commentCounts.get(c.targetId) ?? 0) + 1);
  }
  const summary = useDisclosure();
  const didntFit = useDisclosure();
  const dayRefs = useRef(new Map<number, HTMLDivElement>());

  const generate = useGenerateItinerary(trip.id);
  const undo = useUndoItinerary(trip.id);
  const setLock = useSetStopLock(trip.id);
  const remove = useRemoveStop(trip.id);
  const move = useMoveItineraryStop(trip.id);
  const reorder = useReorderItineraryStops(trip.id);
  const movePlaceToDay = useMovePlaceToDay(trip.id);
  const summarize = useSummarizeItinerary(trip.id);
  const addStop = useAddStop(trip.id);
  const setStopStatus = useSetStopStatus(trip.id);
  const updateMealSlot = useUpdateMealSlot(trip.id);
  const { data: weatherData } = useWeatherQuery(trip.id);
  const weatherByDate = new Map((weatherData?.days ?? []).map((w) => [w.date, w]));

  const legs = useMemo(() => getEffectiveLegs(trip), [trip]);
  const dayPlans = useMemo(() => buildTripDayPlans(trip), [trip]);
  const activeLeg = cityId ? legs.find((l) => l.id === cityId) : undefined;

  const days = useMemo(() => {
    const all = itinerary?.days ?? [];
    return activeLeg ? all.filter((d) => isDayOwnedByLeg(d.date, dayPlans, activeLeg.id)) : all;
  }, [itinerary, activeLeg, dayPlans]);

  const selectedDay =
    days.find((d) => d.dayNumber === selectedDayNumber) ?? days.find((d) => d.stops.length > 0) ?? days[0] ?? null;
  const { data: routeData } = useDayRouteQuery(trip.id, selectedDay?.dayNumber);
  const selectedRoute = routeData?.days.find((r) => r.dayNumber === selectedDay?.dayNumber) ?? null;

  const legForDay = (day: ItineraryDay) => legs.find((l) => l.id === day.legId);
  const startStayFor = (day: ItineraryDay) => {
    const leg = legForDay(day);
    return leg ? getDayStartStay(leg, day.date) : undefined;
  };
  const missingStayFor = (day: ItineraryDay) => {
    const leg = legForDay(day);
    if (!leg || day.dayType === "transfer" || startStayFor(day)) return false;
    return getUncoveredNights(leg).includes(addDays(day.date, -1));
  };
  const bookedTransfers = new Set(trip.bookings.map((b) => b.transferId).filter(Boolean));
  const unbookedTransferOn = (day: ItineraryDay) =>
    (trip.transfers ?? []).some((t) => t.date === day.date && !bookedTransfers.has(t.id));

  const selectedStart = selectedDay ? (startStayFor(selectedDay)?.coordinates ?? trip.hotelCoordinates) : undefined;
  // A travel day may have nothing located yet — show that city (from its other days) instead of a blank map.
  const mapFallback = selectedDay
    ? [...(itinerary?.days ?? [])]
        .sort((a, b) => Number(b.legId === selectedDay.legId) - Number(a.legId === selectedDay.legId))
        .flatMap((d) => d.stops)
        .find((s) => s.coordinates && s.stopType !== "transfer")?.coordinates
    : undefined;
  const selectedStop = selectedStopId ? selectedDay?.stops.find((s) => s.id === selectedStopId) : undefined;

  const optionalPlaces = (itinerary?.optionalPlaces ?? []).filter((p) => !activeLeg || p.legId === activeLeg.id);

  const run = async <T,>(fn: () => Promise<T>, success?: string, stopId?: string) => {
    if (stopId) setBusyStopId(stopId);
    try {
      const result = await fn();
      if (success) toast({ title: success, status: "success", duration: 2500 });
      return result;
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
      return undefined;
    } finally {
      if (stopId) setBusyStopId(null);
    }
  };

  const handleGenerate = async (legId?: string) => {
    const result = await run(() => generate.mutateAsync(legId));
    if (result) {
      toast({
        title: legId ? `${legs.find((l) => l.id === legId)?.name ?? "City"} replanned` : "Trip planned",
        description: "Locked stops and chosen restaurants were kept. Use Undo to go back.",
        status: "success",
        duration: 4000,
      });
    }
  };

  const scrollToDay = (dayNumber: number) =>
    window.setTimeout(() => dayRefs.current.get(dayNumber)?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);

  const selectDay = (dayNumber: number, scroll = false) => {
    setSelectedDayNumber(dayNumber);
    setExpandAll(false);
    setMapMode("day");
    if (selectedDay?.dayNumber !== dayNumber) setSelectedStopId(null);
    if (scroll) scrollToDay(dayNumber);
  };

  const selectStop = (stop: ItineraryStop | null, day?: ItineraryDay) => {
    setSelectedStopId(stop?.id ?? null);
    if (stop && day) {
      if (day.dayNumber !== selectedDay?.dayNumber) setSelectedDayNumber(day.dayNumber);
      setMapMode("day");
    }
  };

  const actions: PlanActions = {
    trip,
    readOnly: !canEdit,
    compact,
    openComments: (stop) => setCommentTarget({ type: "stop", id: stop.id, label: stop.placeName }),
    commentCount: (stopId) => commentCounts.get(stopId) ?? 0,
    highlightedStopId,
    setHighlightedStopId,
    selectedStopId,
    selectStop,
    busyStopId,
    openDetails: (stop, day) => setDetailsTarget({ stop, day }),
    openEdit: (stop, day) => setEditTarget({ stop, day }),
    openMealPicker: (stop, day, tab) => setMealTarget({ stop, day, tab }),
    chooseMeal: (stop, day, placeId, name) =>
      void run(() => updateMealSlot.mutateAsync({ dayNumber: day.dayNumber, stopId: stop.id, placeId }), `${name} planned`, stop.id),
    mealHints: (day) => hasMapsKey && canEdit && !compact && day.dayNumber === selectedDay?.dayNumber,
    openAddStop: (day) => setAddDay(day),
    toggleLock: (stop, day) =>
      void run(
        () => setLock.mutateAsync({ dayNumber: day.dayNumber, stopId: stop.id, locked: !stop.locked }),
        stop.locked ? "Unlocked" : "Locked to this day",
        stop.id,
      ),
    removeStop: (stop, day) =>
      void run(() => remove.mutateAsync({ dayNumber: day.dayNumber, stopId: stop.id }), `Removed ${stop.placeName}`, stop.id),
    moveStop: (stop, day, toDayNumber) =>
      void run(
        () => move.mutateAsync({ stopId: stop.id, fromDayNumber: day.dayNumber, toDayNumber }),
        `Moved to Day ${toDayNumber}`,
        stop.id,
      ),
    reorder: (day, stopIds) => void run(() => reorder.mutateAsync({ dayNumber: day.dayNumber, stopIds })),
    setStatus: (stop, day, status) =>
      void run(
        () => setStopStatus.mutateAsync({ dayNumber: day.dayNumber, stopId: stop.id, status }),
        status === "done" ? "Marked done" : status === "skipped" ? "Skipped — later stops moved up" : undefined,
        stop.id,
      ),
    addBookingToDay: (booking, day) => {
      const toMin = (t?: string) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : undefined);
      const start = toMin(booking.startTime);
      const end = booking.endDate && booking.endDate !== booking.startDate ? undefined : toMin(booking.endTime);
      const duration = start !== undefined && end !== undefined && end > start ? end - start : 90;
      void run(
        () =>
          addStop.mutateAsync({
            dayNumber: day.dayNumber,
            name: booking.title,
            fixedStartTime: booking.startTime,
            durationMinutes: Math.max(10, Math.min(duration, 720)),
            notes: booking.confirmationNumber ? `Conf. ${booking.confirmationNumber}` : undefined,
          }),
        `${booking.title} added at ${booking.startTime}`,
      );
    },
    moveTargets: (day) =>
      (itinerary?.days ?? [])
        .filter((d) => d.dayNumber !== day.dayNumber && d.dayType !== "transfer")
        .map((d) => ({
          dayNumber: d.dayNumber,
          label: `Day ${d.dayNumber} · ${formatDayDate(d.date, "EEE d")}${d.legName ? ` · ${d.legName}` : ""}`,
        })),
    goTo: (tab, legId) => onGoTo(tab, legId),
    replanCity: (legId) => void handleGenerate(legId),
    showDayOnMap: (day) => {
      selectDay(day.dayNumber);
      if (compact) setMobileView("map");
    },
  };

  if (isLoading) return <PlanSkeleton />;

  const selectedCount = legs.reduce((sum, l) => sum + l.selectedPlaceIds.length, 0);
  const uncoveredNights = legs.reduce((sum, l) => sum + getUncoveredNights(l).length, 0);
  const hasPlan = Boolean(itinerary?.days.some((d) => d.stops.some((s) => s.stopType !== "meal")));

  // ---------------------------------------------------------------- First use
  if (!hasPlan) {
    const next = selectedCount === 0 ? "places" : uncoveredNights > 0 ? "stays" : "generate";
    return (
      <Box px={{ base: 4, md: 7 }} pt={6} pb={8}>
        <Box bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl" p="22px" maxW="560px">
          <Icon as={LuMap} boxSize="26px" color="accent" />
          <Text as="h2" fontFamily="heading" fontWeight={600} fontSize="20px" mt="10px">
            Let's build your plan
          </Text>
          <Text fontSize="13px" color="fg.muted" mt={1} mb={4}>
            A day-by-day plan with real travel times, opening hours and meal breaks. You can drag, lock, add and remove stops afterwards — nothing is final.
          </Text>
          <Stack spacing="10px" mb={5}>
            <SetupStep
              index={1}
              done={selectedCount > 0}
              title="Pick places"
              description={selectedCount > 0 ? `${selectedCount} places picked` : "Browse suggestions for each city and add your favourites."}
            />
            <SetupStep
              index={2}
              done={uncoveredNights === 0}
              title="Add stays"
              description={
                uncoveredNights === 0
                  ? "Every night has a stay — days start and end there."
                  : `${uncoveredNights} night${uncoveredNights === 1 ? "" : "s"} without a stay. Optional, but it makes routes much better.`
              }
            />
            <SetupStep index={3} done={false} title="Generate plan" description="Takes a few seconds." />
          </Stack>
          {!canEdit ? (
            <Text fontSize="13px" color="fg.muted">
              The plan hasn't been generated yet — an editor can do it from here.
            </Text>
          ) : next === "places" ? (
            <Button w="full" leftIcon={<LuMapPin size={16} />} onClick={() => onGoTo("places", activeLeg?.id)}>
              Pick places
            </Button>
          ) : next === "stays" ? (
            <Stack spacing={2}>
              <Button w="full" leftIcon={<LuBedDouble size={16} />} onClick={() => onGoTo("stays", activeLeg?.id)}>
                Add stays
              </Button>
              <Button variant="ghost" w="full" leftIcon={<LuZap size={16} />} onClick={() => handleGenerate()} isLoading={generate.isPending} loadingText="Planning…">
                Generate without stays
              </Button>
            </Stack>
          ) : (
            <Button w="full" leftIcon={<LuZap size={16} />} onClick={() => handleGenerate()} isLoading={generate.isPending} loadingText="Planning…">
              Generate plan
            </Button>
          )}
        </Box>
      </Box>
    );
  }

  const aiExamples = [
    `Make day ${selectedDay?.dayNumber ?? 1} lighter`,
    "Keep mornings for the big sights",
    "Add a rooftop dinner",
    "Fewer walks",
  ];

  const tripStays = (activeLeg ? [activeLeg] : legs).flatMap((l) =>
    getEffectiveStays(l).flatMap((s) => (s.coordinates ? [{ name: s.name, coordinates: s.coordinates }] : [])),
  );

  const undoButton = itinerary?.undoLabel && canEdit && (
    <Button
      variant="outline"
      leftIcon={<LuUndo2 size={15} />}
      onClick={() => run(() => undo.mutateAsync(), `Undid: ${itinerary.undoLabel}`)}
      isLoading={undo.isPending}
      title={`${itinerary.historyCount} step${itinerary.historyCount === 1 ? "" : "s"} of history`}
      maxW={{ base: "auto", lg: "320px" }}
      flexShrink={1}
      minW={0}
    >
      <Text as="span" noOfLines={1} display={{ base: "none", lg: "block" }}>
        Undo: {itinerary.undoLabel}
      </Text>
      <Text as="span" display={{ base: "inline", lg: "none" }}>
        Undo
      </Text>
    </Button>
  );

  const replan = canEdit && (
    <ButtonGroup isAttached flexShrink={0}>
      <Button
        leftIcon={<LuRefreshCw size={15} />}
        onClick={() => handleGenerate(activeLeg?.id)}
        isLoading={generate.isPending || summarize.isPending}
        loadingText="Planning…"
        title="Locked stops, things you added and restaurants you chose are kept when you replan."
      >
        {activeLeg ? `Replan ${activeLeg.name || activeLeg.baseCity}` : "Replan"}
      </Button>
      <Menu placement="bottom-end">
        <MenuButton
          as={IconButton}
          aria-label="Replan options"
          icon={<LuChevronDown size={14} />}
          borderLeftWidth="1px"
          borderLeftColor="rgba(255,255,255,.35)"
          minW="34px"
          px="10px"
        />
        <MenuList fontSize="13px" maxW="320px" zIndex={1500}>
          {activeLeg && (
            <MenuItem icon={<LuRefreshCw />} onClick={() => handleGenerate(activeLeg.id)}>
              Replan {activeLeg.name || activeLeg.baseCity}
            </MenuItem>
          )}
          <MenuItem icon={<LuRefreshCw />} onClick={() => handleGenerate()}>
            Replan the whole trip
          </MenuItem>
          <MenuDivider />
          <MenuItem icon={<LuColumns2 />} onClick={() => navigate(`/trips/${trip.id}/itinerary/compare${activeLeg ? `?legId=${activeLeg.id}` : ""}`)}>
            Compare with an AI plan
          </MenuItem>
          <MenuItem icon={<LuFileText />} onClick={() => run(() => summarize.mutateAsync(), "Summary written")}>
            {itinerary?.summary ? "Rewrite trip summary" : "Write a trip summary (AI)"}
          </MenuItem>
          <MenuDivider />
          <Text px={3} py={1} fontSize="12px" color="fg.muted">
            Locked stops, things you added and restaurants you chose are kept when you replan.
          </Text>
        </MenuList>
      </Menu>
    </ButtonGroup>
  );

  const dayChip = (day: ItineraryDay) => {
    const on = !expandAll && day.dayNumber === selectedDay?.dayNumber;
    const warnings = day.stops.reduce((n, s) => n + (s.warnings?.length ?? 0), 0);
    const travel = day.dayType === "transfer" || day.stops.some((s) => s.stopType === "transfer");
    return (
      <ChoiceChip
        key={day.dayNumber}
        size="lg"
        selected={on}
        onClick={() => selectDay(day.dayNumber, true)}
        gap="7px"
        flexShrink={0}
        aria-label={`Day ${day.dayNumber}, ${formatDayDate(day.date, "EEE d MMM")}`}
      >
        <DayDot dayNumber={day.dayNumber} />
        <b>{day.dayNumber}</b>
        <Text as="span" fontWeight={400} color={on ? "accent.fg" : "fg.muted"}>
          {formatDayDate(day.date, "EEE d")}
        </Text>
        {travel && <Icon as={LuTrainFront} boxSize="13px" />}
        {(warnings > 0 || unbookedTransferOn(day)) && <WarnDot />}
      </ChoiceChip>
    );
  };

  const dayCards = (list: ItineraryDay[], collapseOthers: boolean) =>
    list.map((day) => {
      const stay = startStayFor(day);
      const isSelected = day.dayNumber === selectedDay?.dayNumber;
      return (
        <DayCard
          key={day.dayNumber}
          ref={(el) => {
            if (el) dayRefs.current.set(day.dayNumber, el);
            else dayRefs.current.delete(day.dayNumber);
          }}
          day={day}
          weather={weatherByDate.get(day.date)}
          bookings={trip.bookings.filter((b) => b.startDate === day.date && !b.transferId)}
          startStay={stay ? { name: stay.name, coordinates: stay.coordinates } : undefined}
          missingStay={missingStayFor(day)}
          unbookedTransfer={unbookedTransferOn(day)}
          isSelected={isSelected}
          collapsed={collapseOthers && !isSelected}
          onSelect={() => selectDay(day.dayNumber, !isSelected)}
        />
      );
    });

  const didntFitCard = optionalPlaces.length > 0 && (
    <Box bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl">
      <Flex as="button" type="button" w="full" align="center" gap="10px" px="14px" py={3} onClick={didntFit.onToggle} aria-expanded={didntFit.isOpen}>
        <Icon as={LuListChecks} boxSize="16px" color="fg.muted" />
        <Text fontWeight={600} flex={1} textAlign="left">
          Didn't fit · {optionalPlaces.length}
        </Text>
        <Icon as={LuChevronDown} boxSize="16px" transform={didntFit.isOpen ? "rotate(180deg)" : undefined} transition="transform .2s" />
      </Flex>
      <Collapse in={didntFit.isOpen} animateOpacity>
        <Box px="14px" pb="14px">
          <Text fontSize="12px" color="fg.muted" mb={3}>
            Picked, but no day had room. Add one to a day yourself — it'll be flagged if the day runs long.
          </Text>
          <Stack spacing={2}>
            {optionalPlaces.map((place) => (
              <Flex key={place.placeId} justify="space-between" align="center" p={3} borderWidth="1px" borderColor="border.line" borderRadius="md" gap={3} flexWrap="wrap">
                <HStack spacing="10px" minW={0} flex={1}>
                  <PhotoFallback seed={place.placeName} icon={categoryIcon(place.category)} w="36px" h="36px" borderRadius="8px" flexShrink={0} aria-hidden />
                  <Box minW={0}>
                    <Text fontWeight={600} fontSize="13px" noOfLines={1}>
                      {place.placeName}
                    </Text>
                    <Text fontSize="12px" color="fg.muted">
                      {place.reason}
                    </Text>
                  </Box>
                </HStack>
                {canEdit && (
                  <Menu isLazy>
                    <MenuButton as={Button} size="sm" variant="outline" rightIcon={<LuChevronDown />} isLoading={movePlaceToDay.isPending}>
                      Add to a day
                    </MenuButton>
                    <MenuList maxH="280px" overflowY="auto" fontSize="13px" zIndex={1500}>
                      {(itinerary?.days ?? [])
                        .filter((d) => d.dayType !== "transfer" && (!place.legId || d.legId === place.legId))
                        .map((d) => (
                          <MenuItem
                            key={d.dayNumber}
                            onClick={() =>
                              run(() => movePlaceToDay.mutateAsync({ placeId: place.placeId, toDayNumber: d.dayNumber }), `Added to Day ${d.dayNumber}`)
                            }
                          >
                            Day {d.dayNumber} · {formatDayDate(d.date, "EEE d MMM")}
                          </MenuItem>
                        ))}
                    </MenuList>
                  </Menu>
                )}
              </Flex>
            ))}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );

  const summaryCard = itinerary?.summary && !activeLeg && (
    <Flex bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl" px="14px" py="10px" gap={3} align="flex-start">
      <Icon as={LuSparkles} boxSize="16px" color="accent.text" mt="3px" flexShrink={0} />
      <Box flex={1} minW={0} fontSize="12px">
        <Text as="span" fontWeight={600}>
          Trip summary
        </Text>
        <Text as="span" color="fg.muted">
          {" "}
          · AI-written ·{" "}
        </Text>
        {summary.isOpen ? (
          <Text whiteSpace="pre-wrap" lineHeight="tall" mt={1} fontSize="13px">
            {itinerary.summary}
          </Text>
        ) : (
          <Text as="span" color="fg.muted" noOfLines={2} display="inline">
            {itinerary.summary.split("\n")[0]}
          </Text>
        )}
      </Box>
      <IconButton
        aria-label={summary.isOpen ? "Collapse summary" : "Expand summary"}
        title={summary.isOpen ? "Collapse summary" : "Expand summary"}
        icon={<LuChevronDown size={18} style={{ transform: summary.isOpen ? "rotate(180deg)" : undefined, transition: "transform .2s" }} />}
        variant="outline"
        onClick={summary.onToggle}
        flexShrink={0}
      />
    </Flex>
  );

  const directionsUrl = selectedStop?.coordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${selectedStop.coordinates.lat},${selectedStop.coordinates.lng}${selectedStop.placeId ? `&destination_place_id=${selectedStop.placeId}` : ""}`
    : null;

  const selectedStopCard = mapMode === "day" && selectedStop && selectedDay && (
    <Flex
      direction="column"
      gap={2}
      position="absolute"
      zIndex={1000}
      top="60px"
      left="14px"
      w="290px"
      maxW="calc(100% - 28px)"
      p={3}
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.line"
      borderRadius="xl"
      boxShadow="raised"
    >
      <HStack spacing="10px" align="flex-start">
        <PhotoFallback seed={selectedStop.placeName} icon={categoryIcon(selectedStop.category, selectedStop.stopType)} w="56px" h="56px" borderRadius="10px" flexShrink={0} aria-hidden />
        <Box flex={1} minW={0}>
          <Text fontWeight={600} noOfLines={2}>
            {selectedStop.placeName}
          </Text>
          <Text fontSize="12px" color="fg.muted">
            {[selectedStop.category, selectedStop.openingHoursToday ? (selectedStop.openingHoursToday === "Closed" ? "Closed today" : `Open ${selectedStop.openingHoursToday}`) : `${selectedStop.arrivalTime}–${selectedStop.departureTime}`]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </Box>
        <IconButton aria-label="Close" icon={<LuX size={14} />} size="xs" variant="ghost" onClick={() => setSelectedStopId(null)} />
      </HStack>
      <HStack spacing="6px">
        {selectedStop.placeId && (
          <Button variant="outline" leftIcon={<LuEye size={16} />} onClick={() => setDetailsTarget({ stop: selectedStop, day: selectedDay })}>
            Details
          </Button>
        )}
        {directionsUrl && (
          <Button as="a" href={directionsUrl} target="_blank" rel="noopener noreferrer" variant="outline" leftIcon={<LuNavigation2 size={16} />}>
            Directions
          </Button>
        )}
      </HStack>
    </Flex>
  );

  const renderMap = (height: string, zoomControl: boolean) =>
    mapMode === "trip" ? (
      <TripMapView
        days={days}
        stays={tripStays}
        height={height}
        zoomControl={zoomControl}
        onSelectDay={(dayNumber) => selectDay(dayNumber, true)}
      />
    ) : (
      <MapView
        day={selectedDay}
        hotelCoordinates={selectedStart}
        route={selectedRoute}
        height={height}
        highlightedStopId={highlightedStopId}
        selectedStopId={selectedStopId}
        fallbackCenter={mapFallback}
        zoomControl={zoomControl}
        onStopClick={(stopId) => {
          const stop = selectedDay?.stops.find((s) => s.id === stopId) ?? null;
          selectStop(stop, selectedDay ?? undefined);
          if (!compact) window.setTimeout(() => document.querySelector(`[data-stop-id="${stopId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
        }}
      />
    );

  const mapToggle = (
    <Segmented
      value={mapMode}
      onChange={(v) => {
        setMapMode(v);
        if (v === "trip") setSelectedStopId(null);
      }}
      bg="bg.surface"
      boxShadow="raised"
      borderWidth="1px"
      borderColor="border.line"
      options={[
        { value: "day", label: selectedDay ? `Day ${selectedDay.dayNumber}` : "Day" },
        { value: "trip", label: activeLeg ? activeLeg.name || activeLeg.baseCity : "Whole trip" },
      ]}
    />
  );

  return (
    <PlanProvider value={actions}>
      {/* ---------------- Desktop toolbar ---------------- */}
      <Flex
        display={{ base: "none", lg: "flex" }}
        position="sticky"
        top={TOOLBAR_TOP}
        zIndex={20}
        h="64px"
        px={7}
        bg="bg.canvas"
        borderBottomWidth="1px"
        borderColor="border.line"
        align="center"
        justify="space-between"
        gap={4}
      >
        <Flex
          role="group"
          aria-label="Days"
          gap="6px"
          flex={1}
          minW={0}
          overflowX="auto"
          py={1}
          sx={{ scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
        >
          <ChoiceChip
            size="lg"
            icon={LuLayers}
            selected={expandAll}
            flexShrink={0}
            onClick={() => {
              setExpandAll(true);
              setMapMode("trip");
              setSelectedStopId(null);
            }}
          >
            All days
          </ChoiceChip>
          {days.map(dayChip)}
        </Flex>
        <HStack spacing={2} flexShrink={0} minW={0}>
          {undoButton}
          {itinerary && <ItineraryExportMenu trip={trip} itinerary={itinerary} />}
          {replan}
        </HStack>
      </Flex>

      {/* ---------------- Phone toolbar ---------------- */}
      <Box display={{ base: "block", lg: "none" }} bg="bg.canvas">
        <Flex gap="6px" px={4} py="10px" overflowX="auto" sx={{ scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
          {days.map((day) => {
            const on = day.dayNumber === selectedDay?.dayNumber;
            return (
              <Flex
                key={day.dayNumber}
                as="button"
                type="button"
                onClick={() => selectDay(day.dayNumber)}
                aria-pressed={on}
                aria-label={`Day ${day.dayNumber}, ${formatDayDate(day.date, "EEE d MMM")}`}
                direction="column"
                align="center"
                justify="center"
                h="44px"
                px={3}
                flexShrink={0}
                borderRadius="xl"
                borderWidth="1px"
                borderColor={on ? "accent" : "border.line"}
                bg={on ? "accent" : "bg.surface"}
                color={on ? "accent.fg" : "fg.default"}
                position="relative"
              >
                <Text fontWeight={700} fontSize="13px" lineHeight={1.2}>
                  {day.dayNumber}
                </Text>
                <Text fontSize="12px" lineHeight={1.2} whiteSpace="nowrap">
                  {formatDayDate(day.date, "EEE d")}
                </Text>
              </Flex>
            );
          })}
        </Flex>
        <Flex px={4} pt={1} pb="10px" justify="space-between" align="center" gap={2}>
          <Segmented
            value={mobileView}
            onChange={setMobileView}
            options={[
              { value: "list", label: "List", icon: LuList },
              { value: "map", label: "Map", icon: LuMap },
            ]}
          />
          <HStack spacing={2} minW={0}>
            {undoButton}
            {canEdit && (
              <IconButton aria-label="Replan" icon={<LuRefreshCw size={16} />} variant="outline" onClick={() => handleGenerate(activeLeg?.id)} isLoading={generate.isPending} />
            )}
          </HStack>
        </Flex>
      </Box>

      {/* ---------------- Panes ---------------- */}
      <Flex align="flex-start">
        <Flex
          direction="column"
          gap="14px"
          w={{ base: "full", lg: "500px", xl: "660px" }}
          flexShrink={0}
          minW={0}
          minH={{ lg: `calc(100vh - ${PANE_TOP})` }}
          px={{ base: 4, lg: 6 }}
          pt={{ base: 0, lg: "18px" }}
          pb={{ base: canEdit ? "76px" : 4, lg: 4 }}
          bg="bg.canvas"
          borderRightWidth={{ base: 0, lg: "1px" }}
          borderColor="border.line"
          display={{ base: compact && mobileView === "map" ? "none" : "flex", lg: "flex" }}
        >
          {!compact && summaryCard}
          {compact ? (selectedDay ? dayCards([selectedDay], false) : null) : dayCards(days, !expandAll)}
          {didntFitCard}
          {!hasMapsKey && (
            <HStack spacing={2} fontSize="12px" color="fg.muted" align="flex-start">
              <Icon as={LuInfo} boxSize="14px" mt="1px" />
              <Text>Travel times are estimates from distance. With a Google Maps key they come from real routes.</Text>
            </HStack>
          )}
          {canEdit && itinerary && itinerary.days.length > 0 && !compact && (
            <Box position={hasAiKey ? "sticky" : "static"} bottom={4} zIndex={10} mt="auto">
              <AskAiBar tripId={trip.id} hasAiKey={hasAiKey} isOwner={isOwner} examples={aiExamples} />
            </Box>
          )}
        </Flex>

        {/* Desktop map */}
        <Box
          display={{ base: "none", lg: "block" }}
          flex={1}
          minW={0}
          position="sticky"
          top={PANE_TOP}
          h={`calc(100vh - ${PANE_TOP})`}
          bg="map.land"
          isolation="isolate"
          sx={mapChromeSx}
        >
          {!compact && renderMap("100%", true)}
          <Box position="absolute" zIndex={1000} top="14px" left="14px">
            {mapToggle}
          </Box>
          {mapMode === "day" && selectedDay && (
            <HStack
              position="absolute"
              zIndex={1000}
              top="14px"
              right="60px"
              spacing="6px"
              px="10px"
              py="6px"
              bg="bg.surface"
              borderRadius="md"
              boxShadow="raised"
              borderWidth="1px"
              borderColor="border.line"
            >
              <DayDot dayNumber={selectedDay.dayNumber} size={12} />
              <Text fontSize="12px" fontWeight={600}>
                {formatDayDate(selectedDay.date, "EEE d MMM")}
              </Text>
            </HStack>
          )}
          {selectedStopCard}
        </Box>

        {/* Phone map */}
        {compact && mobileView === "map" && (
          <Box w="full" pb={canEdit ? "76px" : 4}>
            <Box position="relative" h="calc(100vh - 380px)" minH="340px" isolation="isolate" sx={mapChromeSx}>
              {renderMap("100%", false)}
              <Box position="absolute" zIndex={1000} top="10px" right="10px">
                <Segmented
                  value={mapMode}
                  onChange={setMapMode}
                  bg="bg.surface"
                  boxShadow="raised"
                  options={[
                    { value: "day", label: "Day" },
                    { value: "trip", label: "Trip" },
                  ]}
                />
              </Box>
            </Box>
            {mapMode === "day" && selectedDay && (
              <Box bg="bg.surface" borderTopRadius="20px" boxShadow="raised" px={4} pt={2} pb={3} mt="-24px" position="relative" zIndex={1001}>
                <Box w="40px" h="4px" borderRadius="2px" bg="border.line" mx="auto" mb={2} />
                <Text fontWeight={700} mb="10px">
                  {selectedDay.stops.filter((s) => s.stopType !== "meal" && s.stopType !== "return" && s.stopType !== "transfer").length} stops
                  {(() => {
                    const km = Math.round(selectedDay.stops.reduce((n, s) => n + (s.travelDistanceKm ?? 0), 0) * 10) / 10;
                    return km > 0 ? ` · ${km} km` : "";
                  })()}
                </Text>
                <Flex gap="10px" overflowX="auto" sx={{ scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                  {selectedDay.stops
                    .filter((s) => s.stopType !== "meal" && s.stopType !== "return" && s.stopType !== "transfer")
                    .map((stop, i) => {
                      const on = stop.id === selectedStopId;
                      return (
                        <Flex
                          key={stop.id}
                          as="button"
                          type="button"
                          direction="column"
                          gap={1}
                          p={3}
                          w="200px"
                          minH="88px"
                          flexShrink={0}
                          textAlign="left"
                          bg="bg.surface"
                          borderWidth={on ? "1.5px" : "1px"}
                          borderColor={on ? "accent" : "border.line"}
                          borderRadius="xl"
                          onClick={() => (on && stop.placeId ? setDetailsTarget({ stop, day: selectedDay }) : selectStop(stop, selectedDay))}
                        >
                          <HStack spacing={2}>
                            <Flex w="24px" h="24px" borderRadius="full" bg={`day.${((selectedDay.dayNumber - 1) % 8) + 1}`} color="pin.fg" fontSize="12px" fontWeight={700} align="center" justify="center" flexShrink={0}>
                              {i + 1}
                            </Flex>
                            <Text fontWeight={700} noOfLines={1}>
                              {stop.placeName}
                            </Text>
                          </HStack>
                          <Text fontSize="12px" color="fg.muted">
                            {stop.arrivalTime} · {on && stop.placeId ? "tap for details" : "tap to show"}
                          </Text>
                        </Flex>
                      );
                    })}
                </Flex>
              </Box>
            )}
          </Box>
        )}
      </Flex>

      {/* Phone Ask AI, above the trip nav */}
      {compact && canEdit && mobileView === "list" && itinerary && itinerary.days.length > 0 && (
        <Box position="fixed" left={0} right={0} bottom="68px" zIndex="sticky" bg="bg.surface" borderTopWidth="1px" borderColor="border.line" px={4} py={2}>
          <AskAiBar tripId={trip.id} hasAiKey={hasAiKey} isOwner={isOwner} compact />
        </Box>
      )}

      <CommentsDrawer trip={trip} target={commentTarget} onClose={() => setCommentTarget(null)} />
      <EditStopModal tripId={trip.id} currency={trip.currency} target={editTarget} onClose={() => setEditTarget(null)} />
      <MealPickerDrawer
        tripId={trip.id}
        target={mealTarget ? { stop: mealTarget.stop, day: mealTarget.day } : null}
        initialTab={mealTarget?.tab ?? "nearby"}
        city={mealTarget ? legForDay(mealTarget.day)?.baseCity : undefined}
        country={mealTarget ? legForDay(mealTarget.day)?.country : trip.destinationCountry}
        onSkip={
          mealTarget && canEdit
            ? () => {
                actions.removeStop(mealTarget.stop, mealTarget.day);
                setMealTarget(null);
              }
            : undefined
        }
        onClose={() => setMealTarget(null)}
      />
      <AddStopModal
        tripId={trip.id}
        day={addDay}
        city={addDay ? legForDay(addDay)?.baseCity : undefined}
        country={addDay ? legForDay(addDay)?.country : trip.destinationCountry}
        onClose={() => setAddDay(null)}
      />
      {detailsTarget && (() => {
        const day = itinerary?.days.find((d) => d.dayNumber === detailsTarget.day.dayNumber) ?? detailsTarget.day;
        const stop = day.stops.find((s) => s.id === detailsTarget.stop.id) ?? detailsTarget.stop;
        return (
        <PlaceDetailModal
          isOpen
          onClose={() => setDetailsTarget(null)}
          trip={trip}
          legId={day.legId ?? legs[0]?.id ?? ""}
          placeId={stop.placeId}
          isSelected
          onSelectedChange={() => undefined}
          hideTripToggle
          planInfo={`Day ${day.dayNumber} · ${stop.arrivalTime}–${stop.departureTime}${stop.locked ? " · locked" : ""}${stop.fixedStartTime ? ` · fixed ${stop.fixedStartTime}` : ""}`}
          actions={<StopQuickActions stop={stop} day={day} onDone={() => setDetailsTarget(null)} />}
          fallback={{ name: stop.placeName, category: stop.category, city: day.legName }}
        />
        );
      })()}
    </PlanProvider>
  );
}
