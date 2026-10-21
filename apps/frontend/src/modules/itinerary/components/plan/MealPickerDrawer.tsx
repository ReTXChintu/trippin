import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerOverlay,
  Flex,
  HStack,
  Icon,
  Image,
  Skeleton,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { LuClock, LuStar, LuUtensils, LuX } from "react-icons/lu";
import { getApiErrorMessage } from "@/lib/api";
import { useMealSuggestionsQuery, useUpdateMealSlot } from "@/modules/itinerary/hooks/useItinerary";
import type { MealSuggestion } from "@/modules/itinerary/api/itinerary.api";
import type { ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";
import { formatDayDate } from "@/modules/itinerary/utils/plan.utils";
import { PlaceSearchInput } from "@/modules/places/components/PlaceSearchInput";
import { Banner, PhotoFallback, Pill, Segmented } from "@/components/ui";
import { PanelHeader } from "@/components/ui/plan";

const MEAL_TITLES: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  tiffin: "Snacks",
  dinner: "Dinner",
};

interface MealPickerDrawerProps {
  tripId: string;
  target: { stop: ItineraryStop; day: ItineraryDay } | null;
  city?: string;
  country?: string;
  /** Which list to open on. */
  initialTab?: "nearby" | "saved";
  /** Drops the meal from this day (the "Skip lunch" link). */
  onSkip?: () => void;
  onClose: () => void;
}

function distance(s: MealSuggestion): string | null {
  if (s.distanceKm === undefined) return null;
  const d = s.distanceKm < 1 ? `${Math.round(s.distanceKm * 1000)} m` : `${s.distanceKm} km`;
  return s.walkMinutes !== undefined && s.walkMinutes <= 25 ? `${d} · ${s.walkMinutes} min walk` : d;
}

function SuggestionCard({
  suggestion,
  time,
  onChoose,
  isBusy,
}: {
  suggestion: MealSuggestion;
  time?: string;
  onChoose: () => void;
  isBusy: boolean;
}) {
  const s = suggestion;
  const dist = distance(s);
  return (
    <Flex gap={3} px="14px" py={3} bg="sf" borderWidth="1px" borderColor="ln" borderRadius="xl" align="center">
      {s.photoUrl ? (
        <Image
          src={s.photoUrl}
          alt=""
          boxSize="52px"
          objectFit="cover"
          borderRadius="10px"
          flexShrink={0}
          fallback={<PhotoFallback seed={s.name} icon={LuUtensils} w="52px" h="52px" borderRadius="10px" flexShrink={0} />}
        />
      ) : (
        <PhotoFallback seed={s.name} icon={LuUtensils} w="52px" h="52px" borderRadius="10px" flexShrink={0} aria-hidden />
      )}
      <Box flex={1} minW={0}>
        <Text fontWeight={600} noOfLines={1}>
          {s.name}
        </Text>
        <Text fontSize="12px" color="tx3">
          {s.cuisine ? `${s.cuisine} · ` : ""}
          {s.rating !== undefined && (
            <>
              <Icon as={LuStar} boxSize="11px" color="warn" verticalAlign="-1px" /> {s.rating.toFixed(1)}
              {s.userRatingCount ? ` (${s.userRatingCount.toLocaleString()})` : ""}
            </>
          )}
          {s.priceLevel ? ` · ${s.priceLevel}` : ""}
          {dist ? ` · ${dist}` : ""}
        </Text>
        {s.source === "saved" && (
          <Text fontSize="12px" color="ac" fontWeight={600}>
            On your list
          </Text>
        )}
      </Box>
      <Box flexShrink={0} display={{ base: "none", sm: "block" }}>
        {s.openAtMealTime === true ? (
          <Pill tone="success">Open at {time}</Pill>
        ) : s.openAtMealTime === false ? (
          <Pill tone="danger">Closed at {time}</Pill>
        ) : (
          <Pill>Hours unknown</Pill>
        )}
      </Box>
      <Button onClick={onChoose} isLoading={isBusy} flexShrink={0}>
        Choose
      </Button>
    </Flex>
  );
}

export function MealPickerDrawer({ tripId, target, city, country, initialTab = "nearby", onSkip, onClose }: MealPickerDrawerProps) {
  const toast = useToast();
  const updateMealSlot = useUpdateMealSlot(tripId);
  const [choosingId, setChoosingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"nearby" | "saved">(initialTab);

  const stop = target?.stop;
  const day = target?.day;
  const suggestions = useMealSuggestionsQuery(tripId, day?.dayNumber ?? 0, stop?.id ?? "", Boolean(target));
  const mealTitle = MEAL_TITLES[stop?.mealType ?? "lunch"];
  const all = suggestions.data?.suggestions ?? [];
  const saved = all.filter((s) => s.source === "saved");
  const nearby = all.filter((s) => s.source !== "saved");
  const shown = tab === "saved" ? saved : nearby;

  useEffect(() => {
    if (target) setTab(initialTab);
  }, [target, initialTab]);

  const choose = async (placeId: string) => {
    if (!target) return;
    setChoosingId(placeId);
    try {
      await updateMealSlot.mutateAsync({ dayNumber: target.day.dayNumber, stopId: target.stop.id, placeId });
      toast({ title: `${mealTitle} planned`, status: "success", duration: 2500 });
      onClose();
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    } finally {
      setChoosingId(null);
    }
  };

  const clear = async () => {
    if (!target) return;
    try {
      await updateMealSlot.mutateAsync({ dayNumber: target.day.dayNumber, stopId: target.stop.id, clearPlace: true });
      onClose();
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Drawer isOpen={Boolean(target)} onClose={onClose} placement="right" size="md">
      <DrawerOverlay />
      <DrawerContent maxW={{ base: "100vw", md: "520px" }} bg="sf">
        <PanelHeader
          title={`Pick ${mealTitle.toLowerCase()} · Day ${day?.dayNumber ?? ""}`}
          subtitle={day ? `${formatDayDate(day.date, "EEE d MMM")}${day.legName ? ` · ${day.legName}` : ""}` : undefined}
          onClose={onClose}
        />

        <DrawerBody px={6} py={5}>
          <Stack spacing={4}>
            {stop?.placeId && (
              <Flex px="14px" py={3} borderRadius="xl" bg="acSoft" color="ac" justify="space-between" align="center" gap={3}>
                <Box minW={0}>
                  <Text fontSize="12px">Currently planned</Text>
                  <Text fontWeight={600} noOfLines={1}>
                    {stop.placeName}
                  </Text>
                </Box>
                <Button size="sm" variant="danger" leftIcon={<LuX />} onClick={clear} isLoading={updateMealSlot.isPending && !choosingId}>
                  Remove
                </Button>
              </Flex>
            )}

            <Segmented
              value={tab}
              onChange={setTab}
              alignSelf="flex-start"
              options={[
                { value: "nearby", label: "Suggested nearby" },
                { value: "saved", label: `Saved · ${saved.length}` },
              ]}
            />

            {stop && (
              <HStack spacing={2} fontSize="12px" color="tx3">
                <Icon as={LuClock} boxSize="14px" />
                <Text>
                  Around <b>{stop.arrivalTime}</b>
                  {suggestions.data ? ` · ${suggestions.data.anchorLabel}, walking distance shown` : ""}
                </Text>
              </HStack>
            )}

            {suggestions.isLoading ? (
              <Stack spacing={3}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} h="78px" borderRadius="xl" startColor="sunk" endColor="ln" />
                ))}
              </Stack>
            ) : suggestions.isError ? (
              <Banner tone="warn">{getApiErrorMessage(suggestions.error)}</Banner>
            ) : shown.length === 0 ? (
              <Text fontSize="13px" color="tx3">
                {tab === "saved"
                  ? "No saved restaurants for this city yet — save some from the Food tab."
                  : `Nothing open nearby at ${stop?.arrivalTime}. Search below, or change the time from the stop's menu.`}
              </Text>
            ) : (
              <Stack spacing={3}>
                {shown.map((s) => (
                  <SuggestionCard
                    key={s.googlePlaceId}
                    suggestion={s}
                    time={stop?.arrivalTime}
                    onChoose={() => choose(s.googlePlaceId)}
                    isBusy={choosingId === s.googlePlaceId}
                  />
                ))}
              </Stack>
            )}

            <Box pt={2}>
              <PlaceSearchInput
                label="Know where you want to go?"
                placeholder="Search restaurants, cafés…"
                mode="place"
                city={city}
                country={country}
                onSelect={(selection) => choose(selection.googlePlaceId)}
              />
            </Box>
          </Stack>
        </DrawerBody>

        <DrawerFooter borderTopWidth="1px" borderColor="ln" px={6} py={4} justifyContent="space-between" gap={3} flexWrap="wrap">
          {onSkip ? (
            <Button variant="link" size="sm" color="ac" textDecoration="underline" onClick={onSkip}>
              Skip {mealTitle.toLowerCase()} on this day
            </Button>
          ) : (
            <span />
          )}
          <Text fontSize="12px" color="tx3">
            Saved restaurants can be assigned from the Food tab
          </Text>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
