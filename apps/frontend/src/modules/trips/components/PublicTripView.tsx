import { Box, Button, Flex, Heading, HStack, Icon, Stack, Text, Wrap, WrapItem } from "@chakra-ui/react";
import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import { FiMap, FiMapPin, FiNavigation } from "react-icons/fi";
import { LuUtensils } from "react-icons/lu";
import { ChoiceChip, DayBadge, Overline, SurfaceCard } from "@/components/ui";
import { formatDateRange, tripDayCount, tripRouteLabel } from "@/components/ui/app-format";
import { MapView } from "@/modules/itinerary/components/MapView";
import { TripMapView } from "@/modules/itinerary/components/TripMapView";
import type { Itinerary, ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import { getDayStartStay, getEffectiveStays } from "@/modules/trips/utils/stay.utils";

interface PublicTripViewProps {
  trip: Trip;
  itinerary?: Itinerary | null;
}

const PACE_LABEL: Record<string, string> = { Relaxed: "Relaxed", Balanced: "Balanced", "Fast Paced": "Packed" };

function dayTitle(day: ItineraryDay): string {
  let date = "";
  try {
    date = format(parseISO(day.date.slice(0, 10)), "EEE d MMM");
  } catch {
    date = `Day ${day.dayNumber}`;
  }
  return [date, day.legName].filter(Boolean).join(" · ");
}

function stopIcon(stop: ItineraryStop) {
  if (stop.stopType === "transfer") return FiNavigation;
  if (stop.stopType === "meal" || stop.stopType === "food") return LuUtensils;
  return FiMapPin;
}

/** Read-only trip for anyone with the link: the days on the left, the map on the right. */
export function PublicTripView({ trip, itinerary = null }: PublicTripViewProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const legs = useMemo(() => getEffectiveLegs(trip), [trip]);
  const days = useMemo(() => (itinerary?.days ?? []).filter((d) => d.stops.length > 0 || d.dayType === "transfer"), [itinerary]);
  const hasItinerary = days.some((d) => d.stops.length > 0);
  const selectedDay = days.find((d) => d.dayNumber === selected) ?? null;

  const stays = useMemo(
    () => legs.flatMap((l) => getEffectiveStays(l).flatMap((s) => (s.coordinates ? [{ name: s.name, coordinates: s.coordinates }] : []))),
    [legs],
  );
  const dayStart = (day: ItineraryDay) => {
    const leg = legs.find((l) => l.id === day.legId);
    return (leg && getDayStartStay(leg, day.date.slice(0, 10))?.coordinates) ?? trip.hotelCoordinates;
  };

  const route = tripRouteLabel(trip);
  const nDays = tripDayCount(trip);
  const subtitle = [formatDateRange(trip.startDate, trip.endDate, true), route, nDays ? `${nDays} ${nDays === 1 ? "day" : "days"}` : ""].filter(Boolean).join(" · ");

  const details = [
    PACE_LABEL[trip.travelStyle] && `${PACE_LABEL[trip.travelStyle]} pace`,
    trip.transportationMode,
    trip.dailyStartTime && trip.dailyEndTime ? `Days ${trip.dailyStartTime}–${trip.dailyEndTime}` : "",
  ].filter(Boolean);

  const stays4List = legs.flatMap((l) => getEffectiveStays(l).map((s) => s.name));
  if (stays4List.length === 0 && trip.hotelName) stays4List.push(trip.hotelName);

  return (
    <Flex direction={{ base: "column", lg: "row" }} minH={{ lg: "calc(100vh - 64px)" }}>
      <Box order={{ base: 2, lg: 1 }} w={{ base: "full", lg: "520px", xl: "620px" }} flexShrink={0} borderRightWidth={{ lg: "1px" }} borderColor="border.line">
        <Stack spacing="16px" px={{ base: "16px", md: "40px" }} py={{ base: "20px", md: "28px" }}>
          <Box>
            <Heading as="h1" fontSize={{ base: "28px", md: "36px" }} lineHeight={1.15}>
              {trip.title}
            </Heading>
            <Text color="fg.muted" mt="4px">
              {subtitle}
            </Text>
          </Box>

          {itinerary?.summary && (
            <SurfaceCard p="16px" bg="accent.soft" borderColor="transparent">
              <Overline color="accent.text" mb="6px">
                Trip summary
              </Overline>
              <Text fontSize="13px" whiteSpace="pre-wrap" lineHeight={1.6}>
                {itinerary.summary}
              </Text>
            </SurfaceCard>
          )}

          {hasItinerary ? (
            <>
              <HStack spacing="8px" flexWrap="wrap" rowGap="8px" role="group" aria-label="Show on the map">
                <ChoiceChip selected={selected === null} onClick={() => setSelected(null)} icon={FiMap}>
                  Whole trip
                </ChoiceChip>
                <Text fontSize="12px" color="fg.muted">
                  or pick a day to see it on the map
                </Text>
              </HStack>
              {days.map((day) => {
                const on = selected === day.dayNumber;
                const stops = day.stops.filter((s) => s.stopType !== "return");
                return (
                  <SurfaceCard
                    key={day.dayNumber}
                    as="button"
                    onClick={() => setSelected(on ? null : day.dayNumber)}
                    aria-pressed={on}
                    textAlign="left"
                    w="full"
                    px="16px"
                    py="14px"
                    display="flex"
                    flexDirection="column"
                    gap="8px"
                    borderColor={on ? "accent" : "border.line"}
                    boxShadow={on ? "0 0 0 1px var(--chakra-colors-accent)" : undefined}
                    _hover={{ bg: "bg.subtle" }}
                  >
                    <HStack spacing="10px">
                      <DayBadge dayNumber={day.dayNumber} size={32} borderRadius="9px" />
                      <Text fontWeight={600}>{dayTitle(day)}</Text>
                    </HStack>
                    {day.dayType === "transfer" && stops.length === 0 && (
                      <HStack spacing="8px" fontSize="12px" color="fg.muted">
                        <Icon as={FiNavigation} boxSize="14px" />
                        <Text>{day.transferLabel ?? "Travel day"}</Text>
                      </HStack>
                    )}
                    {stops.map((s) => (
                      <HStack key={s.id} spacing="8px" fontSize="12px" align="flex-start">
                        <Icon as={stopIcon(s)} boxSize="14px" color="fg.muted" mt="1px" flexShrink={0} />
                        <Text flex={1} minW={0}>
                          {s.placeName}
                        </Text>
                        {s.arrivalTime && (
                          <Text color="fg.muted" flexShrink={0}>
                            {s.arrivalTime}
                          </Text>
                        )}
                      </HStack>
                    ))}
                  </SurfaceCard>
                );
              })}
            </>
          ) : (
            <>
              <SurfaceCard borderStyle="dashed" bg="transparent" px="16px" py="14px">
                <Text fontSize="13px" color="fg.muted">
                  The day-by-day plan hasn&rsquo;t been made yet. Here&rsquo;s the route so far.
                </Text>
              </SurfaceCard>
              {legs.map((leg, i) => (
                <SurfaceCard key={leg.id} px="16px" py="14px">
                  <HStack spacing="10px">
                    <DayBadge dayNumber={i + 1} size={32} borderRadius="9px" />
                    <Box>
                      <Text fontWeight={600}>{leg.name || leg.baseCity}</Text>
                      <Text fontSize="12px" color="fg.muted">
                        {formatDateRange(leg.startDate, leg.endDate)}
                        {leg.country ? ` · ${leg.country}` : ""}
                      </Text>
                    </Box>
                  </HStack>
                </SurfaceCard>
              ))}
            </>
          )}

          <SurfaceCard px="16px" py="14px">
            <Overline mb="8px">Trip details</Overline>
            <Wrap spacing="6px">
              {details.map((d) => (
                <WrapItem key={d}>
                  <Text as="span" fontSize="12px" fontWeight={600} bg="bg.subtle" color="fg.muted" px="10px" h="24px" display="inline-flex" alignItems="center" borderRadius="full">
                    {d}
                  </Text>
                </WrapItem>
              ))}
            </Wrap>
            {stays4List.length > 0 && (
              <Text fontSize="12px" color="fg.muted" mt="8px">
                Staying at {stays4List.join(", ")}
              </Text>
            )}
            {trip.interests.length > 0 && (
              <Text fontSize="12px" color="fg.muted" mt="6px">
                Into {trip.interests.map((x) => x.toLowerCase()).join(", ")}
              </Text>
            )}
          </SurfaceCard>

          {trip.notes && (
            <SurfaceCard px="16px" py="14px">
              <Overline mb="6px">Notes</Overline>
              <Text fontSize="13px" whiteSpace="pre-wrap">
                {trip.notes}
              </Text>
            </SurfaceCard>
          )}

          <Text fontSize="12px" color="fg.muted">
            No login needed. Comments and votes are for trip members.
          </Text>
        </Stack>
      </Box>

      <Box order={{ base: 1, lg: 2 }} flex={1} minW={0} position="relative" h={{ base: "300px", lg: "auto" }} className="no-print">
        <Box position={{ lg: "sticky" }} top={{ lg: "64px" }} h={{ base: "300px", lg: "calc(100vh - 64px)" }}>
          {hasItinerary ? (
            selectedDay ? (
              <MapView day={selectedDay} hotelCoordinates={dayStart(selectedDay)} height="100%" />
            ) : (
              <TripMapView days={days} stays={stays} onSelectDay={setSelected} height="100%" zoomControl />
            )
          ) : (
            <TripMapView days={[]} stays={stays} onSelectDay={setSelected} height="100%" zoomControl />
          )}
          {selectedDay && (
            <Button position="absolute" left="14px" top="14px" zIndex={500} size="sm" variant="outline" boxShadow="raised" onClick={() => setSelected(null)}>
              Show whole trip
            </Button>
          )}
        </Box>
      </Box>
    </Flex>
  );
}
