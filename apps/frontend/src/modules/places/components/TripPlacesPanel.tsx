import {
  Box,
  Button,
  HStack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { FiCompass } from "react-icons/fi";
import { getApiErrorMessage } from "@/lib/api";
import { DiscoveryPlacesPanel } from "@/modules/places/components/DiscoveryPlacesPanel";
import { TripSelectedPlacesPanel } from "@/modules/places/components/TripSelectedPlacesPanel";
import { useDiscoverPlaces, useTripPlacesQuery } from "@/modules/places/hooks/usePlaces";
import type { Place } from "@/modules/places/types/place.types";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";

interface TripPlacesPanelProps {
  trip: Trip;
  leg: TripLeg;
  /** Jump to the day plan once places are picked. */
  onPlanDays?: () => void;
}

export function TripPlacesPanel({ trip, leg, onPlanDays }: TripPlacesPanelProps) {
  const toast = useToast();
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const poolQuery = useTripPlacesQuery(trip.id, "pool");
  const selectedQuery = useTripPlacesQuery(trip.id, "selected", leg.id);
  const discoverPlaces = useDiscoverPlaces(trip.id);

  const [localSelected, setLocalSelected] = useState<Place[] | null>(null);

  useEffect(() => {
    setLocalSelected(null);
  }, [leg.id]);

  const poolPlaces = poolQuery.data?.places ?? [];
  const selectedPlaces = localSelected ?? selectedQuery.data?.places ?? [];
  const selectedPlaceIds = useMemo(
    () => new Set(selectedPlaces.map((p) => p.googlePlaceId).filter((id): id is string => Boolean(id))),
    [selectedPlaces],
  );

  const hasDiscoveryPool = leg.discoveryPoolIds.length > 0;

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

  return (
    <Box>
      <HStack justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
        <Text fontSize="sm" color="gray.500">
          {hasDiscoveryPool
            ? `Pick what you'd like to see in ${leg.name || leg.baseCity} — ${selectedPlaces.length} picked so far.`
            : `Start by finding the best places in ${leg.name || leg.baseCity}.`}
        </Text>
        <HStack spacing={2}>
        {selectedPlaces.length > 0 && onPlanDays && (
          <Button size="sm" variant="outline" colorScheme="brand" onClick={onPlanDays}>
            Plan my days →
          </Button>
        )}
        <Button
          leftIcon={<FiCompass />}
          size="sm"
          colorScheme="brand"
          onClick={handleDiscover}
          isLoading={discoverPlaces.isPending}
          loadingText={hasDiscoveryPool ? "Refreshing..." : "Discovering..."}
        >
          {hasDiscoveryPool ? "Refresh suggestions" : "Find places"}
        </Button>
        </HStack>
      </HStack>

      <Box bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl" overflow="hidden">
        <Tabs colorScheme="brand">
          <TabList px={4} pt={2}>
            <Tab fontSize="sm">Suggestions ({poolPlaces.filter((p) => p.googlePlaceId && leg.discoveryPoolIds.includes(p.googlePlaceId)).length})</Tab>
            <Tab fontSize="sm">My places ({selectedPlaces.length})</Tab>
          </TabList>
          <TabPanels p={5}>
            <TabPanel p={0}>
              <DiscoveryPlacesPanel
                trip={trip}
                leg={leg}
                poolPlaces={poolPlaces}
                selectedPlaceIds={selectedPlaceIds}
                onSelectedChange={syncSelectedFromIds}
              />
            </TabPanel>
            <TabPanel p={0}>
              <TripSelectedPlacesPanel
                trip={trip}
                leg={leg}
                selectedPlaces={selectedPlaces}
                onSelectedChange={setLocalSelected}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
}
