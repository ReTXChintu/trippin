import { Box, Button, Flex, Icon, SimpleGrid, Stack, Text, useToast } from "@chakra-ui/react";
import { type ReactNode, useMemo, useState } from "react";
import { FiCheckSquare, FiPlus, FiSearch, FiX } from "react-icons/fi";
import { LuSparkles } from "react-icons/lu";
import { ChoiceChip, EmptyState } from "@/components/ui";
import {
  useAddPlaceFromSearch,
  useAddPlaceToTrip,
  useBulkAddPlacesToTrip,
  useRemovePlaceFromTrip,
} from "@/modules/places/hooks/usePlaces";
import { getApiErrorMessage } from "@/lib/api";
import { PlaceDetailModal } from "@/modules/places/components/PlaceDetailModal";
import { PlaceFilterBar } from "@/modules/places/components/PlaceFilterBar";
import { PlaceSearchInput } from "@/modules/places/components/PlaceSearchInput";
import type { Place } from "@/modules/places/types/place.types";
import {
  DEFAULT_PLACE_FILTERS,
  filterAndSortPlaces,
  getUniqueCategories,
  type PlaceFilterState,
} from "@/modules/places/utils/place-filter.utils";
import { PlaceTile } from "@/modules/trips/components/tabs/PlaceTile";
import { DEFAULT_QUICK_FILTERS, isOpenNow, type PlaceQuickFilters } from "@/modules/trips/components/tabs/placeMeta";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";

interface DiscoveryPlacesPanelProps {
  trip: Trip;
  leg: TripLeg;
  poolPlaces: Place[];
  selectedPlaceIds: Set<string>;
  onSelectedChange: (ids: string[]) => void;
  /** Shown in the empty state (e.g. the "Find places" button). */
  emptyAction?: ReactNode;
}

export function DiscoveryPlacesPanel({
  trip,
  leg,
  poolPlaces,
  selectedPlaceIds,
  onSelectedChange,
  emptyAction,
}: DiscoveryPlacesPanelProps) {
  const toast = useToast();
  const [filters, setFilters] = useState<PlaceFilterState>(DEFAULT_PLACE_FILTERS);
  const [quick, setQuick] = useState<PlaceQuickFilters>(DEFAULT_QUICK_FILTERS);
  const [modalPlaceId, setModalPlaceId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [showAiSearch, setShowAiSearch] = useState(false);
  const [searchPrefill, setSearchPrefill] = useState<string | null>(null);
  const addPlace = useAddPlaceToTrip(trip.id, leg.id);
  const removePlace = useRemovePlaceFromTrip(trip.id, leg.id);
  const bulkAddPlaces = useBulkAddPlacesToTrip(trip.id, leg.id);
  const addFromSearch = useAddPlaceFromSearch(trip.id, leg.id);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const legPoolIds = useMemo(() => new Set(leg.discoveryPoolIds), [leg.discoveryPoolIds]);
  const aiMatchedIds = useMemo(() => new Set(leg.aiMatchedPlaceIds ?? []), [leg.aiMatchedPlaceIds]);

  const scopedPoolPlaces = useMemo(() => {
    if (legPoolIds.size === 0) return poolPlaces;
    return poolPlaces.filter((p) => p.googlePlaceId && legPoolIds.has(p.googlePlaceId));
  }, [poolPlaces, legPoolIds]);

  const categories = useMemo(() => getUniqueCategories(scopedPoolPlaces), [scopedPoolPlaces]);

  const filteredPlaces = useMemo(() => {
    const base = filterAndSortPlaces(scopedPoolPlaces, filters, leg.hotelCoordinates ?? trip.hotelCoordinates);
    return base.filter((p) => {
      const id = p.googlePlaceId ?? "";
      if (quick.aiMatches && !aiMatchedIds.has(id)) return false;
      if (quick.voted && !(trip.placeVotes?.[id]?.length ?? 0)) return false;
      if (quick.openNow && isOpenNow(p) !== true) return false;
      return true;
    });
  }, [scopedPoolPlaces, filters, quick, aiMatchedIds, trip.placeVotes, leg.hotelCoordinates, trip.hotelCoordinates]);

  const filteredIds = useMemo(
    () => filteredPlaces.map((p) => p.googlePlaceId).filter((id): id is string => Boolean(id)),
    [filteredPlaces],
  );

  const allVisibleChecked = filteredIds.length > 0 && filteredIds.every((id) => checkedIds.has(id));
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
    setCheckedIds((prev) => {
      const next = new Set(prev);
      filteredIds.forEach((id) => (allVisibleChecked ? next.delete(id) : next.add(id)));
      return next;
    });
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
      setSelectMode(false);
      toast({ title: `Added ${toAdd.length} place(s) to trip`, status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const handleAddFromSearch = async (selection: { googlePlaceId: string; name: string }) => {
    try {
      const result = await addFromSearch.mutateAsync(selection.googlePlaceId);
      syncFromPlaces(result.places);
      setSearchPrefill(null);
      toast({ title: `"${selection.name}" added to trip`, status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const aiSuggestedNames = (leg.aiSuggestedPlaceNames ?? []).filter(
    (name) => !scopedPoolPlaces.some((p) => p.name.toLowerCase() === name.toLowerCase()),
  );
  const cityName = leg.name || leg.baseCity;

  const resultActions =
    filteredPlaces.length > 0 ? (
      selectMode ? (
        <>
          <Button size="xs" variant="ghost" onClick={toggleAllVisible}>
            {allVisibleChecked ? "Clear" : `Select all ${filteredIds.length}`}
          </Button>
          <Button size="xs" leftIcon={<FiPlus />} onClick={() => void handleBulkAdd([...checkedIds])} isDisabled={checkedIds.size === 0} isLoading={bulkAddPlaces.isPending}>
            Add selected ({selectedToAddCount})
          </Button>
          <Button size="xs" variant="ghost" aria-label="Leave select mode" onClick={() => { setSelectMode(false); setCheckedIds(new Set()); }}>
            <FiX />
          </Button>
        </>
      ) : (
        <>
          <Button size="xs" variant="ghost" leftIcon={<FiCheckSquare />} onClick={() => setSelectMode(true)}>
            Select
          </Button>
          <Button size="xs" variant="ghost" leftIcon={<FiPlus />} onClick={() => void handleBulkAdd(filteredIds)} isLoading={bulkAddPlaces.isPending}>
            Add all visible
          </Button>
        </>
      )
    ) : null;

  return (
    <Stack spacing="14px">
      {scopedPoolPlaces.length === 0 ? (
        <Box bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl">
          <EmptyState
            icon={FiSearch}
            title={`Find the best of ${cityName}`}
            text={`We'll search ${leg.baseCity}${leg.dayTripAreas.length ? `, ${leg.dayTripAreas.join(", ")}` : ""} for sights that match your interests.`}
            action={emptyAction}
          />
        </Box>
      ) : (
        <PlaceFilterBar
          categories={categories}
          filters={filters}
          onChange={setFilters}
          resultCount={filteredPlaces.length}
          totalCount={scopedPoolPlaces.length}
          quick={quick}
          onQuickChange={setQuick}
          showAiMatches={aiMatchedIds.size > 0}
          actions={resultActions}
        />
      )}

      {aiSuggestedNames.length > 0 && (
        <Box bg="accent.soft" color="accent.text" borderRadius="xl" px="14px" py="10px">
          <Flex align="center" gap="10px">
            <Icon as={LuSparkles} boxSize="16px" flexShrink={0} />
            <Text fontSize="12px" flex={1} minW={0}>
              <b>
                {aiSuggestedNames.length} AI-suggested place{aiSuggestedNames.length === 1 ? "" : "s"} weren&rsquo;t found
              </b>{" "}
              on the map. Search {aiSuggestedNames.length === 1 ? "it" : "them"} manually.
            </Text>
            <Button variant="outline" leftIcon={<FiSearch size={16} />} onClick={() => setShowAiSearch((v) => !v)} aria-expanded={showAiSearch}>
              Search
            </Button>
          </Flex>
          {showAiSearch && (
            <Stack spacing={3} mt={3}>
              <Flex gap="6px" flexWrap="wrap">
                {aiSuggestedNames.map((name) => (
                  <ChoiceChip key={name} selected={searchPrefill === name} onClick={() => setSearchPrefill(name)}>
                    {name}
                  </ChoiceChip>
                ))}
              </Flex>
              {searchPrefill && (
                <PlaceSearchInput
                  label={`Search for "${searchPrefill}"`}
                  placeholder="Search Google Places…"
                  mode="place"
                  city={leg.baseCity}
                  country={leg.country}
                  value={searchPrefill}
                  onSelect={handleAddFromSearch}
                  onClear={() => setSearchPrefill(null)}
                  hideLabel
                />
              )}
            </Stack>
          )}
        </Box>
      )}

      {scopedPoolPlaces.length > 0 &&
        (filteredPlaces.length === 0 ? (
          <Text color="fg.muted" fontSize="13px" py={4}>
            No places match these filters.
          </Text>
        ) : (
          <SimpleGrid columns={2} spacing={{ base: "10px", sm: "14px" }}>
            {filteredPlaces.map((place) => {
              const id = place.googlePlaceId!;
              const inTrip = selectedPlaceIds.has(id);
              return (
                <PlaceTile
                  key={id}
                  trip={trip}
                  place={place}
                  inTrip={inTrip}
                  aiMatch={aiMatchedIds.has(id)}
                  busy={updatingId === id}
                  onToggle={() => void handleToggleTrip(id, inTrip)}
                  onOpen={() => setModalPlaceId(id)}
                  selectable={selectMode}
                  checked={checkedIds.has(id)}
                  onCheck={(c) => toggleChecked(id, c)}
                />
              );
            })}
          </SimpleGrid>
        ))}

      <Box borderWidth="1px" borderStyle="dashed" borderColor="border.line" borderRadius="xl" p="14px">
        <Text fontSize="13px" fontWeight={600} mb={2}>
          Not seeing a place?
        </Text>
        <PlaceSearchInput
          label="Search Google Places to add"
          placeholder={`Search places in ${cityName}…`}
          mode="place"
          city={leg.baseCity}
          country={leg.country}
          onSelect={handleAddFromSearch}
          hideLabel
        />
        {leg.dayTripAreas.length > 0 && (
          <Text fontSize="12px" color="fg.muted" mt={2}>
            Suggestions cover {leg.baseCity} + {leg.dayTripAreas.join(", ")}.
          </Text>
        )}
      </Box>

      <PlaceDetailModal
        isOpen={Boolean(modalPlaceId)}
        onClose={() => setModalPlaceId(null)}
        trip={trip}
        legId={leg.id}
        placeId={modalPlaceId}
        isSelected={modalPlaceId ? selectedPlaceIds.has(modalPlaceId) : false}
        onSelectedChange={onSelectedChange}
      />
    </Stack>
  );
}
