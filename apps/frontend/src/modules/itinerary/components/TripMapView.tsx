import { Box, HStack, Text, Wrap, WrapItem } from "@chakra-ui/react";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { ItineraryDay } from "@/modules/itinerary/types";
import { dayColor } from "@/modules/itinerary/utils/day-colors";
import { formatDayDate, isVisit } from "@/modules/itinerary/utils/plan.utils";

function dayPin(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:white;min-width:22px;height:22px;padding:0 4px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)">${label}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

const stayIcon = L.divIcon({
  className: "",
  html: `<div style="background:#3182CE;color:white;width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:11px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);">🛏</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

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
      else map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
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
}

/** Every day at once, one colour per day — to see how the trip is spread out. */
export function TripMapView({ days, stays, onSelectDay, height = "100%" }: TripMapViewProps) {
  const legendBg = "bg.surface";
  const plotted = useMemo(
    () =>
      days
        .map((day, i) => ({
          day,
          color: dayColor(i),
          visits: day.stops.filter((s) => isVisit(s) && s.coordinates),
        }))
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
      <MapContainer center={[20.59, 78.96]} zoom={5} style={{ height: "100%", width: "100%", borderRadius: "12px" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Fit points={points} />
        {stays.map((s, i) => (
          <Marker key={`stay-${i}`} position={[s.coordinates.lat, s.coordinates.lng]} icon={stayIcon}>
            <Tooltip>{s.name}</Tooltip>
          </Marker>
        ))}
        {plotted.map(({ day, color, visits }) => (
          <Polyline
            key={`line-${day.dayNumber}`}
            positions={visits.map((s) => [s.coordinates!.lat, s.coordinates!.lng] as [number, number])}
            color={color}
            weight={3}
            opacity={0.6}
            dashArray="5 6"
          />
        ))}
        {plotted.flatMap(({ day, color, visits }) =>
          visits.map((stop, i) => (
            <Marker
              key={stop.id}
              position={[stop.coordinates!.lat, stop.coordinates!.lng]}
              icon={dayPin(color, `${day.dayNumber}·${i + 1}`)}
              eventHandlers={{ click: () => onSelectDay(day.dayNumber) }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                <strong>Day {day.dayNumber}</strong> · {stop.placeName}
                <br />
                {stop.arrivalTime}
              </Tooltip>
            </Marker>
          )),
        )}
      </MapContainer>

      <Box position="absolute" bottom={3} left={3} right={3} zIndex={1000} pointerEvents="none">
        <Wrap spacing={1.5}>
          {plotted.map(({ day, color }) => (
            <WrapItem key={day.dayNumber} pointerEvents="auto">
              <HStack
                as="button"
                spacing={1.5}
                bg={legendBg}
                px={2}
                py={1}
                borderRadius="full"
                boxShadow="sm"
                fontSize="xs"
                onClick={() => onSelectDay(day.dayNumber)}
              >
                <Box w="10px" h="10px" borderRadius="full" bg={color} />
                <Text>
                  Day {day.dayNumber} · {formatDayDate(day.date, "EEE d")}
                </Text>
              </HStack>
            </WrapItem>
          ))}
        </Wrap>
      </Box>
    </Box>
  );
}
