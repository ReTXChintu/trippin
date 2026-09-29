import { Box } from "@chakra-ui/react";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface RoutePoint {
  label: string;
  lat: number;
  lng: number;
}

function pin(n: number): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="background:var(--chakra-colors-accent);color:var(--chakra-colors-accent-fg);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 12px 'DM Sans',sans-serif;border:2.5px solid var(--chakra-colors-bg-surface);box-shadow:0 2px 6px rgba(0,0,0,.3);box-sizing:border-box">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
      if (points.length === 0) map.setView([25, 10], 1);
      else if (points.length === 1) map.setView(points[0], 6);
      else map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 8 });
    }, 50);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

/** The cities picked so far, numbered in visiting order and joined by the route. */
export function RoutePreviewMap({ points, height = "240px", borderRadius = "lg" }: { points: RoutePoint[]; height?: string; borderRadius?: string | number }) {
  const latLngs = useMemo(() => points.map((p) => [p.lat, p.lng] as [number, number]), [points]);
  return (
    <Box h={height} borderRadius={borderRadius} overflow="hidden" position="relative" zIndex={0}>
      <MapContainer center={[25, 10]} zoom={1} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {latLngs.length > 1 && <Polyline positions={latLngs} pathOptions={{ color: "var(--chakra-colors-accent)", weight: 4, opacity: 0.9, lineCap: "round", lineJoin: "round" }} />}
        {points.map((p, i) => (
          <Marker key={`${p.label}-${i}`} position={[p.lat, p.lng]} icon={pin(i + 1)}>
            <Tooltip direction="top" offset={[0, -12]}>
              {p.label}
            </Tooltip>
          </Marker>
        ))}
        <Fit points={latLngs} />
      </MapContainer>
    </Box>
  );
}
