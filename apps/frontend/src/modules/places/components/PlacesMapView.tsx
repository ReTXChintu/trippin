import { Box, Button, HStack, Select, Text, useColorModeValue, useToast } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { FiSearch } from "react-icons/fi";
import { getApiErrorMessage } from "@/lib/api";
import { useSearchArea } from "@/modules/places/hooks/usePlaces";
import type { AreaSearchCategory } from "@/modules/places/api/places.api";
import type { Place } from "@/modules/places/types/place.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";

function placeIcon(selected: boolean, highlighted: boolean): L.DivIcon {
  const size = highlighted ? 30 : selected ? 24 : 16;
  const bg = selected ? "#0d9488" : "#ffffff";
  const border = selected ? "#ffffff" : "#0d9488";
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid ${border};box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700">${selected ? "✓" : ""}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const stayIcon = L.divIcon({
  className: "",
  html: `<div style="background:#3182CE;color:white;width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);">🛏</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

function FitOnce({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (done || points.length === 0) return;
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 14);
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [30, 30] });
    setDone(true);
  }, [map, points, done]);
  return null;
}

/** Tracks the visible area so "Search this area" knows where to look. */
function ViewportWatcher({ onChange }: { onChange: (v: { lat: number; lng: number; radiusMeters: number }) => void }) {
  const map = useMapEvents({
    moveend: () => report(),
    zoomend: () => report(),
  });
  const report = () => {
    const center = map.getCenter();
    const bounds = map.getBounds();
    const radius = Math.min(center.distanceTo(bounds.getNorthEast()), 50_000);
    onChange({ lat: center.lat, lng: center.lng, radiusMeters: Math.max(Math.round(radius), 300) });
  };
  useEffect(report, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

interface PlacesMapViewProps {
  tripId: string;
  leg: TripLeg;
  places: Place[];
  selectedIds: Set<string>;
  onToggle: (place: Place, selected: boolean) => void;
  onOpenDetails: (placeId: string) => void;
  busyPlaceId?: string | null;
}

export function PlacesMapView({ tripId, leg, places, selectedIds, onToggle, onOpenDetails, busyPlaceId }: PlacesMapViewProps) {
  const toast = useToast();
  const searchArea = useSearchArea(tripId);
  const [viewport, setViewport] = useState<{ lat: number; lng: number; radiusMeters: number } | null>(null);
  const [category, setCategory] = useState<AreaSearchCategory>("sights");
  const [showOnlyPicked, setShowOnlyPicked] = useState(false);
  const panelBg = useColorModeValue("white", "gray.800");

  const located = places.filter((p) => p.coordinates && p.googlePlaceId);
  const visible = showOnlyPicked ? located.filter((p) => selectedIds.has(p.googlePlaceId!)) : located;
  const stays = (leg.stays ?? []).filter((s) => s.coordinates);
  const fitPoints = useMemo(
    () => [...located.map((p) => p.coordinates!), ...stays.map((s) => s.coordinates!)],
    // Fit to what's there the first time the map has data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [located.length > 0],
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

  return (
    <Box position="relative" h={{ base: "480px", lg: "620px" }} borderRadius="xl" overflow="hidden" borderWidth="1px">
      <MapContainer center={[20.59, 78.96]} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitOnce points={fitPoints} />
        <ViewportWatcher onChange={setViewport} />
        {stays.map((s) => (
          <Marker key={s.id} position={[s.coordinates!.lat, s.coordinates!.lng]} icon={stayIcon}>
            <Popup>{s.name}</Popup>
          </Marker>
        ))}
        {visible.map((place) => {
          const selected = selectedIds.has(place.googlePlaceId!);
          return (
            <Marker
              key={place.googlePlaceId}
              position={[place.coordinates!.lat, place.coordinates!.lng]}
              icon={placeIcon(selected, busyPlaceId === place.googlePlaceId)}
              zIndexOffset={selected ? 500 : 0}
            >
              <Popup>
                <Box minW="180px">
                  <Text fontWeight="semibold" fontSize="sm">
                    {place.name}
                  </Text>
                  <Text fontSize="xs" color="gray.500" mb={2}>
                    {place.category}
                    {place.rating !== undefined ? ` · ★ ${place.rating.toFixed(1)}` : ""}
                    {place.userRatingCount ? ` (${place.userRatingCount.toLocaleString()})` : ""}
                  </Text>
                  <HStack spacing={2}>
                    <Button
                      size="xs"
                      colorScheme={selected ? "red" : "brand"}
                      variant={selected ? "outline" : "solid"}
                      onClick={() => onToggle(place, selected)}
                      isLoading={busyPlaceId === place.googlePlaceId}
                    >
                      {selected ? "Remove" : "Add to trip"}
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => onOpenDetails(place.googlePlaceId!)}>
                      Details
                    </Button>
                  </HStack>
                </Box>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <HStack
        position="absolute"
        top={3}
        left="50%"
        transform="translateX(-50%)"
        zIndex={1000}
        bg={panelBg}
        p={1.5}
        borderRadius="full"
        boxShadow="md"
        spacing={1}
      >
        <Select size="sm" w="120px" borderRadius="full" value={category} onChange={(e) => setCategory(e.target.value as AreaSearchCategory)}>
          <option value="sights">Sights</option>
          <option value="nature">Nature</option>
          <option value="food">Food</option>
          <option value="shopping">Shopping</option>
        </Select>
        <Button size="sm" borderRadius="full" colorScheme="brand" leftIcon={<FiSearch />} onClick={runSearch} isLoading={searchArea.isPending} isDisabled={!viewport}>
          Search this area
        </Button>
      </HStack>

      <HStack position="absolute" bottom={3} left={3} zIndex={1000} bg={panelBg} px={3} py={1.5} borderRadius="md" boxShadow="sm" spacing={3} fontSize="xs">
        <HStack spacing={1}>
          <Box w="12px" h="12px" borderRadius="full" bg="brand.500" />
          <Text>Picked ({located.filter((p) => selectedIds.has(p.googlePlaceId!)).length})</Text>
        </HStack>
        <HStack spacing={1}>
          <Box w="10px" h="10px" borderRadius="full" borderWidth="2px" borderColor="brand.500" />
          <Text>Suggestion</Text>
        </HStack>
        <Button size="xs" variant="link" colorScheme="brand" onClick={() => setShowOnlyPicked((v) => !v)}>
          {showOnlyPicked ? "Show all" : "Only picked"}
        </Button>
      </HStack>
    </Box>
  );
}
