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
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Stack,
  Text,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
import { forwardRef } from "react";
import { FiAlertTriangle, FiExternalLink, FiMap, FiPlus } from "react-icons/fi";
import { MdHotel } from "react-icons/md";
import type { ItineraryDay } from "@/modules/itinerary/types";
import type { DayWeather, TripBooking } from "@/modules/trips/types/trip-extras.types";
import { BOOKING_META } from "@/modules/trips/components/bookings/bookingMeta";
import {
  dayGoogleMapsUrl,
  formatDayDate,
  formatDuration,
  isVisit,
  summarizeDay,
} from "@/modules/itinerary/utils/plan.utils";
import { StopRow, TravelConnector } from "./StopRow";
import { usePlan } from "./PlanContext";

interface DayCardProps {
  day: ItineraryDay;
  weather?: DayWeather;
  /** Bookings starting this day (transfer-linked ones already show as the travel stop). */
  bookings?: TripBooking[];
  startStay?: { name: string; coordinates?: { lat: number; lng: number } };
  isSelected: boolean;
  onSelect: () => void;
}

export const DayCard = forwardRef<HTMLDivElement, DayCardProps>(function DayCard(
  { day, startStay, isSelected, onSelect, weather, bookings = [] },
  ref,
) {
  const plan = usePlan();
  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const selectedBorder = useColorModeValue("brand.400", "brand.300");
  const muted = useColorModeValue("gray.500", "gray.400");
  const headerBg = useColorModeValue("gray.50", "whiteAlpha.50");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const summary = summarizeDay(day);
  const pinnedFirst = day.stops.filter((s) => s.stopType === "transfer");
  const pinnedLast = day.stops.filter((s) => s.stopType === "return");
  const middle = day.stops.filter((s) => s.stopType !== "transfer" && s.stopType !== "return");
  const mapsUrl = dayGoogleMapsUrl(day, startStay?.coordinates, plan.trip.transportationMode);

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

  const isTravelDay = day.dayType === "transfer";
  const isFreeDay = day.dayType === "free";
  const ordered = [...pinnedFirst, ...middle, ...pinnedLast];

  return (
    <Box
      ref={ref}
      bg={bg}
      borderWidth="1px"
      borderColor={isSelected ? selectedBorder : border}
      borderRadius="xl"
      overflow="hidden"
      scrollMarginTop="140px"
      transition="border-color .15s"
    >
      <Flex
        px={4}
        py={3}
        bg={headerBg}
        borderBottomWidth="1px"
        borderColor={border}
        justify="space-between"
        align="center"
        gap={3}
        flexWrap="wrap"
        cursor="pointer"
        onClick={onSelect}
      >
        <Box minW={0}>
          <HStack spacing={2} flexWrap="wrap">
            <Badge colorScheme="brand" variant="solid" borderRadius="md" px={2}>
              Day {day.dayNumber}
            </Badge>
            <Text fontWeight="semibold">{formatDayDate(day.date, "EEEE, d MMM")}</Text>
            {day.legName && (
              <Badge variant="subtle" colorScheme="gray">
                {day.legName}
              </Badge>
            )}
            {isTravelDay && <Badge colorScheme="purple">Travel day</Badge>}
            {weather && (
              <Tooltip
                label={`${weather.summary}${weather.rainChance !== undefined ? ` · ${weather.rainChance}% chance of rain` : ""}${weather.kind === "typical" ? " · typical weather for these dates (forecast appears ~2 weeks before)" : ""}`}
                hasArrow
              >
                <Badge variant="outline" colorScheme={weather.kind === "forecast" ? "blue" : "gray"} fontWeight="normal" textTransform="none">
                  {weather.icon} {weather.tempMaxC}°/{weather.tempMinC}°
                  {weather.kind === "forecast" && (weather.rainChance ?? 0) >= 30 ? ` · ${weather.rainChance}%` : ""}
                  {weather.kind === "typical" ? " typ." : ""}
                </Badge>
              </Tooltip>
            )}
            {summary.warnings > 0 && (
              <Badge colorScheme="orange" display="flex" alignItems="center" gap={1}>
                <Icon as={FiAlertTriangle} boxSize={3} />
                {summary.warnings} to check
              </Badge>
            )}
          </HStack>
          {!isTravelDay && !isFreeDay && day.stops.length > 0 && (
            <Text fontSize="xs" color={muted} mt={1}>
              {summary.visits > 0 ? `${summary.visits} stop${summary.visits === 1 ? "" : "s"}` : "No visits planned"}
              {summary.travelMinutes > 0 && ` · ${formatDuration(summary.travelMinutes)} getting around`}
              {summary.travelKm > 0 && ` (${summary.travelKm} km)`}
              {summary.start && summary.end && ` · ${summary.start}–${summary.end}`}
            </Text>
          )}
          {day.dressCode && (
            <Text fontSize="xs" color={muted} mt={0.5}>
              👕 {day.dressCode}
            </Text>
          )}
        </Box>
        <HStack spacing={1} onClick={(e) => e.stopPropagation()}>
          <Tooltip label="Show this day on the map" hasArrow>
            <IconButton
              aria-label="Show on map"
              icon={<FiMap />}
              size="sm"
              variant={isSelected ? "solid" : "ghost"}
              colorScheme={isSelected ? "brand" : "gray"}
              onClick={onSelect}
            />
          </Tooltip>
          {mapsUrl && (
            <Tooltip label="Open the whole day in Google Maps" hasArrow>
              <IconButton
                as="a"
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in Google Maps"
                icon={<FiExternalLink />}
                size="sm"
                variant="ghost"
              />
            </Tooltip>
          )}
        </HStack>
      </Flex>

      <Box px={{ base: 2, md: 4 }} py={4}>
        {bookings.length > 0 && (
          <Stack spacing={2} mb={4} ml={{ base: 0, md: "88px" }}>
            {bookings.map((b) => {
              const meta = BOOKING_META[b.type];
              const inPlan = day.stops.some((s) => s.placeName === b.title && s.fixedStartTime === b.startTime);
              return (
                <HStack key={b.id} spacing={2} fontSize="sm" p={2} borderRadius="md" bg={headerBg} flexWrap="wrap">
                  <Icon as={meta.icon} color={`${meta.color}.500`} />
                  <Text fontWeight="semibold">{b.startTime ?? "Booked"}</Text>
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
          </Stack>
        )}
        {ordered.length === 0 ? (
          <Text fontSize="sm" color={muted} textAlign="center" py={4}>
            {isFreeDay ? "Free day — nothing planned yet." : "Nothing planned for this day yet."}
          </Text>
        ) : (
          <Stack spacing={0}>
            {startStay && !isTravelDay && pinnedFirst.length === 0 && (
              <HStack spacing={3} mb={0}>
                <Box w="52px" />
                <Flex w="24px" justify="center">
                  <Flex w="24px" h="24px" borderRadius="full" bg="blue.400" color="white" align="center" justify="center">
                    <Icon as={MdHotel} boxSize={3.5} />
                  </Flex>
                </Flex>
                <Text fontSize="sm" color={muted}>
                  Start at <b>{startStay.name}</b>
                </Text>
              </HStack>
            )}

            {pinnedFirst.map((stop) => (
              <Box key={stop.id}>
                <StopRow stop={stop} day={day} draggable={false} />
              </Box>
            ))}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={middle.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                {middle.map((stop) => {
                  const index = ordered.indexOf(stop);
                  const prev = index > 0 ? ordered[index - 1] : undefined;
                  const showConnector = index > 0 || Boolean(startStay);
                  return (
                    <Box key={stop.id}>
                      {showConnector && <TravelConnector prev={prev} stop={stop} />}
                      <StopRow
                        stop={stop}
                        day={day}
                        visitNumber={visitNumbers.get(stop.id)}
                        // Booked stops are pinned to their time; empty meal slots float to mealtime on their own.
                        draggable={!plan.readOnly && !stop.fixedStartTime && !(stop.stopType === "meal" && !stop.placeId)}
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
          </Stack>
        )}

        {!plan.readOnly && !isTravelDay && (
          <Button
            mt={4}
            ml={{ base: 0, md: "88px" }}
            size="sm"
            variant="ghost"
            leftIcon={<FiPlus />}
            color={muted}
            onClick={() => plan.openAddStop(day)}
          >
            Add a place or activity
          </Button>
        )}
      </Box>
    </Box>
  );
});
