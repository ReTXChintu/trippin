import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Progress,
  Select,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiClock, FiMoreVertical, FiNavigation, FiSkipForward } from "react-icons/fi";
import { MdHotel, MdRestaurant, MdTrain } from "react-icons/md";
import { getApiErrorMessage } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useItineraryQuery, useReplanFromNow, useSetStopStatus } from "@/modules/itinerary/hooks/useItinerary";
import type { ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";
import { formatDayDate, formatDuration, toMinutes, transportIcon } from "@/modules/itinerary/utils/plan.utils";
import { useTripQuery, useWeatherQuery } from "@/modules/trips/hooks/useTrips";
import { BOOKING_META } from "@/modules/trips/components/bookings/bookingMeta";
import type { TransportationMode } from "@/types";

const GOOGLE_MODE: Record<TransportationMode, string> = {
  Walking: "walking",
  Cab: "driving",
  "Self Drive": "driving",
  Bike: "bicycling",
  "Public Transport": "transit",
};

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Stops you actually go to / do — structural ones (travel, back to hotel) are shown but not actionable. */
function isActionable(stop: ItineraryStop): boolean {
  return stop.stopType !== "transfer" && stop.stopType !== "return";
}

function stopIcon(stop: ItineraryStop) {
  if (stop.stopType === "meal") return MdRestaurant;
  if (stop.stopType === "transfer") return MdTrain;
  if (stop.stopType === "return") return MdHotel;
  return undefined;
}

export function TodayView() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const { data: trip, isLoading: tripLoading } = useTripQuery(id);
  const { data, isLoading } = useItineraryQuery(id);
  const { data: weather } = useWeatherQuery(id);
  const setStatus = useSetStopStatus(id);
  const replan = useReplanFromNow(id);
  const [clock, setClock] = useState(nowHHMM);

  const cardBg = "bg.surface";
  const border = "border.line";
  const muted = "fg.muted";
  const focusBg = "accent.soft";

  // Tick every 30s so "now / next" follows the clock. `?at=HH:mm` pins the time (handy for previewing).
  useEffect(() => {
    const timer = window.setInterval(() => setClock(nowHHMM()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const now = params.get("at") ?? clock;
  const nowMin = toMinutes(now);

  const days = data?.itinerary?.days ?? [];
  const today = localToday();
  const requestedDay = Number(params.get("day"));
  const day: ItineraryDay | undefined =
    days.find((d) => d.dayNumber === requestedDay) ?? days.find((d) => d.date === today) ?? days[0];
  const isToday = day?.date === today;

  const actionable = useMemo(() => (day?.stops ?? []).filter(isActionable), [day]);
  const pending = actionable.filter((s) => !s.status);
  const focus = pending[0];
  const doneCount = actionable.filter((s) => s.status).length;

  if (tripLoading || isLoading) return <LoadingState />;
  if (!trip || !day) return <EmptyState title="No plan yet" description="Generate the day-by-day plan first." />;

  const mode = GOOGLE_MODE[trip.transportationMode] ?? "driving";
  const ModeIcon = transportIcon(trip.transportationMode);
  const dayWeather = weather?.days.find((w) => w.date === day.date);
  const bookings = trip.bookings.filter((b) => b.startDate === day.date);

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
      ? `https://www.google.com/maps/dir/?api=1&destination=${stop.coordinates.lat},${stop.coordinates.lng}&travelmode=${mode}`
      : stop.stopType === "meal"
        ? `https://www.google.com/maps/search/restaurants+near+me`
        : undefined;

  let focusState: { label: string; tone: "next" | "now" | "late"; detail?: string } | null = null;
  if (focus && isToday) {
    const arrive = toMinutes(focus.arrivalTime);
    const leave = toMinutes(focus.departureTime);
    if (nowMin < arrive) {
      const leaveBy = arrive - focus.travelDurationMinutes;
      focusState = {
        tone: "next",
        label: `Next · ${focus.arrivalTime}`,
        detail:
          focus.travelDurationMinutes > 0
            ? nowMin >= leaveBy
              ? `Head out now — ${formatDuration(focus.travelDurationMinutes)} to get there`
              : `Leave by ${String(Math.floor(leaveBy / 60)).padStart(2, "0")}:${String(leaveBy % 60).padStart(2, "0")} · ${formatDuration(focus.travelDurationMinutes)} away`
            : undefined,
      };
    } else if (nowMin <= leave) {
      focusState = { tone: "now", label: `Now · until ${focus.departureTime}` };
    } else {
      focusState = { tone: "late", label: `Planned ${focus.arrivalTime}–${focus.departureTime}`, detail: `You're ${formatDuration(nowMin - leave)} behind the plan` };
    }
  } else if (focus) {
    focusState = { tone: "next", label: `First up · ${focus.arrivalTime}` };
  }

  return (
    <Stack spacing={5} maxW="560px" mx="auto" pb={10}>
      <Flex justify="space-between" align="center" gap={2}>
        <Button as={Link} to={`/trips/${trip.id}?tab=plan`} variant="ghost" size="sm" leftIcon={<FiArrowLeft />}>
          Full plan
        </Button>
        <Select
          size="sm"
          w="auto"
          value={day.dayNumber}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            next.set("day", e.target.value);
            setParams(next, { replace: true });
          }}
        >
          {days.map((d) => (
            <option key={d.dayNumber} value={d.dayNumber}>
              Day {d.dayNumber} · {formatDayDate(d.date, "EEE d MMM")}
              {d.date === today ? " (today)" : ""}
            </option>
          ))}
        </Select>
      </Flex>

      <Box>
        <Text fontSize="sm" color={muted}>
          {trip.title}
        </Text>
        <Heading size="lg">{formatDayDate(day.date, "EEEE, d MMM")}</Heading>
        <HStack spacing={2} mt={1} flexWrap="wrap">
          {day.legName && <Badge>{day.legName}</Badge>}
          {dayWeather && (
            <Badge variant="outline" textTransform="none" fontWeight="normal">
              {dayWeather.icon} {dayWeather.tempMaxC}°/{dayWeather.tempMinC}°
              {(dayWeather.rainChance ?? 0) >= 30 ? ` · ${dayWeather.rainChance}% rain` : ""}
            </Badge>
          )}
          {isToday && (
            <Badge colorScheme="brand" variant="subtle">
              {now}
            </Badge>
          )}
        </HStack>
        {actionable.length > 0 && (
          <Box mt={3}>
            <Text fontSize="xs" color={muted} mb={1}>
              {doneCount} of {actionable.length} done
            </Text>
            <Progress value={(doneCount / actionable.length) * 100} size="sm" colorScheme="brand" borderRadius="full" />
          </Box>
        )}
      </Box>

      {!isToday && (
        <Alert status="info" borderRadius="md" fontSize="sm">
          <AlertIcon />
          This isn't today — you're previewing Day {day.dayNumber}. On the day, this screen follows the clock.
        </Alert>
      )}

      {focus && focusState ? (
        <Box p={5} bg={focusState.tone === "late" ? "orange.50" : focusBg} _dark={{ bg: "whiteAlpha.100" }} borderRadius="2xl" borderWidth="1px" borderColor={focusState.tone === "late" ? "orange.200" : "brand.200"}>
          <Text fontSize="sm" fontWeight="semibold" color={focusState.tone === "late" ? "orange.600" : "brand.600"}>
            {focusState.label}
          </Text>
          <Heading size="md" mt={1}>
            {focus.stopType === "meal" && !focus.placeId ? `${focus.placeName} — pick somewhere nearby` : focus.placeName}
          </Heading>
          <Text fontSize="sm" color={muted} mt={1}>
            {[focus.category, formatDuration(focus.visitDurationMinutes), focus.openingHoursToday && `Open ${focus.openingHoursToday}`]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          {focusState.detail && (
            <HStack mt={3} spacing={2} fontSize="sm">
              <Icon as={focusState.tone === "late" ? FiClock : ModeIcon} />
              <Text fontWeight="medium">{focusState.detail}</Text>
            </HStack>
          )}
          {focus.warnings?.map((w) => (
            <Text key={w} fontSize="xs" color="orange.600" mt={1}>
              ⚠ {w}
            </Text>
          ))}
          {focus.notes && (
            <Text fontSize="sm" mt={2}>
              📝 {focus.notes}
            </Text>
          )}
          <Stack direction={{ base: "column", sm: "row" }} spacing={2} mt={4}>
            {navigateUrl(focus) && (
              <Button as="a" href={navigateUrl(focus)} target="_blank" rel="noopener noreferrer" colorScheme="brand" leftIcon={<FiNavigation />} flex={1}>
                Navigate
              </Button>
            )}
            <Button leftIcon={<FiCheck />} onClick={() => mark(focus, "done")} isLoading={setStatus.isPending} flex={1} variant="outline" colorScheme="brand">
              Done
            </Button>
            <Button leftIcon={<FiSkipForward />} onClick={() => mark(focus, "skipped")} isLoading={setStatus.isPending} variant="ghost">
              Skip
            </Button>
          </Stack>
        </Box>
      ) : (
        <Box p={5} bg={cardBg} borderRadius="2xl" borderWidth="1px" borderColor={border} textAlign="center">
          <Heading size="md">🎉 That's the day done</Heading>
          <Text fontSize="sm" color={muted} mt={1}>
            Everything's marked. Rest up for tomorrow.
          </Text>
        </Box>
      )}

      {isToday && pending.length > 0 && (
        <Button
          variant={focusState?.tone === "late" ? "solid" : "outline"}
          colorScheme="orange"
          leftIcon={<FiClock />}
          onClick={() => run(() => replan.mutateAsync({ dayNumber: day.dayNumber, time: now }), `Re-planned from ${now}`)}
          isLoading={replan.isPending}
        >
          Running late? Re-plan the rest from {now}
        </Button>
      )}

      {bookings.length > 0 && (
        <Box p={4} bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={border}>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            Booked today
          </Text>
          <Stack spacing={2}>
            {bookings.map((b) => (
              <HStack key={b.id} fontSize="sm" spacing={2} align="start">
                <Icon as={BOOKING_META[b.type].icon} mt={0.5} color={`${BOOKING_META[b.type].color}.500`} />
                <Box>
                  <Text fontWeight="medium">
                    {b.startTime ? `${b.startTime} · ` : ""}
                    {b.title}
                  </Text>
                  {b.confirmationNumber && (
                    <Text fontSize="xs" color={muted}>
                      Conf. <b>{b.confirmationNumber}</b>
                      {b.provider ? ` · ${b.provider}` : ""}
                    </Text>
                  )}
                </Box>
              </HStack>
            ))}
          </Stack>
        </Box>
      )}

      <Box p={4} bg={cardBg} borderRadius="xl" borderWidth="1px" borderColor={border}>
        <Text fontSize="sm" fontWeight="semibold" mb={3}>
          The whole day
        </Text>
        <Stack spacing={0}>
          {day.stops.map((stop) => {
            const StopIcon = stopIcon(stop);
            const isFocus = stop.id === focus?.id;
            return (
              <Flex key={stop.id} py={2} gap={3} align="center" opacity={stop.status ? 0.55 : 1} borderBottomWidth="1px" borderColor={border} _last={{ borderBottomWidth: 0 }}>
                <Text w="44px" fontSize="sm" fontWeight={isFocus ? "bold" : "semibold"} sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {stop.arrivalTime}
                </Text>
                <Flex w="22px" justify="center">
                  {stop.status === "done" ? (
                    <Icon as={FiCheck} color="green.500" />
                  ) : stop.status === "skipped" ? (
                    <Icon as={FiSkipForward} color={muted} />
                  ) : StopIcon ? (
                    <Icon as={StopIcon} color={muted} />
                  ) : (
                    <Box w="8px" h="8px" borderRadius="full" bg={isFocus ? "brand.500" : "gray.300"} />
                  )}
                </Flex>
                <Text flex={1} fontSize="sm" fontWeight={isFocus ? "semibold" : "normal"} textDecoration={stop.status === "skipped" ? "line-through" : undefined} noOfLines={1}>
                  {stop.placeName}
                </Text>
                {isActionable(stop) && (
                  <Menu isLazy placement="bottom-end">
                    <MenuButton as={IconButton} icon={<FiMoreVertical />} size="xs" variant="ghost" aria-label="Stop options" />
                    <MenuList fontSize="sm">
                      {navigateUrl(stop) && (
                        <MenuItem as="a" href={navigateUrl(stop)} target="_blank" icon={<FiNavigation />}>
                          Navigate
                        </MenuItem>
                      )}
                      {stop.status !== "done" && (
                        <MenuItem icon={<FiCheck />} onClick={() => mark(stop, "done")}>
                          Mark done
                        </MenuItem>
                      )}
                      {stop.status !== "skipped" && (
                        <MenuItem icon={<FiSkipForward />} onClick={() => mark(stop, "skipped")}>
                          Skip
                        </MenuItem>
                      )}
                      {stop.status && <MenuItem onClick={() => mark(stop, null)}>Back to planned</MenuItem>}
                    </MenuList>
                  </Menu>
                )}
              </Flex>
            );
          })}
        </Stack>
      </Box>
    </Stack>
  );
}
