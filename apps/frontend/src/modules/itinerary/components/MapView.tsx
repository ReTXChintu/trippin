import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { ItineraryDay } from "@/modules/itinerary/types";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const hotelIcon = L.divIcon({
  className: "",
  html: `<div style="background:#3182CE;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);">H</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

interface MapViewProps {
  day: ItineraryDay | null;
  hotelCoordinates?: { lat: number; lng: number };
  height?: string;
}

function FitBounds({
  points,
}: {
  points: { lat: number; lng: number }[];
}) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);

  return null;
}

export function MapView({ day, hotelCoordinates, height = "100%" }: MapViewProps) {
  const stops = day?.stops.filter((s) => s.coordinates) ?? [];
  const routePoints = stops.map((s) => s.coordinates!);

  const allPoints = [...routePoints];
  if (hotelCoordinates) allPoints.unshift(hotelCoordinates);

  const defaultCenter: [number, number] =
    allPoints.length > 0
      ? [allPoints[0].lat, allPoints[0].lng]
      : [20.5937, 78.9629];

  const polylinePoints: [number, number][] = [];
  if (hotelCoordinates) {
    polylinePoints.push([hotelCoordinates.lat, hotelCoordinates.lng]);
  }
  for (const stop of stops) {
    if (stop.coordinates) {
      polylinePoints.push([stop.coordinates.lat, stop.coordinates.lng]);
    }
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height, width: "100%", borderRadius: "12px" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={allPoints} />

      {hotelCoordinates && (
        <Marker position={[hotelCoordinates.lat, hotelCoordinates.lng]} icon={hotelIcon}>
          <Popup>Hotel</Popup>
        </Marker>
      )}

      {stops.map((stop, index) =>
        stop.coordinates ? (
          <Marker
            key={stop.id}
            position={[stop.coordinates.lat, stop.coordinates.lng]}
            icon={defaultIcon}
          >
            <Popup>
              <strong>
                {index + 1}. {stop.placeName}
              </strong>
              <br />
              {stop.arrivalTime} – {stop.departureTime}
            </Popup>
          </Marker>
        ) : null,
      )}

      {polylinePoints.length >= 2 && (
        <Polyline positions={polylinePoints} color="#3182CE" weight={3} opacity={0.7} />
      )}
    </MapContainer>
  );
}
