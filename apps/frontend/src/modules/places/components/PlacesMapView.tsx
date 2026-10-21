import { Box, Button, Flex, HStack, Menu, MenuButton, MenuItemOption, MenuList, MenuOptionGroup, Text, useToast } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { FiChevronDown, FiSearch } from "react-icons/fi";
import { getApiErrorMessage } from "@/lib/api";
import { useSearchArea } from "@/modules/places/hooks/usePlaces";
import type { AreaSearchCategory } from "@/modules/places/api/places.api";
import type { Place } from "@/modules/places/types/place.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import { LegendPin, type MapPin, TabMap } from "@/modules/trips/components/tabs/TabMap";

const AREA_CATEGORIES: { value: AreaSearchCategory; label: string }[] = [
  { value: "sights", label: "Sights" },
  { value: "nature", label: "Nature" },
  { value: "food", label: "Food" },
  { value: "shopping", label: "Shopping" },
];

interface PlacesMapViewProps {
  tripId: string;
  leg: TripLeg;
  places: Place[];
  selectedIds: Set<string>;
  onToggle: (place: Place, selected: boolean) => void;
  onOpenDetails: (placeId: string) => void;
  busyPlaceId?: string | null;
  /** Map height (defaults to filling the viewport beside the list). */
  height?: string | Record<string, string>;
}

export function PlacesMapView({ tripId, leg, places, selectedIds, onToggle, onOpenDetails, busyPlaceId, height }: PlacesMapViewProps) {
  const toast = useToast();
  const searchArea = useSearchArea(tripId);
  const [viewport, setViewport] = useState<{ lat: number; lng: number; radiusMeters: number } | null>(null);
  const [category, setCategory] = useState<AreaSearchCategory>("sights");
  const [showOnlyPicked, setShowOnlyPicked] = useState(false);

  const located = places.filter((p) => p.coordinates && p.googlePlaceId);
  const pickedCount = located.filter((p) => selectedIds.has(p.googlePlaceId!)).length;
  const visible = showOnlyPicked ? located.filter((p) => selectedIds.has(p.googlePlaceId!)) : located;
  const stays = (leg.stays ?? []).filter((s) => s.coordinates);

  const pins = useMemo<MapPin[]>(
    () => [
      ...stays.map((s) => ({ id: `stay-${s.id}`, lat: s.coordinates!.lat, lng: s.coordinates!.lng, kind: "stay" as const, title: s.name, popup: <Text fontWeight={600}>{s.name}</Text> })),
      ...visible.map((place) => {
        const selected = selectedIds.has(place.googlePlaceId!);
        const busy = busyPlaceId === place.googlePlaceId;
        return {
          id: place.googlePlaceId!,
          lat: place.coordinates!.lat,
          lng: place.coordinates!.lng,
          kind: selected ? ("selected" as const) : ("dim" as const),
          color: selected ? "ac" : "day.1",
          title: place.name,
          busy,
          popup: (
            <Box minW="190px">
              <Text fontWeight={600} fontSize="14px">
                {place.name}
              </Text>
              <Text fontSize="12px" color="tx3" mb={2}>
                {place.category}
                {place.rating !== undefined ? ` · ★ ${place.rating.toFixed(1)}` : ""}
                {place.userRatingCount ? ` (${place.userRatingCount.toLocaleString()})` : ""}
              </Text>
              <HStack spacing={2}>
                <Button size="xs" variant={selected ? "ai" : "solid"} onClick={() => onToggle(place, selected)} isLoading={busy}>
                  {selected ? "Remove" : "Add to trip"}
                </Button>
                <Button size="xs" variant="ghost" onClick={() => onOpenDetails(place.googlePlaceId!)}>
                  Details
                </Button>
              </HStack>
            </Box>
          ),
        };
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, stays, selectedIds, busyPlaceId],
  );

  const runSearch = async () => {
    if (!viewport) return;
    try {
      const result = await searchArea.mutateAsync({ legId: leg.id, category, ...viewport });
      toast({
        title: result.added ? `${result.added} new place${result.added === 1 ? "" : "s"} on the map` : "Nothing new in this area",
        status: result.added ? "success" : "info",
        duration: 2500,
      });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const categoryLabel = AREA_CATEGORIES.find((c) => c.value === category)?.label ?? "Sights";

  return (
    <TabMap
      label={`Map of places in ${leg.name || leg.baseCity}`}
      pins={pins}
      fitKey={`${leg.id}:${located.length > 0}`}
      onViewport={setViewport}
      h={height ?? { base: "440px", lg: "max(560px, calc(100vh - 140px))" }}
      floating={
        <Flex bg="sf" borderWidth="1px" borderColor="ln" borderRadius="full" boxShadow="ds1" align="center" p="3px">
          <Button
            size="lg"
            h="38px"
            variant="ghost"
            borderRadius="full"
            leftIcon={<FiSearch size={15} />}
            onClick={() => void runSearch()}
            isLoading={searchArea.isPending}
            isDisabled={!viewport}
          >
            Search this area
          </Button>
          <Menu isLazy placement="bottom-end">
            <MenuButton as={Button} size="sm" variant="ghost" borderRadius="full" rightIcon={<FiChevronDown />} aria-label={`What to search for: ${categoryLabel}`} color="tx3" fontWeight={500}>
              {categoryLabel}
            </MenuButton>
            <MenuList zIndex={1100} minW="160px">
              <MenuOptionGroup type="radio" value={category} onChange={(v) => setCategory(v as AreaSearchCategory)}>
                {AREA_CATEGORIES.map((c) => (
                  <MenuItemOption key={c.value} value={c.value}>
                    {c.label}
                  </MenuItemOption>
                ))}
              </MenuOptionGroup>
            </MenuList>
          </Menu>
        </Flex>
      }
      legend={
        <>
          <HStack spacing="6px">
            <LegendPin />
            <Text>Selected {pickedCount}</Text>
          </HStack>
          <HStack spacing="6px">
            <LegendPin color="day.1" dim />
            <Text>Discovered</Text>
          </HStack>
          {stays.length > 0 && (
            <HStack spacing="6px">
              <LegendPin stay />
              <Text>Stay</Text>
            </HStack>
          )}
          <Box as="button" type="button" color="ac" fontWeight={600} onClick={() => setShowOnlyPicked((v) => !v)} aria-pressed={showOnlyPicked}>
            {showOnlyPicked ? "Show all" : "Only picked"}
          </Box>
        </>
      }
    />
  );
}
