import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  Icon,
  Image,
  Skeleton,
  Stack,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { FiMapPin, FiStar, FiX } from "react-icons/fi";
import { MdRestaurant } from "react-icons/md";
import { getApiErrorMessage } from "@/lib/api";
import { useMealSuggestionsQuery, useUpdateMealSlot } from "@/modules/itinerary/hooks/useItinerary";
import type { MealSuggestion } from "@/modules/itinerary/api/itinerary.api";
import type { ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";
import { formatDayDate } from "@/modules/itinerary/utils/plan.utils";
import { PlaceSearchInput } from "@/modules/places/components/PlaceSearchInput";

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
  onClose: () => void;
}

function SuggestionCard({
  suggestion,
  onChoose,
  isBusy,
}: {
  suggestion: MealSuggestion;
  onChoose: () => void;
  isBusy: boolean;
}) {
  const border = useColorModeValue("gray.200", "gray.700");
  const muted = useColorModeValue("gray.500", "gray.400");
  const placeholderBg = useColorModeValue("orange.50", "whiteAlpha.100");

  return (
    <Flex gap={3} p={3} borderWidth="1px" borderColor={border} borderRadius="lg" align="center">
      {suggestion.photoUrl ? (
        <Image
          src={suggestion.photoUrl}
          alt=""
          boxSize="64px"
          objectFit="cover"
          borderRadius="md"
          flexShrink={0}
          fallback={<Box boxSize="64px" borderRadius="md" bg={placeholderBg} flexShrink={0} />}
        />
      ) : (
        <Flex boxSize="64px" borderRadius="md" bg={placeholderBg} align="center" justify="center" flexShrink={0}>
          <Icon as={MdRestaurant} color="orange.400" boxSize={6} />
        </Flex>
      )}
      <Box flex={1} minW={0}>
        <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
          {suggestion.name}
        </Text>
        <HStack spacing={1.5} fontSize="xs" color={muted} flexWrap="wrap">
          {suggestion.rating !== undefined && (
            <HStack spacing={0.5}>
              <Icon as={FiStar} color="yellow.500" />
              <Text>
                {suggestion.rating.toFixed(1)}
                {suggestion.userRatingCount ? ` (${suggestion.userRatingCount.toLocaleString()})` : ""}
              </Text>
            </HStack>
          )}
          {suggestion.cuisine && <Text>· {suggestion.cuisine}</Text>}
          {suggestion.priceLevel && <Text>· {suggestion.priceLevel}</Text>}
        </HStack>
        <HStack spacing={2} mt={1} fontSize="xs" flexWrap="wrap">
          {suggestion.walkMinutes !== undefined && (
            <HStack spacing={1} color={muted}>
              <Icon as={FiMapPin} boxSize={3} />
              <Text>
                {suggestion.walkMinutes <= 25
                  ? `${suggestion.walkMinutes} min walk`
                  : `${suggestion.distanceKm} km away`}
              </Text>
            </HStack>
          )}
          {suggestion.openAtMealTime ? (
            <Badge colorScheme="green" variant="subtle" fontSize="2xs">
              Open then
            </Badge>
          ) : (
            <Badge variant="subtle" fontSize="2xs">
              Hours unknown
            </Badge>
          )}
          {suggestion.source === "saved" && (
            <Badge colorScheme="brand" variant="subtle" fontSize="2xs">
              On your list
            </Badge>
          )}
        </HStack>
      </Box>
      <Button size="sm" colorScheme="brand" variant="outline" onClick={onChoose} isLoading={isBusy} flexShrink={0}>
        Choose
      </Button>
    </Flex>
  );
}

export function MealPickerDrawer({ tripId, target, city, country, onClose }: MealPickerDrawerProps) {
  const toast = useToast();
  const updateMealSlot = useUpdateMealSlot(tripId);
  const [choosingId, setChoosingId] = useState<string | null>(null);
  const muted = useColorModeValue("gray.500", "gray.400");

  const stop = target?.stop;
  const day = target?.day;
  const suggestions = useMealSuggestionsQuery(tripId, day?.dayNumber ?? 0, stop?.id ?? "", Boolean(target));
  const mealTitle = MEAL_TITLES[stop?.mealType ?? "lunch"];

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
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          {mealTitle} · {stop?.arrivalTime}
          <Text fontSize="sm" fontWeight="normal" color={muted}>
            {day && formatDayDate(day.date, "EEEE, d MMM")}
            {suggestions.data ? ` · places ${suggestions.data.anchorLabel}, open then` : ""}
          </Text>
        </DrawerHeader>

        <DrawerBody py={5}>
          <Stack spacing={5}>
            {stop?.placeId && (
              <Flex p={3} borderRadius="lg" bg="orange.50" _dark={{ bg: "whiteAlpha.100" }} justify="space-between" align="center">
                <Box>
                  <Text fontSize="xs" color={muted}>
                    Currently planned
                  </Text>
                  <Text fontWeight="semibold" fontSize="sm">
                    {stop.placeName}
                  </Text>
                </Box>
                <Button size="xs" variant="ghost" colorScheme="red" leftIcon={<FiX />} onClick={clear} isLoading={updateMealSlot.isPending && !choosingId}>
                  Remove
                </Button>
              </Flex>
            )}

            <PlaceSearchInput
              label="Know where you want to go?"
              placeholder="Search restaurants, cafés…"
              mode="place"
              city={city}
              country={country}
              onSelect={(selection) => choose(selection.googlePlaceId)}
            />

            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={3}>
                Suggestions nearby
              </Text>
              {suggestions.isLoading ? (
                <Stack spacing={3}>
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} h="90px" borderRadius="lg" />
                  ))}
                </Stack>
              ) : suggestions.isError ? (
                <Alert status="warning" borderRadius="md" fontSize="sm">
                  <AlertIcon />
                  {getApiErrorMessage(suggestions.error)}
                </Alert>
              ) : (suggestions.data?.suggestions.length ?? 0) === 0 ? (
                <Text fontSize="sm" color={muted}>
                  Nothing open nearby at {stop?.arrivalTime}. Try searching above, or change the time via the stop's
                  menu.
                </Text>
              ) : (
                <Stack spacing={3}>
                  {suggestions.data!.suggestions.map((s) => (
                    <SuggestionCard
                      key={s.googlePlaceId}
                      suggestion={s}
                      onChoose={() => choose(s.googlePlaceId)}
                      isBusy={choosingId === s.googlePlaceId}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </DrawerBody>

        <DrawerFooter borderTopWidth="1px">
          <Text fontSize="xs" color={muted} mr="auto">
            Ranked by rating, reviews and distance.
          </Text>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
