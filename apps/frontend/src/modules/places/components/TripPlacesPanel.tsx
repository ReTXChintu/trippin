import { Box, Button, Flex, Stack, Tooltip, useBreakpointValue, useToast } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { FiArrowRight, FiCompass, FiRefreshCw } from "react-icons/fi";
import { Segmented } from "@/components/ui";
import { CityChips, TabSplit } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/api";
import { DiscoveryPlacesPanel } from "@/modules/places/components/DiscoveryPlacesPanel";
import { TripSelectedPlacesPanel } from "@/modules/places/components/TripSelectedPlacesPanel";
import {
  useAddPlaceToTrip,
  useDiscoverPlaces,
  useRemovePlaceFromTrip,
  useTripPlacesQuery,
} from "@/modules/places/hooks/usePlaces";
import { PlacesMapView } from "@/modules/places/components/PlacesMapView";
import { PlaceDetailModal } from "@/modules/places/components/PlaceDetailModal";
import type { Place } from "@/modules/places/types/place.types";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";

interface TripPlacesPanelProps {
  trip: Trip;
  leg: TripLeg;
  /** Jump to the day plan once places are picked. */
  onPlanDays?: () => void;
  /** Switch city from the chips beside Discover / My places (hidden when omitted or single-city). */
  onCityChange?: (legId: string) => void;
}

type PlacesMode = "discover" | "mine" | "map";

export function TripPlacesPanel({ trip, leg, onPlanDays, onCityChange }: TripPlacesPanelProps) {
  const toast = useToast();
  const isWide = useBreakpointValue({ base: false, lg: true }, { ssr: false }) ?? true;
  const [mode, setMode] = useState<PlacesMode>("discover");

  const poolQuery = useTripPlacesQuery(trip.id, "pool");
  const selectedQuery = useTripPlacesQuery(trip.id, "selected", leg.id);
  const discoverPlaces = useDiscoverPlaces(trip.id);
  const addPlace = useAddPlaceToTrip(trip.id, leg.id);
  const removePlace = useRemovePlaceFromTrip(trip.id, leg.id);
  const [busyPlaceId, setBusyPlaceId] = useState<string | null>(null);
  const [detailsPlaceId, setDetailsPlaceId] = useState<string | null>(null);

  const [localSelected, setLocalSelected] = useState<Place[] | null>(null);

  useEffect(() => {
    setLocalSelected(null);
  }, [leg.id]);

  useEffect(() => {
    if (isWide && mode === "map") setMode("discover");
  }, [isWide, mode]);

  const poolPlaces = useMemo(() => poolQuery.data?.places ?? [], [poolQuery.data]);
  const selectedPlaces = useMemo(() => localSelected ?? selectedQuery.data?.places ?? [], [localSelected, selectedQuery.data]);
  const selectedPlaceIds = useMemo(
    () => new Set(selectedPlaces.map((p) => p.googlePlaceId).filter((id): id is string => Boolean(id))),
    [selectedPlaces],
  );

  const hasDiscoveryPool = leg.discoveryPoolIds.length > 0;
  const legs = getEffectiveLegs(trip);

  const syncSelectedFromIds = (ids: string[]) => {
    const catalog = new Map<string, Place>();
    for (const p of [...poolPlaces, ...selectedPlaces]) {
      if (p.googlePlaceId) catalog.set(p.googlePlaceId, p);
    }
    setLocalSelected(ids.map((id) => catalog.get(id)).filter((p): p is Place => Boolean(p)));
  };

  const handleDiscover = async () => {
    try {
      await discoverPlaces.mutateAsync({ forceRefresh: hasDiscoveryPool, legId: leg.id });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const mapPlaces = [
    ...poolPlaces.filter((p) => p.googlePlaceId && leg.discoveryPoolIds.includes(p.googlePlaceId)),
    ...selectedPlaces.filter((p) => p.googlePlaceId && !leg.discoveryPoolIds.includes(p.googlePlaceId)),
  ];

  const map = (
    <PlacesMapView
      tripId={trip.id}
      leg={leg}
      places={mapPlaces}
      selectedIds={selectedPlaceIds}
      busyPlaceId={busyPlaceId}
      onOpenDetails={setDetailsPlaceId}
      height={isWide ? undefined : "calc(100vh - 220px)"}
      onToggle={async (place, selected) => {
        setBusyPlaceId(place.googlePlaceId!);
        try {
          const result = selected ? await removePlace.mutateAsync(place.googlePlaceId!) : await addPlace.mutateAsync(place.googlePlaceId!);
          setLocalSelected(result.places);
        } catch (err) {
          toast({ title: getApiErrorMessage(err), status: "error" });
        } finally {
          setBusyPlaceId(null);
        }
      }}
    />
  );

  const discoverButton = (
    <Button leftIcon={<FiCompass />} onClick={() => void handleDiscover()} isLoading={discoverPlaces.isPending} loadingText="Discovering…">
      Find places
    </Button>
  );

  const main = (
    <Stack spacing="14px">
      <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
        <Flex align="center" gap={2}>
          <Segmented<PlacesMode>
            value={mode}
            onChange={setMode}
            aria-label="Places view"
            options={[
              { value: "discover", label: "Discover" },
              { value: "mine", label: `My places · ${selectedPlaces.length}` },
              ...(isWide ? [] : [{ value: "map" as const, label: "Map" }]),
            ]}
          />
          {hasDiscoveryPool && mode === "discover" && (
            <Tooltip label="Refresh suggestions" hasArrow>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Refresh suggestions"
                onClick={() => void handleDiscover()}
                isLoading={discoverPlaces.isPending}
                px={2}
              >
                <FiRefreshCw />
              </Button>
            </Tooltip>
          )}
          {mode === "mine" && selectedPlaces.length > 0 && onPlanDays && (
            <Button size="sm" variant="ghost" rightIcon={<FiArrowRight />} onClick={onPlanDays} color="accent.text">
              Plan my days
            </Button>
          )}
        </Flex>
        <CityChips cities={legs.map((l) => ({ id: l.id, name: l.name || l.baseCity }))} value={leg.id} onChange={onCityChange} />
      </Flex>

      {mode === "discover" && (
        <DiscoveryPlacesPanel
          trip={trip}
          leg={leg}
          poolPlaces={poolPlaces}
          selectedPlaceIds={selectedPlaceIds}
          onSelectedChange={syncSelectedFromIds}
          emptyAction={discoverButton}
        />
      )}
      {mode === "mine" && (
        <TripSelectedPlacesPanel
          trip={trip}
          leg={leg}
          selectedPlaces={selectedPlaces}
          onSelectedChange={setLocalSelected}
          onOpenDetails={setDetailsPlaceId}
        />
      )}
      {mode === "map" && !isWide && map}
    </Stack>
  );

  return (
    <Box>
      <TabSplit main={main} aside={isWide ? map : undefined} />
      <PlaceDetailModal
        isOpen={Boolean(detailsPlaceId)}
        onClose={() => setDetailsPlaceId(null)}
        trip={trip}
        legId={leg.id}
        placeId={detailsPlaceId}
        isSelected={detailsPlaceId ? selectedPlaceIds.has(detailsPlaceId) : false}
        onSelectedChange={syncSelectedFromIds}
      />
    </Box>
  );
}
