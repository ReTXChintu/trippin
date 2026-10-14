import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { forwardRef } from "react";
import {
  LuCamera,
  LuChevronDown,
  LuClock,
  LuEllipsis,
  LuExternalLink,
  LuMap,
  LuMapPin,
  LuPlus,
  LuRefreshCw,
  LuRoute,
  LuShirt,
  LuSmartphone,
  LuSun,
  LuTrainFront,
  LuTriangleAlert,
} from "react-icons/lu";
import { Link as RouterLink } from "react-router-dom";
import type { ItineraryDay } from "@/modules/itinerary/types";
import type { DayWeather, TripBooking } from "@/modules/trips/types/trip-extras.types";
import { BOOKING_META } from "@/modules/trips/components/bookings/bookingMeta";
import { dayGoogleMapsUrl, formatDayDate, isVisit, summarizeDay, toMinutes } from "@/modules/itinerary/utils/plan.utils";
import { DayBadge, Pill } from "@/components/ui";
import { dayTripName } from "@/modules/itinerary/utils/route-insights";
import { fmtDur, modeIcon, weatherIcon } from "@/components/ui/plan.utils";
import { StayRow, StopRow, TravelConnector } from "./StopRow";
import { usePlan } from "./PlanContext";

interface DayCardProps {
  day: ItineraryDay;
  weather?: DayWeather;
  /** Bookings starting this day (transfer-linked ones already show as the travel stop). */
  bookings?: TripBooking[];
  startStay?: { name: string; coordinates?: { lat: number; lng: number } };
  /** The night before this day has no stay (city days only). */
  missingStay?: boolean;
  /** Travel day whose transfer has no booking yet. */
  unbookedTransfer?: boolean;
  isSelected: boolean;
  /** Collapsed to a one-line summary (other days while one is open). */
  collapsed: boolean;
  onSelect: () => void;
}

function hhmm(minutes: number): string {
  const m = Math.max(0, minutes);
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function dayTitle(day: ItineraryDay): string {
  const travel = day.dayType === "transfer" || day.stops.some((s) => s.stopType === "transfer");
  return (travel ? (day.transferLabel ?? day.legName) : day.legName) ?? "";
}

export const DayCard = forwardRef<HTMLDivElement, DayCardProps>(function DayCard(
  { day, startStay, missingStay, unbookedTransfer, isSelected, collapsed, onSelect, weather, bookings = [] },
  ref,
) {
  const plan = usePlan();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const summary = summarizeDay(day);
  const insights = plan.dayInsights(day);
  const dayLeg = plan.trip.legs.find((l) => l.id === day.legId);
  const dayTrip = dayTripName(day, dayLeg?.dayTrips, startStay?.coordinates ?? dayLeg?.hotelCoordinates);
  const pinnedFirst = day.stops.filter((s) => s.stopType === "transfer");
  const pinnedLast = day.stops.filter((s) => s.stopType === "return");
  const middle = day.stops.filter((s) => s.stopType !== "transfer" && s.stopType !== "return");
  const mapsUrl = dayGoogleMapsUrl(day, startStay?.coordinates, plan.trip.transportationMode);
  const isTravelDay = day.dayType === "transfer";
  const isFreeDay = day.dayType === "free";
  const ordered = [...pinnedFirst, ...middle, ...pinnedLast];
  const place = dayTitle(day);
  const TravelIcon = modeIcon(plan.trip.transportationMode);
  const transferStop = pinnedFirst[0];

  const visitNumbers = new Map<string, number>();
  let n = 0;
  for (const stop of day.stops) if (isVisit(stop)) visitNumbers.set(stop.id, ++n);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = middle.map((s) => s.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    plan.reorder(day, [...pinnedFirst.map((s) => s.id), ...next, ...pinnedLast.map((s) => s.id)]);
  };

  const statsLine = [
    summary.visits > 0 ? `${summary.visits} stop${summary.visits === 1 ? "" : "s"}` : isFreeDay ? "Free day" : "No visits yet",
    summary.travelMinutes > 0 ? `${fmtDur(summary.travelMinutes)} travel` : null,
    plan.compact && summary.travelKm > 0 ? `${summary.travelKm} km` : null,
    !plan.compact && summary.start && summary.end ? `${summary.start} – ${summary.end}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // ---------------- Collapsed ----------------
  if (collapsed) {
    return (
      <Flex
        ref={ref}
        as="section"
        aria-label={`Day ${day.dayNumber}, ${formatDayDate(day.date, "EEE d MMM")}`}
        bg="bg.surface"
        borderWidth="1px"
        borderColor="border.line"
        borderRadius="xl"
        px={4}
        py={3}
        align="center"
        justify="space-between"
        gap={3}
        cursor="pointer"
        onClick={onSelect}
        scrollMarginTop="140px"
        _hover={{ borderColor: "fg.muted" }}
      >
        <HStack spacing={3} minW={0}>
          <DayBadge dayNumber={day.dayNumber} size={36} fontSize="17px" />
          <Box minW={0}>
            <Text fontWeight={600} noOfLines={1}>
              {formatDayDate(day.date, "EEE d MMM")}
              {place ? ` · ${place}` : ""}
            </Text>
            <Text fontSize="12px" color="fg.muted" noOfLines={1}>
              {isTravelDay || transferStop
                ? `Travel day${transferStop ? ` · ${transferStop.placeName} · about ${fmtDur(transferStop.visitDurationMinutes)}` : ""}${summary.visits > 0 ? ` · ${summary.visits} stop${summary.visits === 1 ? "" : "s"}` : ""}`
                : statsLine}
            </Text>
          </Box>
        </HStack>
        <HStack spacing={2} flexShrink={0}>
          {insights.overrunMinutes > 0 && (
            <Pill tone="warn" icon={LuClock}>
              Until {insights.endsAt}
            </Pill>
          )}
          {unbookedTransfer && (
            <Pill tone="warn" icon={LuTriangleAlert}>
              Not booked
            </Pill>
          )}
          {summary.warnings > 0 && (
            <Pill tone="warn" icon={LuTriangleAlert}>
              {summary.warnings}
            </Pill>
          )}
          <IconButton aria-label={`Expand day ${day.dayNumber}`} title="Expand day" icon={<LuChevronDown size={18} />} variant="outline" onClick={onSelect} />
        </HStack>
      </Flex>
    );
  }

  const WeatherIcon = weather ? weatherIcon(weather.code) : LuSun;
  const firstTimed = middle[0];
  const leaveAt = firstTimed ? hhmm(toMinutes(firstTimed.arrivalTime) - (firstTimed.travelDurationMinutes || 0)) : plan.trip.dailyStartTime;

  // ---------------- Expanded ----------------
  return (
    <Box
      ref={ref}
      as="section"
      aria-label={`Day ${day.dayNumber}, ${formatDayDate(day.date, "EEE d MMM")}`}
      bg="bg.surface"
      borderWidth="1px"
      borderColor={isSelected && !plan.compact ? "border.line" : "border.line"}
      borderRadius="xl"
      scrollMarginTop="140px"
    >
      {plan.compact ? (
        <Flex px="14px" py="10px" justify="space-between" align="center" gap={2}>
          <Box minW={0}>
            <Text fontWeight={600} noOfLines={1}>
              {formatDayDate(day.date, "EEE d MMM")}
              {place ? ` · ${place}` : ""}
            </Text>
            <Text fontSize="12px" color="fg.muted">
              {statsLine}
            </Text>
          </Box>
          <HStack spacing={1}>
            {weather && (
              <Pill h="28px" icon={WeatherIcon}>
                {weather.tempMaxC}°
              </Pill>
            )}
            <DayMenu day={day} mapsUrl={mapsUrl} />
          </HStack>
        </Flex>
      ) : (
        <>
          <Flex px="18px" pt={4} pb={3} justify="space-between" align="flex-start" gap={3} flexWrap="wrap" cursor="pointer" onClick={onSelect}>
            <HStack spacing={3} minW={0}>
              <DayBadge dayNumber={day.dayNumber} borderRadius="12px" fontSize="20px" />
              <Box minW={0}>
                <HStack spacing={2} flexWrap="wrap">
                  <Text as="h2" fontFamily="heading" fontWeight={600} fontSize="20px" lineHeight={1.25}>
                    {formatDayDate(day.date, "EEE d MMM")}
                  </Text>
                  {(isTravelDay || transferStop || isFreeDay || dayTrip) && (
                  <Pill
                    tone={dayTrip ? "accent" : "neutral"}
                    icon={isTravelDay || transferStop ? LuTrainFront : isFreeDay ? LuSun : dayTrip ? LuRoute : LuCamera}
                  >
                    {isTravelDay || transferStop ? "Travel day" : isFreeDay ? "Free day" : dayTrip ? `Day trip · ${dayTrip}` : "Sightseeing"}
                  </Pill>
                  )}
                </HStack>
                {place && (
                  <Text fontSize="12px" color="fg.muted">
                    {place}
                  </Text>
                )}
              </Box>
            </HStack>
            <HStack spacing="6px" onClick={(e) => e.stopPropagation()}>
              {weather && (
                <Tooltip
                  label={`${weather.summary}${weather.rainChance !== undefined ? ` · ${weather.rainChance}% chance of rain` : ""}${weather.kind === "typical" ? " · typical weather for these dates (a forecast appears ~2 weeks before)" : ""}`}
                  hasArrow
                >
                  <Pill h="28px" gap={2} icon={WeatherIcon} tabIndex={0}>
                    {weather.tempMaxC}° / {weather.tempMinC}° · {weather.summary}
                    {weather.kind === "forecast" && (weather.rainChance ?? 0) >= 30 ? ` · ${weather.rainChance}%` : ""}
                    <Text as="span" fontWeight={400}>
                      {weather.kind === "forecast" ? "forecast" : "typical"}
                    </Text>
                  </Pill>
                </Tooltip>
              )}
              <DayMenu day={day} mapsUrl={mapsUrl} />
            </HStack>
          </Flex>
          <Flex px="18px" pb="14px" gap={5} rowGap={1} fontSize="12px" flexWrap="wrap" align="center">
            <HStack spacing="6px">
              <Icon as={LuMapPin} boxSize="14px" />
              <Text fontWeight={600}>
                {summary.visits} stop{summary.visits === 1 ? "" : "s"}
              </Text>
            </HStack>
            {summary.travelMinutes > 0 && (
              <HStack spacing="6px">
                <Icon as={TravelIcon} boxSize="14px" />
                <Text>
                  <b>{fmtDur(summary.travelMinutes)}</b> travel
                </Text>
              </HStack>
            )}
            {summary.travelKm > 0 && (
              <HStack spacing="6px">
                <Icon as={LuRoute} boxSize="14px" />
                <Text fontWeight={600}>{summary.travelKm} km</Text>
              </HStack>
            )}
            {summary.start && summary.end && (
              <HStack spacing="6px">
                <Icon as={LuClock} boxSize="14px" />
                <Text fontWeight={600}>
                  {summary.start} – {summary.end}
                </Text>
              </HStack>
            )}
            {summary.warnings > 0 && (
              <Pill tone="warn" icon={LuTriangleAlert}>
                {summary.warnings} to check
              </Pill>
            )}
            {unbookedTransfer && (
              <Pill tone="warn" icon={LuTriangleAlert} as="button" onClick={() => plan.goTo("bookings")}>
                Not booked
              </Pill>
            )}
          </Flex>
          {(insights.overrunMinutes > 0 || insights.savingKm > 0) && (
            <Flex direction="column" gap={2} px="18px" pb={3}>
              {insights.overrunMinutes > 0 && (
                <Flex align="center" gap={2} px={3} py={2} borderRadius="md" bg="warn.soft" color="warn" fontSize="13px" flexWrap="wrap">
                  <Icon as={LuClock} boxSize="15px" flexShrink={0} />
                  <Text flex={1} minW="200px">
                    <b>Runs until {insights.endsAt}</b> — {fmtDur(insights.overrunMinutes)} past your {plan.trip.dailyEndTime} end. Move a stop to another day
                    {insights.savingKm > 0 ? ", or reorder for a shorter drive" : ""}.
                  </Text>
                </Flex>
              )}
              {insights.savingKm > 0 && !plan.readOnly && (
                <Flex align="center" gap={2} px={3} py={2} borderRadius="md" bg="accent.soft" color="accent.text" fontSize="13px" flexWrap="wrap">
                  <Icon as={LuRoute} boxSize="15px" flexShrink={0} />
                  <Text flex={1} minW="180px">
                    A better order saves about <b>{insights.savingKm} km</b> of driving.
                  </Text>
                  <Button size="xs" variant="outline" bg="bg.surface" onClick={() => plan.optimizeDay(day)}>
                    Optimize route
                  </Button>
                </Flex>
              )}
            </Flex>
          )}
          {day.dressCode && (
            <HStack px="18px" pb={3} mt="-6px" spacing="6px" fontSize="12px" color="fg.muted">
              <Icon as={LuShirt} boxSize="13px" />
              <Text>{day.dressCode}</Text>
            </HStack>
          )}
          <Divider borderColor="border.line" />
        </>
      )}

      <Box px={plan.compact ? 3 : "18px"} pt={plan.compact ? 1 : "14px"} pb={plan.compact ? 3 : 4}>
        {bookings.length > 0 && (
          <Flex direction="column" gap={2} mb={3}>
            {bookings.map((b) => {
              const meta = BOOKING_META[b.type];
              const inPlan = day.stops.some((s) => s.placeName === b.title && s.fixedStartTime === b.startTime);
              return (
                <HStack key={b.id} spacing={2} fontSize="13px" px={3} py={2} borderRadius="md" bg="bg.subtle" flexWrap="wrap">
                  <Icon as={meta.icon} color="accent.text" />
                  <Text fontWeight={600}>{b.startTime ?? "Booked"}</Text>
                  <Text noOfLines={1} flex={1} minW="120px">
                    {b.title}
                    {b.confirmationNumber ? ` · Conf. ${b.confirmationNumber}` : ""}
                  </Text>
                  {!plan.readOnly && b.startTime && !inPlan && (
                    <Button size="xs" variant="outline" onClick={() => plan.addBookingToDay(b, day)}>
                      Add to plan
                    </Button>
                  )}
                </HStack>
              );
            })}
          </Flex>
        )}

        {ordered.length === 0 ? (
          <Text fontSize="13px" color="fg.muted" textAlign="center" py={4}>
            {isFreeDay ? "Free day — nothing planned yet." : "Nothing planned for this day yet."}
          </Text>
        ) : (
          <Box>
            {!isTravelDay && pinnedFirst.length === 0 && (startStay || missingStay) && (
              <StayRow
                time={leaveAt}
                title={startStay ? `Start · ${startStay.name}` : "No stay for last night"}
                subtitle={startStay ? (day.dayNumber === 1 ? "Your stay" : "Where you woke up") : "Days start and end at your stay once you add one"}
                action={
                  !startStay && !plan.readOnly ? (
                    <Button size="sm" variant="link" color="warn" onClick={() => plan.goTo("stays", day.legId)}>
                      Add a stay
                    </Button>
                  ) : undefined
                }
              />
            )}

            {pinnedFirst.map((stop) => (
              <StopRow key={stop.id} stop={stop} day={day} draggable={false} />
            ))}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={middle.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {middle.map((stop) => {
                  const index = ordered.indexOf(stop);
                  const prev = index > 0 ? ordered[index - 1] : undefined;
                  const showConnector = index > 0 || Boolean(startStay) || Boolean(missingStay);
                  return (
                    <Box key={stop.id}>
                      {showConnector && <TravelConnector prev={prev} stop={stop} />}
                      <StopRow
                        stop={stop}
                        day={day}
                        visitNumber={visitNumbers.get(stop.id)}
                        // Booked stops are pinned to their time; empty meal slots float to mealtime on their own.
                        draggable={!plan.readOnly && !plan.compact && !stop.fixedStartTime && !(stop.stopType === "meal" && !stop.placeId)}
                      />
                    </Box>
                  );
                })}
              </SortableContext>
            </DndContext>

            {pinnedLast.map((stop) => {
              const index = ordered.indexOf(stop);
              return (
                <Box key={stop.id}>
                  <TravelConnector prev={ordered[index - 1]} stop={stop} />
                  <StopRow stop={stop} day={day} draggable={false} />
                </Box>
              );
            })}
          </Box>
        )}

        {!plan.readOnly && !isTravelDay && (
          <Button mt={3} ml={plan.compact ? 0 : "62px"} size="sm" variant="ghost" color="fg.muted" leftIcon={<LuPlus />} onClick={() => plan.openAddStop(day)}>
            Add a place or activity
          </Button>
        )}
      </Box>
    </Box>
  );
});

function DayMenu({ day, mapsUrl }: { day: ItineraryDay; mapsUrl: string | null }) {
  const plan = usePlan();
  return (
    <Menu isLazy placement="bottom-end">
      <MenuButton as={IconButton} aria-label={`Day ${day.dayNumber} options`} title="Day options" icon={<LuEllipsis size={18} />} variant="outline" />
      <MenuList fontSize="13px" zIndex={1500}>
        <MenuItem icon={<LuMap />} onClick={() => plan.showDayOnMap(day)}>
          Show this day on the map
        </MenuItem>
        {mapsUrl && (
          <MenuItem as="a" href={mapsUrl} target="_blank" rel="noopener noreferrer" icon={<LuExternalLink />}>
            Open the whole day in Google Maps
          </MenuItem>
        )}
        {!plan.readOnly && (
          <MenuItem as={RouterLink} to={`/trips/${plan.trip.id}/today?day=${day.dayNumber}`} icon={<LuSmartphone />}>
            Follow this day on your phone
          </MenuItem>
        )}
        {!plan.readOnly && day.dayType !== "transfer" && (
          <>
            <MenuDivider />
            <MenuItem icon={<LuPlus />} onClick={() => plan.openAddStop(day)}>
              Add a place or activity
            </MenuItem>
            {day.stops.filter((s) => s.coordinates && s.stopType !== "meal" && s.stopType !== "transfer" && s.stopType !== "return").length >= 2 && (
              <MenuItem icon={<LuRoute />} onClick={() => plan.optimizeDay(day)}>
                Optimize route (shortest drive)
              </MenuItem>
            )}
            {day.legId && (
              <MenuItem icon={<LuRefreshCw />} onClick={() => plan.replanCity(day.legId!)}>
                Replan {day.legName ?? "this city"}
              </MenuItem>
            )}
          </>
        )}
      </MenuList>
    </Menu>
  );
}
