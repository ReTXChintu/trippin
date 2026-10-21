import { Box, type BoxProps, Flex, IconButton } from "@chakra-ui/react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { type MapPin, pinIcon } from "./mapPins";

export type { MapPin, MapPinKind } from "./mapPins";
import { FiMinus, FiPlus } from "react-icons/fi";

function ViewportEvents({ onViewport }: { onViewport?: (v: { lat: number; lng: number; radiusMeters: number }) => void }) {
  const map = useMapEvents({
    moveend: () => report(),
    zoomend: () => report(),
  });
  const report = () => {
    if (!onViewport) return;
    const center = map.getCenter();
    const radius = Math.min(center.distanceTo(map.getBounds().getNorthEast()), 50_000);
    onViewport({ lat: center.lat, lng: center.lng, radiusMeters: Math.max(Math.round(radius), 300) });
  };
  useEffect(report, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * The map pane used by the Places and Stays tabs: design pins, square zoom buttons top-right,
 * slots for a floating action (top centre) and a legend (bottom left).
 */
export function TabMap({
  pins,
  fitKey,
  floating,
  legend,
  onViewport,
  label = "Map",
  ...rest
}: {
  pins: MapPin[];
  /** Refit to the pins whenever this changes (defaults to the first time pins appear). */
  fitKey?: string;
  /** Floating action at the top centre (e.g. "Search this area"). */
  floating?: ReactNode;
  legend?: ReactNode;
  onViewport?: (v: { lat: number; lng: number; radiusMeters: number }) => void;
  label?: string;
} & Omit<BoxProps, "top">) {
  const [map, setMap] = useState<L.Map | null>(null);
  const key = fitKey ?? (pins.length > 0 ? "ready" : "empty");
  const points = useMemo(() => pins.map((p) => [p.lat, p.lng] as [number, number]), [pins]);

  useEffect(() => {
    if (!map || points.length === 0) return;
    const timer = window.setTimeout(() => {
      map.invalidateSize();
      if (points.length === 1) map.setView(points[0], 14);
      else map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
    }, 60);
    return () => window.clearTimeout(timer);
    // Refit only when the key changes, not on every pin update (keeps the user's pan/zoom).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  return (
    <Box
      position="relative"
      overflow="hidden"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="ln"
      bg="map.land"
      role="region"
      aria-label={label}
      sx={{
        ".leaflet-container": { bg: "map.land", fontFamily: "body" },
        _dark: { ".leaflet-tile-pane": { filter: "invert(1) hue-rotate(180deg) brightness(.92) contrast(.88) saturate(.55)" } },
      }}
      {...rest}
    >
      <MapContainer ref={setMap} center={[20.59, 78.96]} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom zoomControl={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ViewportEvents onViewport={onViewport} />
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={pinIcon(pin)}
            title={pin.title}
            alt={pin.title}
            zIndexOffset={pin.kind === "selected" || pin.kind === "stay" ? 500 : pin.kind === "hotel" ? 400 : 0}
          >
            {pin.popup && <Popup>{pin.popup}</Popup>}
          </Marker>
        ))}
      </MapContainer>

      {/* Grouped zoom control, matching Leaflet's own bar elsewhere (surface, hairline, radius 12). */}
      <Flex
        direction="column"
        position="absolute"
        right="14px"
        top="14px"
        zIndex={1000}
        bg="sf"
        borderWidth="1px"
        borderColor="ln"
        borderRadius="lg"
        boxShadow="ds1"
        overflow="hidden"
      >
        <IconButton aria-label="Zoom in" title="Zoom in" icon={<FiPlus size={20} />} variant="ghost" colorScheme="gray" borderRadius={0} w="40px" h="40px" onClick={() => map?.zoomIn()} />
        <Box h="1px" bg="ln" />
        <IconButton aria-label="Zoom out" title="Zoom out" icon={<FiMinus size={20} />} variant="ghost" colorScheme="gray" borderRadius={0} w="40px" h="40px" onClick={() => map?.zoomOut()} />
      </Flex>
      {floating && (
        <Flex position="absolute" left={0} right={0} top="16px" justify="center" zIndex={1000} pointerEvents="none" px="64px">
          <Box pointerEvents="auto">{floating}</Box>
        </Flex>
      )}
      {legend && (
        <Flex
          position="absolute"
          left="16px"
          bottom="30px"
          zIndex={1000}
          align="center"
          gap={3}
          flexWrap="wrap"
          px={3}
          py={2}
          maxW="calc(100% - 32px)"
          bg="sf"
          borderWidth="1px"
          borderColor="ln"
          borderRadius="xl"
          boxShadow="ds1"
          fontSize="12px"
        >
          {legend}
        </Flex>
      )}
    </Box>
  );
}

/** Small pin swatch for a legend. */
export function LegendPin({ color = "ac", dim, stay }: { color?: string; dim?: boolean; stay?: boolean }) {
  return (
    <Box
      as="span"
      display="inline-block"
      w="14px"
      h="14px"
      borderRadius={stay ? "4px" : "full"}
      bg={stay ? "tx" : color}
      borderWidth="2px"
      borderColor="sf"
      boxShadow="0 0 0 1px var(--chakra-colors-ln)"
      opacity={dim ? 0.55 : 1}
      flexShrink={0}
    />
  );
}
