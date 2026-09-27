import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { decode } from "@googlemaps/polyline-codec";
import type { ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";
import type { DayRoute } from "@/modules/itinerary/api/itinerary.api";

const BRAND = "#0d9488";
const MEAL = "#f97316";
const STAY = "#3182CE";

function pinIcon(label: string, color: string, highlighted: boolean): L.DivIcon {
  const size = highlighted ? 34 : 26;
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:white;width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${highlighted ? 14 : 12}px;font-weight:700;border:2px solid white;box-shadow:0 1px 5px rgba(0,0,0,${highlighted ? 0.45 : 0.3});transition:all .15s">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const stayIcon = L.divIcon({
  className: "",
  html: `<div style="background:${STAY};color:white;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);">🛏</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const HOTEL_START_ID = "hotel-start";

interface MapViewProps {
  day: ItineraryDay | null;
  hotelCoordinates?: { lat: number; lng: number };
  /** Real, road-following route (geometry + per-hop distance/duration). Optional — falls back to
   * dashed straight lines when absent. */
  route?: DayRoute | null;
  height?: string;
  highlightedStopId?: string | null;
  onStopClick?: (stopId: string) => void;
  /** Where to look when the day itself has nothing to show (e.g. a travel day). */
  fallbackCenter?: { lat: number; lng: number };
}

function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40] });
    // Refit only when the set of points actually changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  return null;
}

function PanToHighlighted({ stop }: { stop: ItineraryStop | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (stop?.coordinates && !map.getBounds().contains([stop.coordinates.lat, stop.coordinates.lng])) {
      map.panTo([stop.coordinates.lat, stop.coordinates.lng]);
    }
  }, [map, stop]);
  return null;
}

/** Visits get numbers matching the timeline; meals with a chosen place get a fork. */
function markerLabels(stops: ItineraryStop[]): Map<string, string> {
  const labels = new Map<string, string>();
  let n = 0;
  for (const stop of stops) {
    if (stop.stopType === "meal") labels.set(stop.id, "🍴");
    else if (stop.stopType !== "return" && stop.stopType !== "transfer") labels.set(stop.id, String(++n));
  }
  return labels;
}

export function MapView({
  day,
  hotelCoordinates,
  route,
  height = "100%",
  highlightedStopId,
  onStopClick,
  fallbackCenter,
}: MapViewProps) {
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

  const highlighted = highlightedStopId ? stopById.get(highlightedStopId) : undefined;

  return (
    <MapContainer center={defaultCenter} zoom={defaultZoom} style={{ height, width: "100%", borderRadius: "12px" }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={allPoints} />
      <PanToHighlighted stop={highlighted} />

      {hotelCoordinates && (
        <Marker position={[hotelCoordinates.lat, hotelCoordinates.lng]} icon={stayIcon}>
          <Popup>Start of the day — your stay</Popup>
        </Marker>
      )}
      {endStay && (!hotelCoordinates || endStay.lat !== hotelCoordinates.lat || endStay.lng !== hotelCoordinates.lng) && (
        <Marker position={[endStay.lat, endStay.lng]} icon={stayIcon}>
          <Popup>Tonight's stay</Popup>
        </Marker>
      )}

      {stops.map((stop) => (
        <Marker
          key={stop.id}
          position={[stop.coordinates!.lat, stop.coordinates!.lng]}
          icon={pinIcon(labels.get(stop.id) ?? "•", stop.stopType === "meal" ? MEAL : BRAND, stop.id === highlightedStopId)}
          zIndexOffset={stop.id === highlightedStopId ? 1000 : 0}
          eventHandlers={onStopClick ? { click: () => onStopClick(stop.id) } : undefined}
        >
          <Tooltip direction="top" offset={[0, -12]}>
            <strong>{stop.placeName}</strong>
            <br />
            {stop.arrivalTime} – {stop.departureTime}
          </Tooltip>
        </Marker>
      ))}

      {decodedLines
        ? decodedLines.map((line, i) => <Polyline key={i} positions={line} color={BRAND} weight={4} opacity={0.75} />)
        : straightLine.length >= 2 && (
            <Polyline positions={straightLine} color={BRAND} weight={3} opacity={0.6} dashArray="6 6" />
          )}

      {hopMidpoints.map((hop) => (
        <Marker
          key={hop.key}
          position={hop.position}
          icon={L.divIcon({
            className: "",
            html: `<div style="background:white;color:#2D3748;padding:1px 6px;border-radius:8px;font-size:11px;font-weight:600;white-space:nowrap;border:1px solid #CBD5E0;box-shadow:0 1px 3px rgba(0,0,0,0.2);transform:translate(-50%,-50%)">${hop.durationMinutes} min</div>`,
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
