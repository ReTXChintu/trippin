import type { ReactNode } from "react";
import L from "leaflet";

/** `accent` → `var(--chakra-colors-ac)`, `day.2` → `var(--chakra-colors-day-2)`. Switches with the colour mode. */
export function tokenVar(token: string): string {
  if (token.startsWith("#") || token.startsWith("var(") || token.startsWith("rgb")) return token;
  return `var(--chakra-colors-${token.replace(/\./g, "-")})`;
}

export type MapPinKind = "place" | "selected" | "dim" | "stay" | "hotel";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  kind: MapPinKind;
  /** Token or colour for place / dim pins. */
  color?: string;
  label?: string;
  title?: string;
  popup?: ReactNode;
  busy?: boolean;
}

const BED_SVG =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 00-3-3h-7v5"/><circle cx="7" cy="11" r="1.5"/></svg>';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Pin styles from the design (`.pin`, `.pin.hl`, `.pin.dim`, `.pin.stay`). */
const iconCache = new Map<string, L.DivIcon>();

export function pinIcon(pin: Pick<MapPin, "kind" | "color" | "label" | "busy">): L.DivIcon {
  const cacheKey = `${pin.kind}|${pin.color ?? ""}|${pin.label ?? ""}|${pin.busy ? 1 : 0}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;
  const surface = tokenVar("sf");
  const pinFg = tokenVar("pin.fg");
  const base = `display:flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid ${surface};color:${pinFg};font:700 12px 'IBM Plex Sans',sans-serif;font-variant-numeric:tabular-nums;box-shadow:0 1px 2px rgba(24,25,29,.2),0 2px 8px rgba(24,25,29,.15);`;
  let size = 28;
  let style = "";
  let inner = pin.label ? escapeHtml(pin.label) : "";
  switch (pin.kind) {
    case "selected":
      size = 30;
      style = `${base}background:${tokenVar(pin.color ?? "ac")};box-shadow:0 0 0 3px ${tokenVar("ac")},0 2px 8px rgba(24,25,29,.3);`;
      break;
    case "dim":
      size = 24;
      style = `${base}background:${tokenVar(pin.color ?? "day.1")};opacity:.55;`;
      break;
    case "stay":
      style = `${base}border-radius:8px;background:${tokenVar("tx")};color:${tokenVar("bg")};`;
      inner = BED_SVG;
      break;
    case "hotel":
      style = `${base}background:${tokenVar("ac")};`;
      break;
    default:
      style = `${base}background:${tokenVar(pin.color ?? "ac")};`;
  }
  if (pin.busy) style += "opacity:.6;";
  const icon = L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;${style}">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
  iconCache.set(cacheKey, icon);
  return icon;
}

