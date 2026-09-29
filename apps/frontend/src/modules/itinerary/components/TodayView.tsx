import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import {
  FiArrowLeft,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiInfo,
  FiList,
  FiMap,
  FiMoreHorizontal,
  FiWifiOff,
} from "react-icons/fi";
import { LuMap } from "react-icons/lu";
import { getApiErrorMessage } from "@/lib/api";
import { canEditTrip } from "@/lib/trip-access";
import { useAuthStore } from "@/store/authStore";
import { Banner, ChoiceChip, EmptyState, Overline, SurfaceCard } from "@/components/ui";
import {
  ChecklistEmptyState,
  ErrorState,
  LoadingSkeleton,
  ScrollRow,
  ViewOnlyBanner,
  hasOfflineCache,
  useOnlineStatus,
} from "@/components/states";
import { useItineraryQuery, useReplanFromNow, useSetStopStatus } from "@/modules/itinerary/hooks/useItinerary";
import type { ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";
import { dayGoogleMapsUrl, formatDayDate, toMinutes } from "@/modules/itinerary/utils/plan.utils";
import { useTripQuery, useWeatherQuery } from "@/modules/trips/hooks/useTrips";
import { getTripStages } from "@/modules/trips/utils/trip-stage";
import { BOOKING_META } from "@/modules/trips/components/bookings/bookingMeta";
import { NowCard } from "./today/NowCard";
import { TodayStopRow } from "./today/TodayStopRow";
import { GOOGLE_MODE, focusStateFor, isActionable, localToday, nowHHMM } from "./today/today.utils";

/** The on-trip "Today" screen: what's now/next, what's coming, and a one-tap re-plan when running late. */
export function TodayView() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const currentUserId = useAuthStore((s) => s.user?.id ?? "");
  const tripQuery = useTripQuery(id);
  const itineraryQuery = useItineraryQuery(id);
  const { data: trip } = tripQuery;
  const { data } = itineraryQuery;
  const { data: weather } = useWeatherQuery(id);
  const setStatus = useSetStopStatus(id);
  const replan = useReplanFromNow(id);
  const online = useOnlineStatus();
  const [clock, setClock] = useState(nowHHMM);

  // Tick every 30s so "now / next" follows the clock. `?at=HH:mm` pins the time (handy for previewing).
  useEffect(() => {
    const timer = window.setInterval(() => setClock(nowHHMM()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const now = params.get("at") ?? clock;
  const nowMin = toMinutes(now);

  const days = useMemo(() => data?.itinerary?.days ?? [], [data]);
  const today = localToday();
  const requestedDay = Number(params.get("day"));
  const day: ItineraryDay | undefined =
    days.find((d) => d.dayNumber === requestedDay) ?? days.find((d) => d.date === today) ?? days[0];
  const isToday = day?.date === today;

  const actionable = useMemo(() => (day?.stops ?? []).filter(isActionable), [day]);
  const pending = actionable.filter((s) => !s.status);
  const focus = pending[0];
  const doneCount = actionable.filter((s) => s.status).length;

  if (tripQuery.isLoading || itineraryQuery.isLoading) {
    return (
      <Box maxW="1080px" mx="auto">
        <LoadingSkeleton variant="page" label="Loading today" />
      </Box>
    );
  }

  if (tripQuery.isError || itineraryQuery.isError || !trip) {
    return (
      <Box maxW="560px" mx="auto">
        <ErrorState
          title="Couldn't load today"
          onRetry={() => {
            void tripQuery.refetch();
            void itineraryQuery.refetch();
          }}
          retrying={tripQuery.isFetching || itineraryQuery.isFetching}
        />
      </Box>
    );
  }

  const planHref = (legId?: string) => `/trips/${trip.id}?tab=plan${legId ? `&city=${legId}` : ""}`;

  if (!day) {
    const { stages } = getTripStages(trip, { hasPlan: false, edits: 0 });
    const done = (key: string) => stages.find((s) => s.key === key)?.status === "done";
    return (
      <Box maxW="560px" mx="auto">
        <ChecklistEmptyState
          icon={LuMap}
          title="No plan for today yet"
          text="Today follows your day-by-day plan. Make the plan first and it'll show up here."
          steps={[
            { label: "Pick places", done: done("places") },
            { label: "Add stays", done: done("stays") },
            { label: "Generate plan", done: false },
          ]}
          action={
            <Button as={Link} to={planHref()} w="full" mt={1}>
              Go to the plan
            </Button>
          }
        />
      </Box>
    );
  }

  const canEdit = canEditTrip(trip, currentUserId);
  const mode = trip.transportationMode;
  const googleMode = GOOGLE_MODE[mode] ?? "driving";
  const dayWeather = weather?.days.find((w) => w.date === day.date);
  const bookings = trip.bookings.filter((b) => b.startDate === day.date);
  const leg = trip.legs.find((l) => l.id === day.legId);
  const dayRouteUrl = dayGoogleMapsUrl(day, leg?.hotelCoordinates ?? trip.hotelCoordinates, mode);

  const run = async (fn: () => Promise<unknown>, success?: string) => {
    try {
      await fn();
      if (success) toast({ title: success, status: "success", duration: 2000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const mark = (stop: ItineraryStop, status: "done" | "skipped" | null) =>
    run(() => setStatus.mutateAsync({ dayNumber: day.dayNumber, stopId: stop.id, status }));

  const navigateUrl = (stop: ItineraryStop) =>
    stop.coordinates
      ? `https://www.google.com/maps/dir/?api=1&destination=${stop.coordinates.lat},${stop.coordinates.lng}&travelmode=${googleMode}`
      : stop.stopType === "meal"
        ? `https://www.google.com/maps/search/restaurants+near+me`
        : undefined;

  const focusIndex = focus ? day.stops.findIndex((s) => s.id === focus.id) : day.stops.length;
  const comingUp = day.stops.filter((s, i) => i > focusIndex && !s.status);
  const earlier = day.stops.filter((s, i) => i < focusIndex || (i > focusIndex && s.status));
  const nextActionable = pending[1];
  const focusState = focus ? focusStateFor(focus, nextActionable, nowMin, isToday) : null;
  const late = focusState?.tone === "late";
  const showReplan = canEdit && isToday && pending.length > 0;

  const setDay = (n: number) => {
    const next = new URLSearchParams(params);
    next.set("day", String(n));
    setParams(next, { replace: true });
  };

  const subtitle = [
    isToday && `Day ${day.dayNumber}`,
    day.legName,
    dayWeather &&
      `${dayWeather.tempMaxC}° ${dayWeather.summary}${(dayWeather.rainChance ?? 0) >= 30 ? ` · ${dayWeather.rainChance}% rain` : ""}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const syncedAgo = itineraryQuery.dataUpdatedAt
    ? formatDistanceToNowStrict(itineraryQuery.dataUpdatedAt, { addSuffix: true })
    : undefined;

  const replanButton = (
    <Button
      w="full"
      size="xl"
      h="52px"
      borderRadius="lg"
      bg={late ? "warn" : "warn.soft"}
      color={late ? "bg.surface" : "warn"}
      _hover={{ filter: "brightness(.97)" }}
      _active={{ filter: "brightness(.94)" }}
      leftIcon={<FiClock />}
      onClick={() => run(() => replan.mutateAsync({ dayNumber: day.dayNumber, time: now }), `Re-planned from ${now}`)}
      isLoading={replan.isPending}
      isDisabled={!online}
      title={online ? `Re-time the rest of the day from ${now}` : "Needs a connection"}
    >
      Running late? Re-plan from now
    </Button>
  );

  return (
    <Box maxW="1080px" mx="auto">
      <Stack spacing={{ base: "14px", md: 5 }}>
        {/* Header: back to the plan, date, day · city · weather, options */}
        <Flex align="center" justify="space-between" gap={2}>
          <HStack spacing={1} minW={0}>
            <IconButton
              as={Link}
              to={planHref(day.legId)}
              aria-label="Back to the plan"
              title="Back to the plan"
              icon={<FiArrowLeft />}
              variant="ghost"
              size="lg"
              ml={-2}
            />
            <Box minW={0}>
              <Text
                as="h1"
                fontFamily={{ base: "body", md: "heading" }}
                fontWeight={{ base: 700, md: 600 }}
                fontSize={{ base: "16px", md: "28px" }}
                lineHeight={1.2}
                letterSpacing={{ md: "-0.01em" }}
                noOfLines={1}
              >
                {isToday ? "Today" : `Day ${day.dayNumber}`} · {formatDayDate(day.date, "EEE d MMM")}
              </Text>
              <Text fontSize={{ base: "12px", md: "13px" }} color="fg.muted" noOfLines={1}>
                {subtitle}
                {actionable.length > 0 && ` · ${doneCount} of ${actionable.length} done`}
              </Text>
            </Box>
          </HStack>
          <Menu isLazy placement="bottom-end">
            <MenuButton as={IconButton} icon={<FiMoreHorizontal />} variant="ghost" size="lg" aria-label="Options" title="Options" />
            <MenuList fontSize="sm">
              <MenuItem as={Link} to={planHref(day.legId)} icon={<FiList />}>
                Full plan
              </MenuItem>
              {dayRouteUrl && (
                <MenuItem as="a" href={dayRouteUrl} target="_blank" rel="noopener noreferrer" icon={<FiMap />}>
                  Whole day in Google Maps
                </MenuItem>
              )}
            </MenuList>
          </Menu>
        </Flex>

        {/* Offline readiness (only claimed when the offline cache is really active) */}
        {!online ? (
          <Flex align="center" gap={2} px={4} py={2} borderRadius="md" bg="warn.soft" color="warn" fontSize="12px" fontWeight={600}>
            <Icon as={FiWifiOff} boxSize="14px" />
            <Text flex={1}>Offline · showing the copy saved {syncedAgo ?? "earlier"}</Text>
          </Flex>
        ) : (
          hasOfflineCache() &&
          syncedAgo && (
            <Flex align="center" gap={2} px={4} py={2} borderRadius="md" bg="success.soft" color="success" fontSize="12px" fontWeight={600}>
              <Icon as={FiCheck} boxSize="14px" />
              <Text flex={1}>Saved for offline · synced {syncedAgo}</Text>
            </Flex>
          )
        )}

        {days.length > 1 && (
          <ScrollRow label="Choose a day">
            {days.map((d) => (
              <ChoiceChip key={d.dayNumber} selected={d.dayNumber === day.dayNumber} onClick={() => setDay(d.dayNumber)} aria-label={`Day ${d.dayNumber}, ${formatDayDate(d.date, "EEEE d MMMM")}${d.date === today ? ", today" : ""}`}>
                Day {d.dayNumber} · {formatDayDate(d.date, "EEE d")}
                {d.date === today && (
                  <Box as="span" w="6px" h="6px" borderRadius="full" bg={d.dayNumber === day.dayNumber ? "accent.fg" : "accent"} aria-hidden />
                )}
              </ChoiceChip>
            ))}
          </ScrollRow>
        )}

        {!canEdit && <ViewOnlyBanner>You can view this trip. Only editors can mark stops done or re-plan the day.</ViewOnlyBanner>}

        {!isToday && (
          <Banner tone="accent" icon={FiInfo}>
            This isn't today — you're previewing Day {day.dayNumber}. On the day, this screen follows the clock.
          </Banner>
        )}

        <Grid templateColumns={{ base: "minmax(0,1fr)", lg: "minmax(0,1.05fr) minmax(0,1fr)" }} gap={{ base: "14px", lg: 6 }} alignItems="start">
          <Stack spacing="14px">
            {focus && focusState ? (
              <NowCard
                key={focus.id}
                stop={focus}
                state={focusState}
                directionsUrl={navigateUrl(focus)}
                canEdit={canEdit}
                busy={setStatus.isPending}
                disabled={!online}
                onDone={() => mark(focus, "done")}
                onSkip={() => mark(focus, "skipped")}
              />
            ) : (
              <SurfaceCard raised>
                <EmptyState
                  compact
                  icon={FiCheckCircle}
                  title="That's the day done"
                  text={actionable.length > 0 ? "Everything's marked. Rest up for tomorrow." : "Nothing to visit on this day."}
                />
              </SurfaceCard>
            )}

            {showReplan && <Box display={{ base: "none", lg: "block" }}>{replanButton}</Box>}

            {bookings.length > 0 && (
              <SurfaceCard p={4}>
                <Overline mb={3}>Booked today</Overline>
                <Stack spacing={3}>
                  {bookings.map((b) => (
                    <HStack key={b.id} fontSize="sm" spacing={3} align="start">
                      <Flex w="32px" h="32px" borderRadius="md" bg="bg.subtle" align="center" justify="center" flexShrink={0}>
                        <Icon as={BOOKING_META[b.type].icon} boxSize="16px" color="fg.muted" />
                      </Flex>
                      <Box minW={0}>
                        <Text fontWeight={600} noOfLines={1}>
                          {b.startTime ? `${b.startTime} · ` : ""}
                          {b.title}
                        </Text>
                        {b.confirmationNumber && (
                          <Text fontSize="12px" color="fg.muted">
                            Conf. <b>{b.confirmationNumber}</b>
                            {b.provider ? ` · ${b.provider}` : ""}
                          </Text>
                        )}
                      </Box>
                    </HStack>
                  ))}
                </Stack>
              </SurfaceCard>
            )}
          </Stack>

          <Stack spacing="14px">
            {comingUp.length > 0 && (
              <Stack spacing={2} as="section" aria-label="Coming up">
                <Overline>Coming up</Overline>
                {comingUp.map((stop) => (
                  <TodayStopRow
                    key={stop.id}
                    stop={stop}
                    mode={mode}
                    directionsUrl={navigateUrl(stop)}
                    canEdit={canEdit && online}
                    planHref={planHref(day.legId)}
                    onMark={(status) => mark(stop, status)}
                  />
                ))}
              </Stack>
            )}

            {earlier.length > 0 && (
              <Stack spacing={2} as="section" aria-label="Earlier">
                <Overline>{focus ? "Earlier" : "The whole day"}</Overline>
                {earlier.map((stop) => (
                  <TodayStopRow
                    key={stop.id}
                    stop={stop}
                    mode={mode}
                    directionsUrl={navigateUrl(stop)}
                    canEdit={canEdit && online}
                    planHref={planHref(day.legId)}
                    onMark={(status) => mark(stop, status)}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </Grid>
      </Stack>

      {/* Phone: the re-plan action sits in a bar pinned just above the trip tab bar. */}
      {showReplan && (
        <Box
          display={{ base: "block", lg: "none" }}
          position="fixed"
          left={0}
          right={0}
          bottom="68px"
          zIndex={20}
          px={4}
          py={3}
          bg="bg.surface"
          borderTopWidth="1px"
          borderColor="border.line"
        >
          {replanButton}
        </Box>
      )}
    </Box>
  );
}
