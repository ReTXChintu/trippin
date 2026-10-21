import { useColorModeValue } from "@chakra-ui/react";
import L from "leaflet";
import { DAY_COLORS_DARK, DAY_COLORS_LIGHT } from "@/lib/theme";

/** Leaflet draws raw HTML/SVG, so pins read the theme through CSS variables (they switch with the
 * colour mode); polylines need a resolved colour, which `useDayColor` provides. */
export const V = {
  surface: "var(--chakra-colors-sf)",
  text: "var(--chakra-colors-tx)",
  canvas: "var(--chakra-colors-bg)",
  muted: "var(--chakra-colors-tx3)",
  line: "var(--chakra-colors-ln)",
  pinFg: "var(--chakra-colors-pin-fg)",
  accent: "var(--chakra-colors-ac)",
};

export function dayVar(dayNumber: number): string {
  return `var(--chakra-colors-day-${((Math.max(dayNumber, 1) - 1) % 8) + 1})`;
}

export function useDayColors(): string[] {
  return useColorModeValue(DAY_COLORS_LIGHT, DAY_COLORS_DARK);
}

const BED_SVG =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>';
const FORK_SVG =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>';

type PinState = "normal" | "selected" | "hover" | "dim";

/** Numbered pin in the day's colour — normal 28px, selected 38px with an accent ring, hover 34px. */
export function numberPin(label: string, color: string, state: PinState = "normal"): L.DivIcon {
  const size = state === "selected" ? 38 : state === "hover" ? 34 : 28;
  const ring =
    state === "selected"
      ? `0 0 0 3px ${V.accent}, 0 2px 8px rgba(24,25,29,.3)`
      : state === "hover"
        ? `0 0 0 3px ${V.text}, 0 2px 8px rgba(24,25,29,.3)`
        : "0 1px 2px rgba(24,25,29,.2), 0 2px 8px rgba(24,25,29,.15)";
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:${V.pinFg};width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 ${state === "selected" ? 14 : 12}px 'IBM Plex Sans',sans-serif;border:2px solid ${V.surface};box-shadow:${ring};font-variant-numeric:tabular-nums;opacity:${state === "dim" ? 0.45 : 1};transition:all .15s">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

export const stayPin = L.divIcon({
  className: "",
  html: `<div style="background:${V.text};color:${V.canvas};width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:2px solid ${V.surface};box-shadow:0 1px 2px rgba(24,25,29,.2), 0 2px 8px rgba(24,25,29,.15)">${BED_SVG}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export function mealPin(highlighted: boolean): L.DivIcon {
  const size = highlighted ? 30 : 24;
  return L.divIcon({
    className: "",
    html: `<div style="background:${V.surface};color:${V.muted};width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1.5px solid ${highlighted ? V.text : "var(--chakra-colors-ln2)"};box-shadow:0 1px 2px rgba(24,25,29,.15)">${FORK_SVG}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}


/** Map tiles in the suite's paper tones (dimmed in dark mode). Spread onto the Box that wraps a
 * MapContainer; the controls, popups, tooltips and attribution are styled globally in the theme. */
export const mapChromeSx = {
  ".leaflet-container": { bg: "map.land", fontFamily: "body" },
  ".leaflet-tile-pane": { filter: "saturate(.7) sepia(.12) brightness(1.02)" },
  _dark: {
    ".leaflet-tile-pane": { filter: "invert(1) hue-rotate(180deg) brightness(.82) contrast(.9) saturate(.45)" },
  },
  ".leaflet-top.leaflet-right": { top: "4px", right: "4px" },
} as const;
