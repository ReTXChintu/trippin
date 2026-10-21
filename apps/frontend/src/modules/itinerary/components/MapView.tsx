import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { decode } from "@googlemaps/polyline-codec";
import type { ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";
import type { DayRoute } from "@/modules/itinerary/api/itinerary.api";
import { V, dayVar, mealPin, numberPin, stayPin, useDayColors } from "./map-pins";

const HOTEL_START_ID = "hotel-start";

interface MapViewProps {
  day: ItineraryDay | null;
  hotelCoordinates?: { lat: number; lng: number };
  /** Real, road-following route (geometry + per-hop distance/duration). Optional — falls back to
   * dashed straight lines when absent. */
  route?: DayRoute | null;
  height?: string;
  highlightedStopId?: string | null;
  /** The stop picked in the list — drawn larger with an accent ring. */
  selectedStopId?: string | null;
  onStopClick?: (stopId: string) => void;
  /** Where to look when the day itself has nothing to show (e.g. a travel day). */
  fallbackCenter?: { lat: number; lng: number };
  /** Hide Leaflet's zoom buttons (phones pinch). */
  zoomControl?: boolean;
}

/** Keeps Leaflet's size in step with its box (tab switches, panel resizes, List/Map toggles). */
export function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");

  useEffect(() => {
    if (points.length === 0) return;
    const fit = () => {
      map.invalidateSize();
      if (points.length === 1) map.setView([points[0].lat, points[0].lng], 14);
      else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [48, 48] });
    };
    const timer = window.setTimeout(fit, 30);
    return () => window.clearTimeout(timer);
    // Refit only when the set of points actually changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  return null;
}

function PanToStop({ stop }: { stop: ItineraryStop | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (stop?.coordinates && !map.getBounds().contains([stop.coordinates.lat, stop.coordinates.lng])) {
      map.panTo([stop.coordinates.lat, stop.coordinates.lng]);
    }
  }, [map, stop]);
  return null;
}

/** Visits get numbers matching the timeline. */
function markerLabels(stops: ItineraryStop[]): Map<string, string> {
  const labels = new Map<string, string>();
  let n = 0;
  for (const stop of stops) {
    if (stop.stopType !== "meal" && stop.stopType !== "return" && stop.stopType !== "transfer") labels.set(stop.id, String(++n));
  }
  return labels;
}

export function MapView({
  day,
  hotelCoordinates,
  route,
  height = "100%",
  highlightedStopId,
  selectedStopId,
  onStopClick,
  fallbackCenter,
  zoomControl = true,
}: MapViewProps) {
  const dayColors = useDayColors();
  const dayNumber = day?.dayNumber ?? 1;
  const lineColor = dayColors[(dayNumber - 1) % 8];
  const pinColor = dayVar(dayNumber);

  const stops = useMemo(
    () => day?.stops.filter((s) => s.coordinates && s.stopType !== "transfer" && s.stopType !== "return") ?? [],
    [day],
  );
  const endStay = day?.stops.find((s) => s.stopType === "return" && s.coordinates)?.coordinates;
  const labels = useMemo(() => markerLabels(day?.stops ?? []), [day]);

  const allPoints = useMemo(() => {
    const pts = stops.map((s) => s.coordinates!);
    if (hotelCoordinates) pts.unshift(hotelCoordinates);
    if (endStay) pts.push(endStay);
    if (pts.length === 0 && fallbackCenter) pts.push(fallbackCenter);
    return pts;
  }, [stops, hotelCoordinates, endStay, fallbackCenter]);

  const defaultCenter: [number, number] =
    allPoints.length > 0 ? [allPoints[0].lat, allPoints[0].lng] : [20.5937, 78.9629];
  const defaultZoom = allPoints.length > 0 ? 13 : 5;

  const decodedLines = useMemo<[number, number][][] | null>(() => {
    const encoded = route?.overviewPolyline ? [route.overviewPolyline] : (route?.segmentPolylines ?? []);
    if (encoded.length === 0) return null;
    try {
      const lines = encoded.map((p) => decode(p, 5) as [number, number][]).filter((l) => l.length >= 2);
      return lines.length > 0 ? lines : null;
    } catch {
      return null;
    }
  }, [route?.overviewPolyline, route?.segmentPolylines]);

  const straightLine = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    if (hotelCoordinates) pts.push([hotelCoordinates.lat, hotelCoordinates.lng]);
    for (const s of stops) pts.push([s.coordinates!.lat, s.coordinates!.lng]);
    if (endStay) pts.push([endStay.lat, endStay.lng]);
    return pts;
  }, [hotelCoordinates, stops, endStay]);

  const stopById = new Map((day?.stops ?? []).map((s) => [s.id, s]));
  const hopMidpoints = (route?.hops ?? [])
    .map((hop) => {
      const from = hop.fromStopId === HOTEL_START_ID ? hotelCoordinates : stopById.get(hop.fromStopId)?.coordinates;
      const to = stopById.get(hop.toStopId)?.coordinates;
      if (!from || !to || hop.durationMinutes < 2) return null;
      return {
        key: `${hop.fromStopId}-${hop.toStopId}`,
        position: [(from.lat + to.lat) / 2, (from.lng + to.lng) / 2] as [number, number],
        distanceKm: hop.distanceKm,
        durationMinutes: hop.durationMinutes,
      };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);

  const focusStop = (selectedStopId && stopById.get(selectedStopId)) || (highlightedStopId ? stopById.get(highlightedStopId) : undefined);

  return (
    <MapContainer center={defaultCenter} zoom={defaultZoom} style={{ height, width: "100%" }} scrollWheelZoom zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {zoomControl && <ZoomTopRight />}
      <AutoResize />
      <FitBounds points={allPoints} />
      <PanToStop stop={focusStop} />

      {decodedLines
        ? decodedLines.map((line, i) => <Polyline key={i} positions={line} color={lineColor} weight={4} opacity={0.85} />)
        : straightLine.length >= 2 && <Polyline positions={straightLine} color={lineColor} weight={3} opacity={0.8} dashArray="6 7" />}

      {hotelCoordinates && (
        <Marker position={[hotelCoordinates.lat, hotelCoordinates.lng]} icon={stayPin} zIndexOffset={500}>
          <Popup>Start of the day — your stay</Popup>
        </Marker>
      )}
      {endStay && (!hotelCoordinates || endStay.lat !== hotelCoordinates.lat || endStay.lng !== hotelCoordinates.lng) && (
        <Marker position={[endStay.lat, endStay.lng]} icon={stayPin}>
          <Popup>Tonight's stay</Popup>
        </Marker>
      )}

      {stops.map((stop) => {
        const selected = stop.id === selectedStopId;
        const hover = !selected && stop.id === highlightedStopId;
        const icon =
          stop.stopType === "meal"
            ? mealPin(selected || hover)
            : numberPin(labels.get(stop.id) ?? "•", pinColor, selected ? "selected" : hover ? "hover" : stop.status ? "dim" : "normal");
        return (
          <Marker
            key={stop.id}
            position={[stop.coordinates!.lat, stop.coordinates!.lng]}
            icon={icon}
            zIndexOffset={selected ? 1200 : hover ? 1000 : 0}
            eventHandlers={onStopClick ? { click: () => onStopClick(stop.id) } : undefined}
          >
            <Tooltip direction="top" offset={[0, -14]}>
              <strong>{stop.placeName}</strong>
              <br />
              {stop.arrivalTime} – {stop.departureTime}
            </Tooltip>
          </Marker>
        );
      })}

      {hopMidpoints.map((hop) => (
        <Marker
          key={hop.key}
          position={hop.position}
          icon={L.divIcon({
            className: "",
            html: `<div style="background:${V.surface};color:${V.muted};padding:1px 7px;border-radius:999px;font:600 11px 'IBM Plex Sans',sans-serif;white-space:nowrap;border:1px solid ${V.line};box-shadow:0 1px 3px rgba(0,0,0,0.15);transform:translate(-50%,-50%)">${hop.durationMinutes} min</div>`,
            iconSize: [0, 0],
          })}
          interactive={false}
        >
          <Tooltip>{hop.distanceKm} km</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}

/** Leaflet's zoom buttons, top-right. */
export function ZoomTopRight() {
  const map = useMap();
  useEffect(() => {
    const control = L.control.zoom({ position: "topright" });
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map]);
  return null;
}

