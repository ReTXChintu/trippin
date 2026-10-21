import { Box, type BoxProps } from "@chakra-ui/react";
import { useMemo } from "react";

/**
 * A drawn (not real) street map for the public pages — land, a park, water, streets and a numbered
 * route. It's decoration, so it's hidden from screen readers unless a label is given. Colours come
 * from the map tokens; the two street colours have no semantic token, so they're set here per mode.
 */

export interface MapPin {
  x: number;
  y: number;
  label: string;
}

const W = 700;

/** Deterministic wobble so the streets look hand-drawn but never change between renders. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildStreets(h: number, seed: number) {
  const r = rng(seed);
  const across: { d: string; w: number }[] = [];
  const rows = 9;
  for (let i = 0; i < rows; i++) {
    const y = ((i + 0.55) / rows) * h;
    const j = () => (r() - 0.5) * (h / rows) * 0.9;
    across.push({ d: `M0 ${y + j()} C 210 ${y + j()}, 420 ${y + j()}, 700 ${y + j()}`, w: i % 3 === 0 ? 4 : 2 });
  }
  const down: { d: string; w: number }[] = [];
  const cols = 8;
  for (let i = 0; i < cols; i++) {
    const x = ((i + 0.45) / cols) * W;
    const j = () => (r() - 0.5) * 60;
    down.push({ d: `M${x + j()} 0 C ${x + j()} ${h * 0.3}, ${x + j()} ${h * 0.6}, ${x + j()} ${h}`, w: i % 2 === 0 ? 5 : 3 });
  }
  return { across, down };
}

export function IllustratedMap({
  height,
  pins = [],
  stay,
  color = "var(--chakra-colors-day-1)",
  seed = 7,
  label,
  children,
  ...rest
}: {
  /** Height of the drawing in its own 700-wide coordinates (the box itself can be any size). */
  height: number;
  pins?: MapPin[];
  stay?: { x: number; y: number };
  color?: string;
  seed?: number;
  label?: string;
  children?: React.ReactNode;
} & BoxProps) {
  const h = height;
  const streets = useMemo(() => buildStreets(h, seed), [h, seed]);
  const route = pins.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <Box
      position="relative"
      overflow="hidden"
      bg="map.land"
      sx={{ "--street": "#FFFFFF", "--street-2": "#E2DED4" }}
      _dark={{ "--street": "#2B2D32", "--street-2": "#202125" } as never}
      {...rest}
    >
      <svg
        viewBox={`0 0 ${W} ${h}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      >
        <defs>
          <filter id="pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>
        <rect width={W} height={h} fill="var(--chakra-colors-map-land)" />
        <path d={`M0 ${h * 0.08} C 140 ${h * 0.02}, 244 ${h * 0.15}, 350 ${h * 0.06} L 350 0 L 0 0 Z`} fill="var(--chakra-colors-map-green)" />
        <ellipse cx="574" cy={h * 0.72} rx="98" ry={Math.max(18, h * 0.09)} fill="var(--chakra-colors-map-green)" />
        <path d={`M434 ${h} C 462 ${h * 0.86}, 546 ${h * 0.8}, 700 ${h * 0.84} L 700 ${h} Z`} fill="var(--chakra-colors-map-water)" />
        {streets.across.map((s, i) => (
          <path key={`a${i}`} d={s.d} stroke="var(--street-2)" strokeWidth={s.w} fill="none" />
        ))}
        {streets.down.map((s, i) => (
          <path key={`d${i}`} d={s.d} stroke="var(--street)" strokeWidth={s.w} fill="none" />
        ))}
        <path d={`M0 ${h * 0.55} L700 ${h * 0.4}`} stroke="var(--street)" strokeWidth="7" fill="none" />
        {pins.length > 1 && (
          <polyline points={route} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
        )}
        {stay && (
          <g transform={`translate(${stay.x - 14} ${stay.y - 14})`} filter="url(#pin-shadow)">
            <rect width="28" height="28" rx="9" fill="var(--chakra-colors-tx)" stroke="var(--chakra-colors-sf)" strokeWidth="2.5" />
            <g transform="translate(6.5 6.5) scale(0.625)" fill="none" stroke="var(--chakra-colors-bg)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 00-3-3h-7v5" />
              <circle cx="7" cy="11" r="1.5" />
            </g>
          </g>
        )}
        {pins.map((p) => (
          <g key={p.label + p.x} filter="url(#pin-shadow)">
            <circle cx={p.x} cy={p.y} r="13" fill={color} stroke="var(--chakra-colors-sf)" strokeWidth="2.5" />
            <text x={p.x} y={p.y} dy="0.35em" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--chakra-colors-pin-fg)" fontFamily="'IBM Plex Sans', sans-serif">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      {children}
    </Box>
  );
}
