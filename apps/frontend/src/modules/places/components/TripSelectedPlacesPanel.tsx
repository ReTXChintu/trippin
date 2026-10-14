import { Box, Button, Flex, SimpleGrid, Stack, Text, useToast } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { FiCheckSquare, FiMapPin, FiTrash2, FiX } from "react-icons/fi";
import { EmptyState } from "@/components/ui";
import {
  useAddPlaceFromSearch,
  useBulkRemovePlacesFromTrip,
  useRemovePlaceFromTrip,
} from "@/modules/places/hooks/usePlaces";
import { getApiErrorMessage } from "@/lib/api";
import { PlaceSearchInput } from "@/modules/places/components/PlaceSearchInput";
import type { Place } from "@/modules/places/types/place.types";
import { PlaceTile } from "@/modules/trips/components/tabs/PlaceTile";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";

interface TripSelectedPlacesPanelProps {
  trip: Trip;
  leg: TripLeg;
  selectedPlaces: Place[];
  onSelectedChange: (places: Place[]) => void;
  /** Open the place detail modal (hours, photos, preferred times). */
  onOpenDetails?: (placeId: string) => void;
}

/** "My places" — what's picked for this city, with remove / bulk remove and search-to-add. */
export function TripSelectedPlacesPanel({ trip, leg, selectedPlaces, onSelectedChange, onOpenDetails }: TripSelectedPlacesPanelProps) {
  const toast = useToast();
  const [selectMode, setSelectMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const addFromSearch = useAddPlaceFromSearch(trip.id, leg.id);
  const removePlace = useRemovePlaceFromTrip(trip.id, leg.id);
  const bulkRemove = useBulkRemovePlacesFromTrip(trip.id, leg.id);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const aiMatchedIds = useMemo(() => new Set(leg.aiMatchedPlaceIds ?? []), [leg.aiMatchedPlaceIds]);

  const placeIds = useMemo(
    () => selectedPlaces.map((p) => p.googlePlaceId).filter((id): id is string => Boolean(id)),
    [selectedPlaces],
  );
  const allChecked = placeIds.length > 0 && placeIds.every((id) => checkedIds.has(id));

  const toggleChecked = (placeId: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(placeId);
      else next.delete(placeId);
      return next;
    });
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
      setSelectMode(false);
      onSelectedChange(result.places);
      toast({ title: `Removed ${toRemove.length} place(s) from trip`, status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Stack spacing="14px">
      <PlaceSearchInput
        label="Add a place"
        placeholder="Search Google Places to add…"
        mode="place"
        city={leg.baseCity || trip.destinationCity}
        country={leg.country || trip.destinationCountry}
        areas={leg.dayTripAreas}
        onSelect={handleAddFromSearch}
        hideLabel
      />

      {selectedPlaces.length === 0 ? (
        <Box bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl">
          <EmptyState icon={FiMapPin} title="No places picked yet" text="Add places from Discover, the map, or search above." compact />
        </Box>
      ) : (
        <>
          <Flex align="center" gap={2} fontSize="12px" color="fg.muted" flexWrap="wrap" minH="28px">
            <Text flex={1} minW="200px">
              Open a place to set preferred arrival and departure times. Turn on &ldquo;Plan by place best times&rdquo; in trip settings to ignore the fixed daily start.
            </Text>
            {selectMode ? (
              <Flex gap={1}>
                <Button size="xs" variant="ghost" onClick={() => setCheckedIds(allChecked ? new Set() : new Set(placeIds))}>
                  {allChecked ? "Clear" : `Select all ${placeIds.length}`}
                </Button>
                <Button size="xs" variant="danger" leftIcon={<FiTrash2 />} onClick={() => void handleBulkRemove()} isDisabled={checkedIds.size === 0} isLoading={bulkRemove.isPending}>
                  Remove selected ({checkedIds.size})
                </Button>
                <Button size="xs" variant="ghost" aria-label="Leave select mode" onClick={() => { setSelectMode(false); setCheckedIds(new Set()); }}>
                  <FiX />
                </Button>
              </Flex>
            ) : (
              <Button size="xs" variant="ghost" leftIcon={<FiCheckSquare />} onClick={() => setSelectMode(true)}>
                Select
              </Button>
            )}
          </Flex>
          <SimpleGrid columns={2} spacing={{ base: "10px", sm: "14px" }}>
            {selectedPlaces.map((place) => {
              const placeId = place.googlePlaceId;
              if (!placeId) return null;
              return (
                <PlaceTile
                  key={placeId}
                  trip={trip}
                  place={place}
                  inTrip
                  aiMatch={aiMatchedIds.has(placeId)}
                  busy={removingId === placeId}
                  onToggle={() => void handleRemove(placeId)}
                  onOpen={onOpenDetails ? () => onOpenDetails(placeId) : undefined}
                  selectable={selectMode}
                  checked={checkedIds.has(placeId)}
                  onCheck={(c) => toggleChecked(placeId, c)}
                />
              );
            })}
          </SimpleGrid>
        </>
      )}
    </Stack>
  );
}
