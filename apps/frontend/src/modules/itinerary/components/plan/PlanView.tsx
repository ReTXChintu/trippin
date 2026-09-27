import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  ButtonGroup,
  Circle,
  Collapse,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Stack,
  Text,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCheck,
  FiChevronDown,
  FiCornerUpLeft,
  FiFileText,
  FiMapPin,
  FiRefreshCw,
  FiZap,
} from "react-icons/fi";
import { MdHotel } from "react-icons/md";
import { getApiErrorMessage } from "@/lib/api";
import {
  useDayRouteQuery,
  useGenerateItinerary,
  useItineraryQuery,
  useMoveItineraryStop,
  useMovePlaceToDay,
  useRemoveStop,
  useReorderItineraryStops,
  useSetStopLock,
  useSummarizeItinerary,
  useUndoItinerary,
  useAddStop,
  useSetStopStatus,
} from "@/modules/itinerary/hooks/useItinerary";
import { useCommentsQuery, useWeatherQuery } from "@/modules/trips/hooks/useTrips";
import { CommentsDrawer, type CommentThreadTarget } from "@/modules/trips/components/collab/CommentsDrawer";
import { ItineraryExportMenu, ItineraryPrintContent } from "@/modules/itinerary/components/ItineraryExportMenu";
import { MapView } from "@/modules/itinerary/components/MapView";
import { AskAiBar } from "@/modules/itinerary/components/plan/AskAiBar";
import { TripMapView } from "@/modules/itinerary/components/TripMapView";
import { PlaceDetailModal } from "@/modules/places/components/PlaceDetailModal";
import type { ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";
import { formatDayDate } from "@/modules/itinerary/utils/plan.utils";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import { buildTripDayPlans, getEffectiveLegs, isDayOwnedByLeg } from "@/modules/trips/utils/trip-leg.utils";
import { getDayStartStay, getEffectiveStays, getUncoveredNights } from "@/modules/trips/utils/stay.utils";
import { LoadingState } from "@/components/ui/LoadingState";
import { DayCard } from "./DayCard";
import { EditStopModal } from "./EditStopModal";
import { AddStopModal } from "./AddStopModal";
import { MealPickerDrawer } from "./MealPickerDrawer";
import { PlanProvider, type PlanActions } from "./PlanContext";

export type TripTab = "plan" | "places" | "stays" | "food" | "bookings" | "budget" | "checklist" | "guide";

interface PlanViewProps {
  trip: Trip;
  /** View-only members see the plan but can't change it. */
  canEdit: boolean;
  /** Whether the trip owner has a Google Maps key (real route times vs estimates). */
  hasMapsKey: boolean;
  hasAiKey: boolean;
  cityId: string | null;
  onCityChange: (legId: string | null) => void;
  onGoTo: (tab: TripTab, legId?: string) => void;
}

type StopTarget = { stop: ItineraryStop; day: ItineraryDay } | null;

function SetupStep({
  done,
  index,
  title,
  description,
  action,
}: {
  done: boolean;
  index: number;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const muted = useColorModeValue("gray.500", "gray.400");
  return (
    <Flex gap={4} align="center">
      <Circle size="32px" bg={done ? "brand.500" : "gray.200"} color={done ? "white" : "gray.600"} fontWeight="bold" fontSize="sm" flexShrink={0}>
        {done ? <Icon as={FiCheck} /> : index}
      </Circle>
      <Box flex={1}>
        <Text fontWeight="semibold" fontSize="sm" textDecoration={done ? "line-through" : undefined} color={done ? muted : undefined}>
          {title}
        </Text>
        <Text fontSize="xs" color={muted}>
          {description}
        </Text>
      </Box>
      {action}
    </Flex>
  );
}

function CityHeader({ leg, onGoTo }: { leg: TripLeg; onGoTo: PlanViewProps["onGoTo"] }) {
  const muted = useColorModeValue("gray.500", "gray.400");
  const stays = getEffectiveStays(leg);
  const uncovered = getUncoveredNights(leg);

  return (
    <Flex justify="space-between" align="end" gap={3} flexWrap="wrap" pt={2}>
      <Box>
        <Heading size="md">{leg.name || leg.baseCity}</Heading>
        <Text fontSize="sm" color={muted}>
          {formatDayDate(leg.startDate, "d MMM")} – {formatDayDate(leg.endDate, "d MMM")} · {leg.selectedPlaceIds.length}{" "}
          place{leg.selectedPlaceIds.length === 1 ? "" : "s"} picked
        </Text>
      </Box>
      <HStack spacing={2} flexWrap="wrap">
        {stays.length > 0 ? (
          <Button size="xs" variant="ghost" leftIcon={<MdHotel />} onClick={() => onGoTo("stays", leg.id)}>
            {stays.map((s) => s.name).join(" → ")}
          </Button>
        ) : null}
        {uncovered.length > 0 && (
          <Button size="xs" colorScheme="orange" variant="outline" leftIcon={<MdHotel />} onClick={() => onGoTo("stays", leg.id)}>
            {uncovered.length} night{uncovered.length === 1 ? "" : "s"} without a stay
          </Button>
        )}
        <Button size="xs" variant="ghost" leftIcon={<FiMapPin />} onClick={() => onGoTo("places", leg.id)}>
          Edit places
        </Button>
      </HStack>
    </Flex>
  );
}

export function PlanView({ trip, canEdit, hasMapsKey, hasAiKey, cityId, onCityChange, onGoTo }: PlanViewProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const { data, isLoading } = useItineraryQuery(trip.id);
  const itinerary = data?.itinerary ?? null;

  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);
  const [highlightedStopId, setHighlightedStopId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<StopTarget>(null);
  const [mealTarget, setMealTarget] = useState<StopTarget>(null);
  const [detailsTarget, setDetailsTarget] = useState<StopTarget>(null);
  const [addDay, setAddDay] = useState<ItineraryDay | null>(null);
  const [busyStopId, setBusyStopId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<"day" | "trip">("day");
  const [commentTarget, setCommentTarget] = useState<CommentThreadTarget | null>(null);
  const { data: commentsData } = useCommentsQuery(trip.id);
  const commentCounts = new Map<string, number>();
  for (const c of commentsData?.comments ?? []) {
    if (c.targetType === "stop") commentCounts.set(c.targetId, (commentCounts.get(c.targetId) ?? 0) + 1);
  }
  const summary = useDisclosure({ defaultIsOpen: true });
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
  const selectedStart = selectedDay ? (startStayFor(selectedDay)?.coordinates ?? trip.hotelCoordinates) : undefined;
  // A travel day may have nothing located yet — show that city (from its other days) instead of a blank map.
  const mapFallback = selectedDay
    ? [...(itinerary?.days ?? [])]
        .sort((a, b) => Number(b.legId === selectedDay.legId) - Number(a.legId === selectedDay.legId))
        .flatMap((d) => d.stops)
        .find((s) => s.coordinates && s.stopType !== "transfer")?.coordinates
    : undefined;

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

  const selectDay = (dayNumber: number, scroll = false) => {
    setSelectedDayNumber(dayNumber);
    setMapMode("day");
    if (scroll) dayRefs.current.get(dayNumber)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const actions: PlanActions = {
    trip,
    readOnly: !canEdit,
    openComments: (stop) => setCommentTarget({ type: "stop", id: stop.id, label: stop.placeName }),
    commentCount: (stopId) => commentCounts.get(stopId) ?? 0,
    highlightedStopId,
    setHighlightedStopId,
    busyStopId,
    openDetails: (stop, day) => setDetailsTarget({ stop, day }),
    openEdit: (stop, day) => setEditTarget({ stop, day }),
    openMealPicker: (stop, day) => setMealTarget({ stop, day }),
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
  };

  const muted = useColorModeValue("gray.500", "gray.400");
  const cardBg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const stripBg = useColorModeValue("gray.50", "gray.900");

  if (isLoading) return <LoadingState />;

  const selectedCount = legs.reduce((sum, l) => sum + l.selectedPlaceIds.length, 0);
  const uncoveredNights = legs.reduce((sum, l) => sum + getUncoveredNights(l).length, 0);
  const hasPlan = Boolean(itinerary?.days.some((d) => d.stops.some((s) => s.stopType !== "meal")));

  const cityChips = legs.length > 1 && (
    <HStack spacing={1} flexWrap="wrap">
      <Button size="sm" variant={!activeLeg ? "solid" : "ghost"} colorScheme={!activeLeg ? "brand" : "gray"} onClick={() => onCityChange(null)}>
        All cities
      </Button>
      {legs.map((leg) => (
        <Button
          key={leg.id}
          size="sm"
          variant={activeLeg?.id === leg.id ? "solid" : "ghost"}
          colorScheme={activeLeg?.id === leg.id ? "brand" : "gray"}
          onClick={() => onCityChange(leg.id)}
        >
          {leg.name || leg.baseCity}
        </Button>
      ))}
    </HStack>
  );

  if (!hasPlan) {
    return (
      <Stack spacing={5}>
        {cityChips}
        <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="xl" p={{ base: 5, md: 8 }} maxW="720px">
          <Heading size="md" mb={1}>
            Let's plan your days
          </Heading>
          <Text fontSize="sm" color={muted} mb={6}>
            Three quick steps and you'll have a day-by-day plan with real travel times, opening hours and meal breaks.
          </Text>
          <Stack spacing={5}>
            <SetupStep
              index={1}
              done={selectedCount > 0}
              title="Pick the places you want to see"
              description={selectedCount > 0 ? `${selectedCount} places picked` : "Browse suggestions for each city and add your favourites."}
              action={
                <Button size="sm" variant={selectedCount > 0 ? "ghost" : "solid"} colorScheme="brand" onClick={() => onGoTo("places", activeLeg?.id)}>
                  {selectedCount > 0 ? "Edit" : "Pick places"}
                </Button>
              }
            />
            <SetupStep
              index={2}
              done={uncoveredNights === 0}
              title="Add where you're staying"
              description={
                uncoveredNights === 0
                  ? "Every night has a stay — days start and end there."
                  : `${uncoveredNights} night${uncoveredNights === 1 ? "" : "s"} without a stay. Optional, but it makes routes much better.`
              }
              action={
                <Button size="sm" variant="ghost" colorScheme="brand" onClick={() => onGoTo("stays", activeLeg?.id)}>
                  {uncoveredNights === 0 ? "Edit" : "Find stays"}
                </Button>
              }
            />
            <SetupStep
              index={3}
              done={false}
              title="Generate the plan"
              description="You can drag, lock, add and remove stops afterwards — nothing is final."
              action={
                <Button
                  size="sm"
                  colorScheme="brand"
                  leftIcon={<FiZap />}
                  onClick={() => handleGenerate()}
                  isLoading={generate.isPending}
                  loadingText="Planning…"
                  isDisabled={selectedCount === 0}
                >
                  Generate
                </Button>
              }
            />
          </Stack>
        </Box>
      </Stack>
    );
  }

  const groups: { leg?: TripLeg; days: ItineraryDay[] }[] = [];
  for (const day of days) {
    const leg = legForDay(day);
    const last = groups[groups.length - 1];
    if (last && last.leg?.id === leg?.id) last.days.push(day);
    else groups.push({ leg, days: [day] });
  }

  return (
    <PlanProvider value={actions}>
      <Stack spacing={4}>
        <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
          {cityChips || <Box />}
          <HStack spacing={2} flexWrap="wrap">
            {itinerary?.undoLabel && (
              <Tooltip label={`Undo: ${itinerary.undoLabel}`} hasArrow>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<FiCornerUpLeft />}
                  onClick={() => run(() => undo.mutateAsync(), `Undid: ${itinerary.undoLabel}`)}
                  isLoading={undo.isPending}
                >
                  Undo
                </Button>
              </Tooltip>
            )}
            <Menu>
              <MenuButton as={Button} size="sm" variant="outline" leftIcon={<FiRefreshCw />} rightIcon={<FiChevronDown />} isLoading={generate.isPending || summarize.isPending}>
                Replan
              </MenuButton>
              <MenuList fontSize="sm">
                {activeLeg && (
                  <MenuItem icon={<FiRefreshCw />} onClick={() => handleGenerate(activeLeg.id)}>
                    Replan {activeLeg.name || activeLeg.baseCity}
                  </MenuItem>
                )}
                <MenuItem icon={<FiRefreshCw />} onClick={() => handleGenerate()}>
                  Replan the whole trip
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  icon={<FiZap />}
                  onClick={() => navigate(`/trips/${trip.id}/itinerary/compare${activeLeg ? `?legId=${activeLeg.id}` : ""}`)}
                >
                  Compare with an AI plan
                </MenuItem>
                <MenuItem icon={<FiFileText />} onClick={() => run(() => summarize.mutateAsync(), "Summary written")}>
                  {itinerary?.summary ? "Rewrite trip summary" : "Write a trip summary (AI)"}
                </MenuItem>
              </MenuList>
            </Menu>
            {itinerary && <ItineraryExportMenu trip={trip} itinerary={itinerary} />}
          </HStack>
        </Flex>

        <Text fontSize="xs" color={muted} mt={-2}>
          Locked stops, things you added and restaurants you chose are kept when you replan.
        </Text>

        {canEdit && itinerary && itinerary.days.length > 0 && <AskAiBar tripId={trip.id} hasAiKey={hasAiKey} />}

        {itinerary?.summary && !activeLeg && (
          <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="xl" px={5} py={3}>
            <Flex justify="space-between" align="center" cursor="pointer" onClick={summary.onToggle}>
              <Text fontWeight="semibold" fontSize="sm">
                Trip summary
              </Text>
              <Icon as={FiChevronDown} transform={summary.isOpen ? "rotate(180deg)" : undefined} transition="transform .2s" />
            </Flex>
            <Collapse in={summary.isOpen} animateOpacity>
              <Text fontSize="sm" whiteSpace="pre-wrap" lineHeight="tall" mt={2}>
                {itinerary.summary}
              </Text>
            </Collapse>
          </Box>
        )}

        <HStack
          spacing={1}
          overflowX="auto"
          py={2}
          px={1}
          position="sticky"
          top="64px"
          zIndex={5}
          bg={stripBg}
          mx={-1}
          sx={{ scrollbarWidth: "thin" }}
        >
          {days.map((day) => {
            const active = day.dayNumber === selectedDay?.dayNumber;
            const warnings = day.stops.reduce((n, s) => n + (s.warnings?.length ?? 0), 0);
            return (
              <Button
                key={day.dayNumber}
                size="sm"
                flexShrink={0}
                variant={active ? "solid" : "outline"}
                colorScheme={active ? "brand" : "gray"}
                bg={active ? undefined : cardBg}
                onClick={() => selectDay(day.dayNumber, true)}
                position="relative"
              >
                <Text as="span" fontWeight="bold" mr={1.5}>
                  {day.dayNumber}
                </Text>
                <Text as="span" fontWeight="normal" fontSize="xs">
                  {formatDayDate(day.date, "EEE d")}
                </Text>
                {warnings > 0 && <Circle size="7px" bg="orange.400" position="absolute" top="3px" right="3px" />}
              </Button>
            );
          })}
        </HStack>

        <Grid templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) minmax(360px, 42%)" }} gap={6} alignItems="start">
          <Stack spacing={5} minW={0}>
            {groups.map((group, gi) => (
              <Stack key={`${group.leg?.id ?? "none"}-${gi}`} spacing={4}>
                {group.leg && <CityHeader leg={group.leg} onGoTo={onGoTo} />}
                {group.days.map((day) => {
                  const stay = startStayFor(day);
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
                      isSelected={day.dayNumber === selectedDay?.dayNumber}
                      onSelect={() => selectDay(day.dayNumber)}
                    />
                  );
                })}
              </Stack>
            ))}

            {optionalPlaces.length > 0 && (
              <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="xl" p={5}>
                <Heading size="sm" mb={1}>
                  Didn't fit ({optionalPlaces.length})
                </Heading>
                <Text fontSize="xs" color={muted} mb={4}>
                  Picked, but no day had room. Add one to a day yourself — it'll be flagged if the day runs long.
                </Text>
                <Stack spacing={2}>
                  {optionalPlaces.map((place) => (
                    <Flex key={place.placeId} justify="space-between" align="center" p={3} borderWidth="1px" borderColor={border} borderRadius="md" gap={3} flexWrap="wrap">
                      <Box minW={0}>
                        <Text fontWeight="medium" fontSize="sm">
                          {place.placeName}
                        </Text>
                        <Text fontSize="xs" color={muted}>
                          {place.reason}
                        </Text>
                      </Box>
                      <Menu isLazy>
                        <MenuButton as={Button} size="xs" rightIcon={<FiChevronDown />} isLoading={movePlaceToDay.isPending}>
                          Add to a day
                        </MenuButton>
                        <MenuList maxH="280px" overflowY="auto" fontSize="sm">
                          {(itinerary?.days ?? [])
                            .filter((d) => d.dayType !== "transfer" && (!place.legId || d.legId === place.legId))
                            .map((d) => (
                              <MenuItem
                                key={d.dayNumber}
                                onClick={() =>
                                  run(
                                    () => movePlaceToDay.mutateAsync({ placeId: place.placeId, toDayNumber: d.dayNumber }),
                                    `Added to Day ${d.dayNumber}`,
                                  )
                                }
                              >
                                Day {d.dayNumber} · {formatDayDate(d.date, "EEE d MMM")}
                              </MenuItem>
                            ))}
                        </MenuList>
                      </Menu>
                    </Flex>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>

          <Box
            position={{ base: "relative", xl: "sticky" }}
            top={{ xl: "124px" }}
            h={{ base: "380px", xl: "calc(100vh - 148px)" }}
            minH="380px"
            borderWidth="1px"
            borderColor={border}
            borderRadius="xl"
            overflow="hidden"
            order={{ base: -1, xl: 0 }}
          >
            <ButtonGroup
              size="xs"
              isAttached
              position="absolute"
              top={3}
              right={3}
              zIndex={1000}
              boxShadow="sm"
              borderRadius="md"
              bg={cardBg}
            >
              <Button variant={mapMode === "day" ? "solid" : "outline"} colorScheme={mapMode === "day" ? "brand" : "gray"} onClick={() => setMapMode("day")}>
                {selectedDay ? `Day ${selectedDay.dayNumber}` : "Day"}
              </Button>
              <Button variant={mapMode === "trip" ? "solid" : "outline"} colorScheme={mapMode === "trip" ? "brand" : "gray"} onClick={() => setMapMode("trip")}>
                {activeLeg ? activeLeg.name || activeLeg.baseCity : "Whole trip"}
              </Button>
            </ButtonGroup>
            {mapMode === "trip" ? (
              <TripMapView
                days={days}
                stays={(activeLeg ? [activeLeg] : legs).flatMap((l) =>
                  getEffectiveStays(l).flatMap((s) => (s.coordinates ? [{ name: s.name, coordinates: s.coordinates }] : [])),
                )}
                onSelectDay={(dayNumber) => {
                  setMapMode("day");
                  selectDay(dayNumber, true);
                }}
              />
            ) : (
            <MapView
              day={selectedDay}
              hotelCoordinates={selectedStart}
              route={selectedRoute}
              height="100%"
              highlightedStopId={highlightedStopId}
              fallbackCenter={mapFallback}
              onStopClick={(stopId) => {
                setHighlightedStopId(stopId);
                if (selectedDay) dayRefs.current.get(selectedDay.dayNumber)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
            )}
          </Box>
        </Grid>

        {!hasMapsKey && (
          <Alert status="info" borderRadius="md" fontSize="sm">
            <AlertIcon />
            <AlertDescription>
              Travel times are estimates from distance. With a Google Maps key they come from real routes.
            </AlertDescription>
          </Alert>
        )}

        {itinerary && <ItineraryPrintContent trip={trip} itinerary={itinerary} />}
      </Stack>

      <CommentsDrawer trip={trip} target={commentTarget} onClose={() => setCommentTarget(null)} />
      <EditStopModal tripId={trip.id} currency={trip.currency} target={editTarget} onClose={() => setEditTarget(null)} />
      <MealPickerDrawer
        tripId={trip.id}
        target={mealTarget}
        city={mealTarget ? legForDay(mealTarget.day)?.baseCity : undefined}
        country={mealTarget ? legForDay(mealTarget.day)?.country : trip.destinationCountry}
        onClose={() => setMealTarget(null)}
      />
      <AddStopModal
        tripId={trip.id}
        day={addDay}
        city={addDay ? legForDay(addDay)?.baseCity : undefined}
        country={addDay ? legForDay(addDay)?.country : trip.destinationCountry}
        onClose={() => setAddDay(null)}
      />
      {detailsTarget && (
        <PlaceDetailModal
          isOpen
          onClose={() => setDetailsTarget(null)}
          trip={trip}
          legId={detailsTarget.day.legId ?? legs[0]?.id ?? ""}
          placeId={detailsTarget.stop.placeId}
          isSelected
          onSelectedChange={() => undefined}
          hideTripToggle
        />
      )}
    </PlanProvider>
  );
}
