import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  SimpleGrid,
  Stack,
  Tag,
  Text,
  useToast,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { FiChevronDown, FiMapPin, FiStar } from "react-icons/fi";
import { MdRestaurant } from "react-icons/md";
import { getApiErrorMessage } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { useItineraryQuery, useUpdateMealSlot } from "@/modules/itinerary/hooks/useItinerary";
import { MealPickerDrawer } from "@/modules/itinerary/components/plan/MealPickerDrawer";
import type { ItineraryDay, ItineraryStop, MealType } from "@/modules/itinerary/types";
import { formatDayDate } from "@/modules/itinerary/utils/plan.utils";
import { useTripEatShopQuery } from "@/modules/places/hooks/usePlaces";
import type { Place } from "@/modules/places/types/place.types";
import { CitySwitcher } from "@/modules/trips/components/CitySwitcher";
import type { Trip } from "@/modules/trips/types/trip.types";
import { buildTripDayPlans, getEffectiveLegs, isDayOwnedByLeg } from "@/modules/trips/utils/trip-leg.utils";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  tiffin: "Snacks",
  dinner: "Dinner",
};

interface FoodViewProps {
  trip: Trip;
  cityId: string;
  onCityChange: (legId: string) => void;
  onGoToGuide: () => void;
}

type MealSlot = { day: ItineraryDay; stop: ItineraryStop };

function RestaurantCard({
  place,
  slots,
  onAssign,
  isBusy,
}: {
  place: Place;
  slots: MealSlot[];
  onAssign: (slot: MealSlot) => void;
  isBusy: boolean;
}) {
  const border = "border.line";
  const bg = "bg.surface";
  const muted = "fg.muted";

  const byDay = new Map<number, MealSlot[]>();
  for (const slot of slots) byDay.set(slot.day.dayNumber, [...(byDay.get(slot.day.dayNumber) ?? []), slot]);

  return (
    <Flex p={4} bg={bg} borderWidth="1px" borderColor={border} borderRadius="lg" direction="column" gap={2}>
      <Box flex={1}>
        <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
          {place.name}
        </Text>
        <HStack spacing={1.5} fontSize="xs" color={muted} mt={0.5} flexWrap="wrap">
          {place.rating !== undefined && (
            <HStack spacing={0.5}>
              <Icon as={FiStar} color="yellow.500" />
              <Text>
                {place.rating.toFixed(1)}
                {place.userRatingCount ? ` (${place.userRatingCount.toLocaleString()})` : ""}
              </Text>
            </HStack>
          )}
          {place.priceLevel && <Text>· {place.priceLevel}</Text>}
        </HStack>
        {place.formattedAddress && (
          <HStack mt={1.5} spacing={1} align="start" fontSize="xs" color={muted}>
            <Icon as={FiMapPin} mt="2px" flexShrink={0} />
            <Text noOfLines={2}>{place.formattedAddress}</Text>
          </HStack>
        )}
      </Box>
      <Menu isLazy>
        <MenuButton
          as={Button}
          size="xs"
          variant="outline"
          rightIcon={<FiChevronDown />}
          isDisabled={slots.length === 0}
          isLoading={isBusy}
          alignSelf="start"
        >
          {slots.length === 0 ? "Generate a plan to schedule meals" : "Plan a meal here"}
        </MenuButton>
        <MenuList maxH="320px" overflowY="auto" fontSize="sm">
          {[...byDay.entries()].map(([dayNumber, daySlots]) => (
            <MenuGroup key={dayNumber} title={`Day ${dayNumber} · ${formatDayDate(daySlots[0].day.date, "EEE d MMM")}`}>
              {daySlots.map((slot) => (
                <MenuItem key={slot.stop.id} pl={6} onClick={() => onAssign(slot)}>
                  {MEAL_LABELS[slot.stop.mealType ?? "lunch"]} at {slot.stop.arrivalTime}
                  {slot.stop.placeId ? ` (replaces ${slot.stop.placeName})` : ""}
                </MenuItem>
              ))}
            </MenuGroup>
          ))}
        </MenuList>
      </Menu>
    </Flex>
  );
}

export function FoodView({ trip, cityId, onCityChange, onGoToGuide }: FoodViewProps) {
  const toast = useToast();
  const legs = getEffectiveLegs(trip);
  const leg = legs.find((l) => l.id === cityId) ?? legs[0];
  const { data: eatShop, isLoading } = useTripEatShopQuery(trip.id);
  const { data: itineraryData } = useItineraryQuery(trip.id);
  const updateMealSlot = useUpdateMealSlot(trip.id);
  const [busyPlaceId, setBusyPlaceId] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<MealSlot | null>(null);

  const muted = "fg.muted";
  const cardBg = "bg.surface";
  const border = "border.line";
  const calloutBg = "warn.soft";

  const mealSlots = useMemo<MealSlot[]>(() => {
    if (!leg || !itineraryData?.itinerary) return [];
    const dayPlans = buildTripDayPlans(trip);
    return itineraryData.itinerary.days
      .filter((d) => isDayOwnedByLeg(d.date, dayPlans, leg.id))
      .flatMap((day) => day.stops.filter((s) => s.stopType === "meal").map((stop) => ({ day, stop })));
  }, [itineraryData, leg, trip]);

  if (!leg) return null;
  if (isLoading) return <LoadingState />;

  const foodPoolIds = new Set(leg.foodPoolIds);
  const marketPoolIds = new Set(leg.marketPoolIds);
  const restaurants = (eatShop?.foodPlaces ?? []).filter((p) => p.googlePlaceId && foodPoolIds.has(p.googlePlaceId));
  const markets = (eatShop?.marketPlaces ?? []).filter((p) => p.googlePlaceId && marketPoolIds.has(p.googlePlaceId));
  const localFood = leg.destinationBrief?.localFood ?? [];

  const assign = async (place: Place, slot: MealSlot) => {
    setBusyPlaceId(place.googlePlaceId ?? null);
    try {
      await updateMealSlot.mutateAsync({ dayNumber: slot.day.dayNumber, stopId: slot.stop.id, placeId: place.googlePlaceId });
      toast({
        title: `${place.name} → Day ${slot.day.dayNumber} ${MEAL_LABELS[slot.stop.mealType ?? "lunch"].toLowerCase()}`,
        status: "success",
        duration: 2500,
      });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    } finally {
      setBusyPlaceId(null);
    }
  };

  const slotsByDay = new Map<number, MealSlot[]>();
  for (const slot of mealSlots) slotsByDay.set(slot.day.dayNumber, [...(slotsByDay.get(slot.day.dayNumber) ?? []), slot]);

  return (
    <Stack spacing={6}>
      <CitySwitcher legs={legs} value={leg.id} onChange={onCityChange} />

      <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="xl" p={5}>
        <Heading size="md" mb={1}>
          Your meals in {leg.name || leg.baseCity}
        </Heading>
        <Text fontSize="sm" color={muted} mb={4}>
          Meals sit in your day plan at the right time. Pick a place for each — suggestions are near where you'll be.
        </Text>
        {slotsByDay.size === 0 ? (
          <Text fontSize="sm" color={muted}>
            Generate the day plan first — meal breaks are added automatically.
          </Text>
        ) : (
          <Stack spacing={3}>
            {[...slotsByDay.entries()].map(([dayNumber, slots]) => (
              <Flex key={dayNumber} gap={4} align="start" flexWrap="wrap">
                <Box w="120px" flexShrink={0}>
                  <Text fontSize="sm" fontWeight="semibold">
                    Day {dayNumber}
                  </Text>
                  <Text fontSize="xs" color={muted}>
                    {formatDayDate(slots[0].day.date)}
                  </Text>
                </Box>
                <Wrap flex={1} spacing={2}>
                  {slots.map((slot) => (
                    <WrapItem key={slot.stop.id}>
                      <Button
                        size="sm"
                        variant={slot.stop.placeId ? "outline" : "ghost"}
                        colorScheme={slot.stop.placeId ? "gray" : "orange"}
                        borderStyle={slot.stop.placeId ? "solid" : "dashed"}
                        borderWidth="1px"
                        leftIcon={<Icon as={MdRestaurant} />}
                        onClick={() => setPickerTarget(slot)}
                        fontWeight="normal"
                      >
                        <Text as="span" fontWeight="semibold" mr={1}>
                          {MEAL_LABELS[slot.stop.mealType ?? "lunch"]} {slot.stop.arrivalTime}
                        </Text>
                        · {slot.stop.placeId ? slot.stop.placeName : "pick a place"}
                      </Button>
                    </WrapItem>
                  ))}
                </Wrap>
              </Flex>
            ))}
          </Stack>
        )}
      </Box>

      <Box p={5} bg={calloutBg} borderRadius="xl">
        <Heading size="sm" mb={2}>
          Local dishes to try
        </Heading>
        {localFood.length > 0 ? (
          <Wrap>
            {localFood.map((item) => (
              <WrapItem key={item}>
                <Tag colorScheme="orange" size="md">
                  {item}
                </Tag>
              </WrapItem>
            ))}
          </Wrap>
        ) : (
          <HStack justify="space-between" flexWrap="wrap">
            <Text fontSize="sm" color={muted}>
              Generate the local guide to get this city's must-try dishes.
            </Text>
            <Button size="sm" variant="outline" onClick={onGoToGuide}>
              Open guide
            </Button>
          </HStack>
        )}
      </Box>

      <Box>
        <Heading size="sm" mb={3}>
          Popular places to eat ({restaurants.length})
        </Heading>
        {restaurants.length === 0 ? (
          <Text fontSize="sm" color={muted}>
            Run discovery on the Places tab to get restaurant ideas for this city — or pick straight from a meal slot above.
          </Text>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={3}>
            {restaurants.map((place) => (
              <RestaurantCard
                key={place.googlePlaceId}
                place={place}
                slots={mealSlots.filter((s) => s.stop.mealType !== "breakfast")}
                onAssign={(slot) => assign(place, slot)}
                isBusy={busyPlaceId === place.googlePlaceId}
              />
            ))}
          </SimpleGrid>
        )}
      </Box>

      {markets.length > 0 && (
        <Box>
          <Heading size="sm" mb={3}>
            Markets & shopping ({markets.length})
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={3}>
            {markets.map((place) => (
              <Box key={place.googlePlaceId} p={4} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="lg">
                <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
                  {place.name}
                </Text>
                <HStack spacing={1.5} fontSize="xs" color={muted} mt={0.5}>
                  {place.rating !== undefined && (
                    <HStack spacing={0.5}>
                      <Icon as={FiStar} color="yellow.500" />
                      <Text>{place.rating.toFixed(1)}</Text>
                    </HStack>
                  )}
                  {place.formattedAddress && <Text noOfLines={1}>· {place.formattedAddress}</Text>}
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
          <Text fontSize="xs" color={muted} mt={2}>
            Want to visit one? Add it to a day from the Plan tab (“Add a place or activity”).
          </Text>
        </Box>
      )}

      <MealPickerDrawer
        tripId={trip.id}
        target={pickerTarget}
        city={leg.baseCity}
        country={leg.country}
        onClose={() => setPickerTarget(null)}
      />
    </Stack>
  );
}
