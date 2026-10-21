import { Box, Flex, Text } from "@chakra-ui/react";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { ItineraryDay } from "@/modules/itinerary/types";
import { formatDayDate, isVisit } from "@/modules/itinerary/utils/plan.utils";
import { DayDot } from "@/components/ui/plan";
import { AutoResize, ZoomTopRight } from "./MapView";
import { dayVar, numberPin, stayPin, useDayColors } from "./map-pins";

function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length === 0) return;
    // The map is often mounted into a container that just appeared (map mode toggle) — measure
    // the real size first, or Leaflet fits the bounds to a 0×0 box.
    const fit = () => {
      map.invalidateSize();
      if (points.length === 1) map.setView(points[0], 13);
      else map.fitBounds(L.latLngBounds(points), { padding: [48, 48] });
    };
    const timer = window.setTimeout(fit, 50);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

interface TripMapViewProps {
  days: ItineraryDay[];
  stays: { name: string; coordinates: { lat: number; lng: number } }[];
  onSelectDay: (dayNumber: number) => void;
  height?: string;
  zoomControl?: boolean;
  /** Hide the day legend (when the page shows day chips already). */
  hideLegend?: boolean;
}

/** Every day at once, one colour per day — to see how the trip is spread out. */
export function TripMapView({ days, stays, onSelectDay, height = "100%", zoomControl = true, hideLegend }: TripMapViewProps) {
  const dayColors = useDayColors();
  const plotted = useMemo(
    () =>
      days
        .map((day) => ({ day, visits: day.stops.filter((s) => isVisit(s) && s.coordinates) }))
        .filter((d) => d.visits.length > 0),
    [days],
  );

  const points = useMemo<[number, number][]>(
    () => [
      ...plotted.flatMap((d) => d.visits.map((s) => [s.coordinates!.lat, s.coordinates!.lng] as [number, number])),
      ...stays.map((s) => [s.coordinates.lat, s.coordinates.lng] as [number, number]),
    ],
    [plotted, stays],
  );

  return (
    <Box position="relative" h={height}>
      <MapContainer center={[20.59, 78.96]} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {zoomControl && <ZoomTopRight />}
        <AutoResize />
        <Fit points={points} />
        {plotted.map(({ day, visits }) => (
          <Polyline
            key={`line-${day.dayNumber}`}
            positions={visits.map((s) => [s.coordinates!.lat, s.coordinates!.lng] as [number, number])}
            color={dayColors[(day.dayNumber - 1) % 8]}
            weight={3}
            opacity={0.75}
            dashArray="5 6"
          />
        ))}
        {stays.map((s, i) => (
          <Marker key={`stay-${i}`} position={[s.coordinates.lat, s.coordinates.lng]} icon={stayPin} zIndexOffset={500}>
            <Tooltip>{s.name}</Tooltip>
          </Marker>
        ))}
        {plotted.flatMap(({ day, visits }) =>
          visits.map((stop, i) => (
            <Marker
              key={stop.id}
              position={[stop.coordinates!.lat, stop.coordinates!.lng]}
              icon={numberPin(String(i + 1), dayVar(day.dayNumber))}
              eventHandlers={{ click: () => onSelectDay(day.dayNumber) }}
            >
              <Tooltip direction="top" offset={[0, -14]}>
                <strong>Day {day.dayNumber}</strong> · {stop.placeName}
                <br />
                {stop.arrivalTime}
              </Tooltip>
            </Marker>
          )),
        )}
      </MapContainer>

      {!hideLegend && (
        <Flex position="absolute" bottom="28px" left={3} right={3} zIndex={1000} pointerEvents="none" gap="6px" flexWrap="wrap">
          {plotted.map(({ day }) => (
            <Flex
              key={day.dayNumber}
              as="button"
              type="button"
              pointerEvents="auto"
              align="center"
              gap="6px"
              h="28px"
              px="10px"
              bg="sf"
              borderWidth="1px"
              borderColor="ln"
              borderRadius="full"
              boxShadow="ds1"
              fontSize="12px"
              fontWeight={600}
              onClick={() => onSelectDay(day.dayNumber)}
              aria-label={`Show day ${day.dayNumber}`}
            >
              <DayDot dayNumber={day.dayNumber} size={9} />
              <Text>
                {day.dayNumber} · {formatDayDate(day.date, "EEE d")}
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Box>
  );
}
