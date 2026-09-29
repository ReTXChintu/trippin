import {
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  IconButton,
  SimpleGrid,
  Stack,
  Tag,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import {
  useAddPlaceFromSearch,
  useBulkRemovePlacesFromTrip,
  useRemovePlaceFromTrip,
} from "@/modules/places/hooks/usePlaces";
import { getApiErrorMessage } from "@/lib/api";
import { PlaceSearchInput } from "@/modules/places/components/PlaceSearchInput";
import type { Place } from "@/modules/places/types/place.types";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";

interface TripSelectedPlacesPanelProps {
  trip: Trip;
  leg: TripLeg;
  selectedPlaces: Place[];
  onSelectedChange: (places: Place[]) => void;
}

export function TripSelectedPlacesPanel({ trip, leg, selectedPlaces, onSelectedChange }: TripSelectedPlacesPanelProps) {
  const toast = useToast();
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const addFromSearch = useAddPlaceFromSearch(trip.id, leg.id);
  const removePlace = useRemovePlaceFromTrip(trip.id, leg.id);
  const bulkRemove = useBulkRemovePlacesFromTrip(trip.id, leg.id);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const borderColor = "border.line";

  const placeIds = useMemo(
    () => selectedPlaces.map((p) => p.googlePlaceId).filter((id): id is string => Boolean(id)),
    [selectedPlaces],
  );

  const allChecked = placeIds.length > 0 && placeIds.every((id) => checkedIds.has(id));
  const someChecked = placeIds.some((id) => checkedIds.has(id));

  const toggleChecked = (placeId: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(placeId);
      else next.delete(placeId);
      return next;
    });
  };

  const toggleAll = () => {
    setCheckedIds(allChecked ? new Set() : new Set(placeIds));
  };

  const handleAddFromSearch = async (selection: { googlePlaceId: string; name: string }) => {
    try {
      const result = await addFromSearch.mutateAsync(selection.googlePlaceId);
      onSelectedChange(result.places);
      toast({ title: `"${selection.name}" added to trip`, status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const handleRemove = async (placeId: string) => {
    setRemovingId(placeId);
    try {
      const result = await removePlace.mutateAsync(placeId);
      setCheckedIds((prev) => {
        const next = new Set(prev);
        next.delete(placeId);
        return next;
      });
      onSelectedChange(result.places);
      toast({ title: "Place removed", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    } finally {
      setRemovingId(null);
    }
  };

  const handleBulkRemove = async () => {
    const toRemove = [...checkedIds];
    if (toRemove.length === 0) return;

    try {
      const result = await bulkRemove.mutateAsync(toRemove);
      setCheckedIds(new Set());
      onSelectedChange(result.places);
      toast({ title: `Removed ${toRemove.length} place(s) from trip`, status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={2}>
        <Text fontSize="xs" color="fg.muted">
          Set preferred arrival & departure times per place. Enable &quot;Plan by place best times&quot; in trip
          settings to ignore fixed daily start.
        </Text>
        {checkedIds.size > 0 && (
          <Button
            size="sm"
            colorScheme="red"
            variant="outline"
            leftIcon={<FiTrash2 />}
            onClick={handleBulkRemove}
            isLoading={bulkRemove.isPending}
          >
            Remove selected ({checkedIds.size})
          </Button>
        )}
      </Flex>

      <Box mb={4}>
        <PlaceSearchInput
          label="Add a place"
          placeholder="Search Google Places..."
          mode="place"
          city={leg.baseCity || trip.destinationCity}
          country={leg.country || trip.destinationCountry}
          onSelect={handleAddFromSearch}
        />
      </Box>

      {selectedPlaces.length === 0 ? (
        <Text color="fg.muted" fontSize="sm">
          No places selected yet. Discover places above or search to add attractions manually.
        </Text>
      ) : (
        <Stack spacing={3}>
          <Checkbox size="sm" isChecked={allChecked} isIndeterminate={!allChecked && someChecked} onChange={toggleAll}>
            Select all ({placeIds.length})
          </Checkbox>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {selectedPlaces.map((place) => {
              const placeId = place.googlePlaceId;
              if (!placeId) return null;

              return (
                <Flex
                  key={placeId}
                  p={3}
                  borderWidth="1px"
                  borderColor={checkedIds.has(placeId) ? "red.300" : borderColor}
                  borderRadius="lg"
                  align="start"
                  gap={2}
                >
                  <Checkbox
                    mt={0.5}
                    isChecked={checkedIds.has(placeId)}
                    onChange={(e) => toggleChecked(placeId, e.target.checked)}
                    aria-label={`Select ${place.name}`}
                  />
                  <Box flex={1} minW={0}>
                    <Text fontWeight="medium" fontSize="sm">
                      {place.name}
                    </Text>
                    <HStack spacing={2} mt={1}>
                      <Tag size="sm">{place.category}</Tag>
                      {place.rating !== undefined && (
                        <Text fontSize="xs" color="fg.muted">
                          {place.rating.toFixed(1)} ★
                        </Text>
                      )}
                    </HStack>
                  </Box>
                  <IconButton
                    aria-label="Remove place"
                    icon={<FiTrash2 />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    isLoading={removingId === placeId}
                    onClick={() => handleRemove(placeId)}
                  />
                </Flex>
              );
            })}
          </SimpleGrid>
        </Stack>
      )}
    </Box>
  );
}
