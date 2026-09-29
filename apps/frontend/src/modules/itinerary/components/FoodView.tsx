import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuGroup,
  MenuItem,
  MenuList,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { type ReactNode, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import { FiBookOpen, FiCheck, FiChevronDown, FiPlus, FiStar } from "react-icons/fi";
import { LuCoffee, LuCookie, LuShoppingBag, LuSoup, LuUtensils } from "react-icons/lu";
import { Overline, Pill } from "@/components/ui";
import { CityChips, IconTile, RowCard, TabSplit, Thumb } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { useItineraryQuery, useUpdateMealSlot } from "@/modules/itinerary/hooks/useItinerary";
import { MealPickerDrawer } from "@/modules/itinerary/components/plan/MealPickerDrawer";
import type { ItineraryDay, ItineraryStop, MealType } from "@/modules/itinerary/types";
import { formatDayDate } from "@/modules/itinerary/utils/plan.utils";
import { useTripEatShopQuery } from "@/modules/places/hooks/usePlaces";
import type { Place } from "@/modules/places/types/place.types";
import type { Trip } from "@/modules/trips/types/trip.types";
import { buildTripDayPlans, getEffectiveLegs, isDayOwnedByLeg } from "@/modules/trips/utils/trip-leg.utils";
import { formatDistance, isOpenNow, opensLaterToday, splitDish } from "@/modules/trips/components/tabs/placeMeta";
import { haversineKm } from "@/utils/geo";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  tiffin: "Snacks",
  dinner: "Dinner",
};

const MEAL_ICONS: Record<MealType, IconType> = {
  breakfast: LuCoffee,
  lunch: LuUtensils,
  tiffin: LuCookie,
  dinner: LuSoup,
};

interface FoodViewProps {
  trip: Trip;
  cityId: string;
  onCityChange: (legId: string) => void;
  onGoToGuide: () => void;
}

type MealSlot = { day: ItineraryDay; stop: ItineraryStop };

const mealOf = (slot: MealSlot): MealType => slot.stop.mealType ?? "lunch";
const slotName = (slot: MealSlot) => `Day ${slot.day.dayNumber} ${MEAL_LABELS[mealOf(slot)].toLowerCase()}`;

function PlaceMeta({ place, lead, from }: { place?: Place; lead?: string; from?: { lat: number; lng: number } }) {
  const parts: ReactNode[] = [];
  if (lead) parts.push(lead);
  if (place?.rating !== undefined)
    parts.push(
      <Box as="span" key="r" display="inline-flex" alignItems="center" gap="3px">
        <Icon as={FiStar} color="warn" boxSize="12px" /> {place.rating.toFixed(1)}
      </Box>,
    );
  if (place?.priceLevel) parts.push(place.priceLevel);
  if (place?.coordinates && from) parts.push(formatDistance(haversineKm(from, place.coordinates)));
  return (
    <Text fontSize="12px" color="fg.muted" noOfLines={1}>
      {parts.map((p, i) => (
        <Box as="span" key={i}>
          {i > 0 && " · "}
          {p}
        </Box>
      ))}
    </Text>
  );
}

function OpenPill({ place }: { place?: Place }) {
  if (!place) return null;
  const open = isOpenNow(place);
  const later = open === false ? opensLaterToday(place) : undefined;
  if (!open && !later) return null;
  return (
    <Pill tone={open ? "success" : "neutral"} display={{ base: "none", sm: "inline-flex" }}>
      {open ? "Open now" : later}
    </Pill>
  );
}

function PlanMealMenu({ slots, onAssign, isBusy }: { slots: MealSlot[]; onAssign: (slot: MealSlot) => void; isBusy: boolean }) {
  const byDay = new Map<number, MealSlot[]>();
  for (const slot of slots) byDay.set(slot.day.dayNumber, [...(byDay.get(slot.day.dayNumber) ?? []), slot]);
  return (
    <Menu isLazy placement="bottom-end">
      <MenuButton as={Button} variant="outline" leftIcon={<FiPlus size={16} />} rightIcon={<FiChevronDown />} isDisabled={slots.length === 0} isLoading={isBusy} flexShrink={0} title={slots.length === 0 ? "Generate a plan to schedule meals" : undefined}>
        Plan a meal
      </MenuButton>
      <MenuList maxH="320px" overflowY="auto" fontSize="13px" zIndex={20}>
        {[...byDay.entries()].map(([dayNumber, daySlots]) => (
          <MenuGroup key={dayNumber} title={`Day ${dayNumber} · ${formatDayDate(daySlots[0].day.date, "EEE d MMM")}`}>
            {daySlots.map((slot) => (
              <MenuItem key={slot.stop.id} pl={6} onClick={() => onAssign(slot)}>
                {MEAL_LABELS[mealOf(slot)]} at {slot.stop.arrivalTime}
                {slot.stop.placeId ? ` (replaces ${slot.stop.placeName})` : ""}
              </MenuItem>
            ))}
          </MenuGroup>
        ))}
      </MenuList>
    </Menu>
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

  const mealSlots = useMemo<MealSlot[]>(() => {
    if (!leg || !itineraryData?.itinerary) return [];
    const dayPlans = buildTripDayPlans(trip);
    return itineraryData.itinerary.days
      .filter((d) => isDayOwnedByLeg(d.date, dayPlans, leg.id))
      .flatMap((day) => day.stops.filter((s) => s.stopType === "meal").map((stop) => ({ day, stop })));
  }, [itineraryData, leg, trip]);

  if (!leg) return null;
  if (isLoading) return <LoadingState />;

  const city = leg.name || leg.baseCity;
  const foodPoolIds = new Set(leg.foodPoolIds);
  const marketPoolIds = new Set(leg.marketPoolIds);
  const allFood = eatShop?.foodPlaces ?? [];
  const restaurants = allFood.filter((p) => p.googlePlaceId && foodPoolIds.has(p.googlePlaceId));
  const markets = (eatShop?.marketPlaces ?? []).filter((p) => p.googlePlaceId && marketPoolIds.has(p.googlePlaceId));
  const localFood = leg.destinationBrief?.localFood ?? [];
  const placeById = new Map(allFood.filter((p) => p.googlePlaceId).map((p) => [p.googlePlaceId!, p]));

  // Saved picks: places already chosen for a meal slot in this city.
  const picks = new Map<string, { name: string; slots: MealSlot[] }>();
  for (const slot of mealSlots) {
    if (!slot.stop.placeId) continue;
    const entry = picks.get(slot.stop.placeId) ?? { name: slot.stop.placeName, slots: [] };
    entry.slots.push(slot);
    picks.set(slot.stop.placeId, entry);
  }
  const lunchDinnerSlots = mealSlots.filter((s) => s.stop.mealType !== "breakfast");
  const discover = restaurants.filter((p) => !picks.has(p.googlePlaceId!));

  const assign = async (place: Place, slot: MealSlot) => {
    setBusyPlaceId(place.googlePlaceId ?? null);
    try {
      await updateMealSlot.mutateAsync({ dayNumber: slot.day.dayNumber, stopId: slot.stop.id, placeId: place.googlePlaceId });
      toast({ title: `${place.name} → ${slotName(slot)}`, status: "success", duration: 2500 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    } finally {
      setBusyPlaceId(null);
    }
  };

  const main = (
    <Stack spacing="14px">
      <CityChips cities={legs.map((l) => ({ id: l.id, name: l.name || l.baseCity }))} value={leg.id} onChange={onCityChange} />

      <Stack spacing={2}>
        <Overline>Local dishes to try</Overline>
        {localFood.length > 0 ? (
          <Flex gap={2} flexWrap="wrap">
            {localFood.map((item) => {
              const dish = splitDish(item);
              return (
                <Flex key={item} direction="column" px={3} py={2} bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl" maxW="100%">
                  <Text fontWeight={600} fontSize="12px">
                    {dish.name}
                  </Text>
                  {dish.description && (
                    <Text fontSize="12px" color="fg.muted" letterSpacing="0.02em">
                      {dish.description}
                    </Text>
                  )}
                </Flex>
              );
            })}
          </Flex>
        ) : (
          <RowCard>
            <IconTile icon={FiBookOpen} />
            <Text fontSize="13px" color="fg.muted" flex={1}>
              Generate the local guide to get {city}&rsquo;s must-try dishes.
            </Text>
            <Button variant="outline" onClick={onGoToGuide} flexShrink={0}>
              Open guide
            </Button>
          </RowCard>
        )}
      </Stack>

      {picks.size > 0 && (
        <Stack spacing={2}>
          <Overline>Saved picks · {picks.size}</Overline>
          {[...picks.entries()].map(([placeId, pick]) => {
            const place = placeById.get(placeId);
            const first = pick.slots[0];
            return (
              <RowCard key={placeId} flexWrap={{ base: "wrap", sm: "nowrap" }}>
                <Thumb src={place?.imageUrl} seed={placeId} icon={LuUtensils} />
                <Flex direction="column" flex={1} minW={0}>
                  <Text fontWeight={600} noOfLines={1}>
                    {place?.name ?? pick.name}
                  </Text>
                  <PlaceMeta place={place} lead={MEAL_LABELS[mealOf(first)]} from={leg.hotelCoordinates} />
                </Flex>
                <OpenPill place={place} />
                <Button variant="ai" leftIcon={<FiCheck size={16} />} onClick={() => setPickerTarget(first)} flexShrink={0} title="Change this meal">
                  Assigned: {slotName(first)}
                  {pick.slots.length > 1 ? ` +${pick.slots.length - 1}` : ""}
                </Button>
              </RowCard>
            );
          })}
        </Stack>
      )}

      <Stack spacing={2}>
        <Overline>Discover in {city}</Overline>
        {discover.length === 0 ? (
          <Text fontSize="13px" color="fg.muted">
            {restaurants.length === 0
              ? "Run discovery on the Places tab to get restaurant ideas for this city — or pick straight from a meal slot."
              : "Every suggestion here is already planned for a meal."}
          </Text>
        ) : (
          discover.map((place) => (
            <RowCard key={place.googlePlaceId} flexWrap={{ base: "wrap", sm: "nowrap" }}>
              <Thumb src={place.imageUrl} seed={place.googlePlaceId!} icon={LuUtensils} />
              <Flex direction="column" flex={1} minW={0}>
                <Text fontWeight={600} noOfLines={1}>
                  {place.name}
                </Text>
                <PlaceMeta place={place} lead={place.category && !/restaurant|food/i.test(place.category) ? place.category : undefined} from={leg.hotelCoordinates} />
              </Flex>
              <OpenPill place={place} />
              <PlanMealMenu slots={lunchDinnerSlots} onAssign={(slot) => void assign(place, slot)} isBusy={busyPlaceId === place.googlePlaceId} />
            </RowCard>
          ))
        )}
      </Stack>

      {markets.length > 0 && (
        <Stack spacing={2}>
          <Overline>Markets &amp; shopping · {markets.length}</Overline>
          {markets.map((place) => (
            <RowCard key={place.googlePlaceId}>
              <Thumb src={place.imageUrl} seed={place.googlePlaceId!} icon={LuShoppingBag} />
              <Flex direction="column" flex={1} minW={0}>
                <Text fontWeight={600} noOfLines={1}>
                  {place.name}
                </Text>
                <PlaceMeta place={place} from={leg.hotelCoordinates} />
              </Flex>
              <OpenPill place={place} />
            </RowCard>
          ))}
          <Text fontSize="12px" color="fg.muted">
            Want to visit one? Add it to a day from the Plan tab (&ldquo;Add a place or activity&rdquo;).
          </Text>
        </Stack>
      )}
    </Stack>
  );

  const aside = (
    <Stack spacing={4}>
      <Box>
        <Text as="h2" fontFamily="heading" fontWeight={600} fontSize="22px" lineHeight={1.25}>
          Meal slots in your plan
        </Text>
        <Text fontSize="12px" color="fg.muted" mt={1}>
          Assign a place to a slot &mdash; it appears on the timeline at the right time.
        </Text>
      </Box>
      {mealSlots.length === 0 ? (
        <RowCard dashed>
          <IconTile icon={LuUtensils} />
          <Text fontSize="13px" color="fg.muted">
            Generate the day plan first — meal breaks are added automatically.
          </Text>
        </RowCard>
      ) : (
        mealSlots.map((slot) => {
          const meal = mealOf(slot);
          const picked = Boolean(slot.stop.placeId);
          return (
            <RowCard key={slot.stop.id} dashed={!picked}>
              <IconTile icon={MEAL_ICONS[meal]} />
              <Flex direction="column" flex={1} minW={0}>
                <Text fontWeight={600}>{MEAL_LABELS[meal]}</Text>
                <Text fontSize="12px" color="fg.muted">
                  Day {slot.day.dayNumber} · {formatDayDate(slot.day.date, "EEE d")} · {slot.stop.arrivalTime}
                </Text>
              </Flex>
              {picked ? (
                <HStack spacing={1} minW={0}>
                  <Text fontWeight={600} fontSize="12px" noOfLines={1} textAlign="right">
                    {slot.stop.placeName}
                  </Text>
                  <Button size="sm" variant="ghost" onClick={() => setPickerTarget(slot)} aria-label={`Change ${slotName(slot)}`}>
                    Change
                  </Button>
                </HStack>
              ) : (
                <Button leftIcon={<FiPlus size={16} />} onClick={() => setPickerTarget(slot)} aria-label={`Pick a place for ${slotName(slot)}`} flexShrink={0}>
                  Pick
                </Button>
              )}
            </RowCard>
          );
        })
      )}
    </Stack>
  );

  return (
    <>
      <TabSplit main={main} aside={aside} mainWidth={760} stickyAside={false} />
      <MealPickerDrawer tripId={trip.id} target={pickerTarget} city={leg.baseCity} country={leg.country} onClose={() => setPickerTarget(null)} />
    </>
  );
}
