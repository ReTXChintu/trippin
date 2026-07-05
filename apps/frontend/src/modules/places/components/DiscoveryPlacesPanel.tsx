import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  SimpleGrid,
  Stack,
  Tag,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";
import {
  useAddPlaceToTrip,
  useBulkAddPlacesToTrip,
  useRemovePlaceFromTrip,
} from "@/modules/places/hooks/usePlaces";
import { getApiErrorMessage } from "@/lib/api";
import { PlaceDetailModal } from "@/modules/places/components/PlaceDetailModal";
import { PlaceFilterBar } from "@/modules/places/components/PlaceFilterBar";
import type { Place } from "@/modules/places/types/place.types";
import {
  DEFAULT_PLACE_FILTERS,
  filterAndSortPlaces,
  getUniqueCategories,
  type PlaceFilterState,
} from "@/modules/places/utils/place-filter.utils";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";

interface DiscoveryPlacesPanelProps {
  trip: Trip;
  poolPlaces: Place[];
  selectedPlaceIds: Set<string>;
  onSelectedChange: (ids: string[]) => void;
  leg?: TripLeg;
}

export function DiscoveryPlacesPanel({
  trip,
  poolPlaces,
  selectedPlaceIds,
  onSelectedChange,
  leg,
}: DiscoveryPlacesPanelProps) {
  const toast = useToast();
  const [filters, setFilters] = useState<PlaceFilterState>(DEFAULT_PLACE_FILTERS);
  const [modalPlaceId, setModalPlaceId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const addPlace = useAddPlaceToTrip(trip.id);
  const removePlace = useRemovePlaceFromTrip(trip.id);
  const bulkAddPlaces = useBulkAddPlacesToTrip(trip.id);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const selectedBg = useColorModeValue("brand.50", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.700");

  const legPoolIds = useMemo(() => new Set(leg?.discoveryPoolIds ?? []), [leg?.discoveryPoolIds]);

  const scopedPoolPlaces = useMemo(() => {
    if (!leg) return poolPlaces;
    if (legPoolIds.size === 0) return poolPlaces;
    return poolPlaces.filter((p) => p.googlePlaceId && legPoolIds.has(p.googlePlaceId));
  }, [poolPlaces, leg, legPoolIds]);

  const categories = useMemo(() => getUniqueCategories(scopedPoolPlaces), [scopedPoolPlaces]);

  const filteredPlaces = useMemo(
    () => filterAndSortPlaces(scopedPoolPlaces, filters, leg?.hotelCoordinates ?? trip.hotelCoordinates),
    [scopedPoolPlaces, filters, leg?.hotelCoordinates, trip.hotelCoordinates],
  );

  const filteredIds = useMemo(
    () => filteredPlaces.map((p) => p.googlePlaceId).filter((id): id is string => Boolean(id)),
    [filteredPlaces],
  );

  const allVisibleChecked = filteredIds.length > 0 && filteredIds.every((id) => checkedIds.has(id));
  const someVisibleChecked = filteredIds.some((id) => checkedIds.has(id));

  const selectedToAddCount = [...checkedIds].filter((id) => !selectedPlaceIds.has(id)).length;

  const toggleChecked = (placeId: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(placeId);
      else next.delete(placeId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    if (allVisibleChecked) {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const syncFromPlaces = (places: Place[]) => {
    onSelectedChange(places.map((p) => p.googlePlaceId!).filter(Boolean));
  };

  const handleToggleTrip = async (placeId: string, inTrip: boolean) => {
    setUpdatingId(placeId);
    try {
      const result = inTrip ? await removePlace.mutateAsync(placeId) : await addPlace.mutateAsync(placeId);
      syncFromPlaces(result.places);
      toast({ title: inTrip ? "Removed from trip" : "Added to trip", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBulkAdd = async (placeIds: string[]) => {
    const toAdd = placeIds.filter((id) => !selectedPlaceIds.has(id));

    if (toAdd.length === 0) {
      toast({ title: "Selected places are already in your trip", status: "info" });
      return;
    }

    try {
      const result = await bulkAddPlaces.mutateAsync(toAdd);
      syncFromPlaces(result.places);
      setCheckedIds(new Set());
      toast({ title: `Added ${toAdd.length} place(s) to trip`, status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const handleBulkAddVisible = () => {
    handleBulkAdd(filteredIds);
  };

  const handleBulkAddSelected = () => {
    handleBulkAdd([...checkedIds]);
  };

  return (
    <Box p={5} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
      <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={2}>
        <Box>
          <Text fontWeight="semibold" fontSize="sm">
            {leg
              ? `Discovery — ${leg.name || leg.baseCity} (${scopedPoolPlaces.length})`
              : `Discovery results (${poolPlaces.length})`}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {leg?.dayTripAreas.length
              ? `Covers ${leg.baseCity} + ${leg.dayTripAreas.join(", ")}`
              : "Click a place for photos, hours, and Google Maps reviews"}
          </Text>
        </Box>
        {filteredPlaces.length > 0 && (
          <HStack spacing={2} flexWrap="wrap">
            {checkedIds.size > 0 && (
              <Button
                size="sm"
                colorScheme="brand"
                leftIcon={<FiPlus />}
                onClick={handleBulkAddSelected}
                isLoading={bulkAddPlaces.isPending}
              >
                Add selected ({selectedToAddCount})
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              leftIcon={<FiPlus />}
              onClick={handleBulkAddVisible}
              isLoading={bulkAddPlaces.isPending}
            >
              Add all visible
            </Button>
          </HStack>
        )}
      </Flex>

      {scopedPoolPlaces.length === 0 ? (
        <Text color="gray.500" fontSize="sm">
          {leg
            ? `Click "Discover places" to search ${leg.baseCity}${leg.dayTripAreas.length ? `, ${leg.dayTripAreas.join(", ")}` : ""}.`
            : 'Click "Discover Places" to search attractions via Google Places.'}
        </Text>
      ) : (
        <Stack spacing={4}>
          <PlaceFilterBar
            categories={categories}
            filters={filters}
            onChange={setFilters}
            resultCount={filteredPlaces.length}
            totalCount={scopedPoolPlaces.length}
          />

          {filteredPlaces.length === 0 ? (
            <Text color="gray.500" fontSize="sm">
              No places match your filters.
            </Text>
          ) : (
            <>
              <Checkbox
                size="sm"
                isChecked={allVisibleChecked}
                isIndeterminate={!allVisibleChecked && someVisibleChecked}
                onChange={toggleAllVisible}
              >
                Select all visible ({filteredIds.length})
              </Checkbox>

              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3} maxH="520px" overflowY="auto">
                {filteredPlaces.map((place) => {
                  const id = place.googlePlaceId!;
                  const inTrip = selectedPlaceIds.has(id);
                  const isChecked = checkedIds.has(id);

                  return (
                    <Box
                      key={id}
                      p={3}
                      borderWidth="1px"
                      borderColor={inTrip ? "brand.300" : borderColor}
                      bg={inTrip ? selectedBg : undefined}
                      borderRadius="lg"
                      transition="background 0.15s"
                      _hover={{ bg: inTrip ? selectedBg : hoverBg }}
                    >
                      <Flex align="start" gap={2}>
                        <Checkbox
                          mt={0.5}
                          isChecked={isChecked}
                          onChange={(e) => toggleChecked(id, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${place.name}`}
                        />
                        <Box flex={1} minW={0} cursor="pointer" onClick={() => setModalPlaceId(id)}>
                          <Flex justify="space-between" align="start" gap={2}>
                            <Text fontWeight="medium" fontSize="sm" noOfLines={2}>
                              {place.name}
                            </Text>
                            {inTrip && (
                              <Badge colorScheme="brand" fontSize="2xs" flexShrink={0}>
                                In trip
                              </Badge>
                            )}
                          </Flex>
                          <HStack spacing={2} mt={1} flexWrap="wrap">
                            <Tag size="sm">{place.category}</Tag>
                            {place.rating !== undefined && (
                              <Text fontSize="xs" color="gray.500">
                                {place.rating.toFixed(1)} ★
                              </Text>
                            )}
                          </HStack>
                          {place.formattedAddress && (
                            <Text fontSize="xs" color="gray.500" mt={1} noOfLines={1}>
                              {place.formattedAddress}
                            </Text>
                          )}
                        </Box>
                      </Flex>

                      <Button
                        mt={3}
                        size="xs"
                        w="full"
                        variant={inTrip ? "outline" : "solid"}
                        colorScheme={inTrip ? "red" : "brand"}
                        leftIcon={inTrip ? <FiMinus /> : <FiPlus />}
                        isLoading={updatingId === id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTrip(id, inTrip);
                        }}
                      >
                        {inTrip ? "Remove from trip" : "Add to trip"}
                      </Button>
                    </Box>
                  );
                })}
              </SimpleGrid>
            </>
          )}
        </Stack>
      )}

      <PlaceDetailModal
        isOpen={Boolean(modalPlaceId)}
        onClose={() => setModalPlaceId(null)}
        trip={trip}
        placeId={modalPlaceId}
        isSelected={modalPlaceId ? selectedPlaceIds.has(modalPlaceId) : false}
        onSelectedChange={onSelectedChange}
      />
    </Box>
  );
}
