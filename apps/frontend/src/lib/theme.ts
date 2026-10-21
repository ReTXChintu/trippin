import { extendTheme, type StyleFunctionProps, type ThemeConfig } from "@chakra-ui/react";

/**
 * Trippin' on the shared iBoon design system (docs/design-system.md, §9.3 "Chakra UI v2").
 *
 * SpendLog, Trippin and InFrame share one set of neutrals, semantics, type (IBM Plex Sans/Mono),
 * spacing, radii and components. Each app varies only its accent quad; Trippin's is ocean
 * (#0A6E86 light / #6CCBE3 dark). Token names are the spec's own short names (`bg`, `sf`, `tx`,
 * `ac`…) so the design and the code read the same. Every token has a light and a dark value,
 * so a page never needs its own `useColorModeValue` for colour.
 */

const config: ThemeConfig = { initialColorMode: "system", useSystemColorMode: true };

type Pair = { default: string; _dark: string };
const c = (light: string, dark: string): Pair => ({ default: light, _dark: dark });

/** The spec's token table (§3.1), with Trippin's accent quad (§10). */
const DS: Record<string, Pair> = {
  // surfaces
  canvas: c("#E4E1D8", "#08090A"),
  bg: c("#F4F2EC", "#111214"),
  sf: c("#FFFFFF", "#1A1B1E"),
  sf2: c("#FAF9F5", "#202125"),
  sunk: c("#ECE9E1", "#0C0D0F"),
  // lines
  ln: c("#E2DED4", "#2B2D32"),
  ln2: c("#C7C2B5", "#3D3F46"),
  // ink
  tx: c("#18191D", "#EDEBE6"),
  tx2: c("#4C4D53", "#BEBCB6"),
  tx3: c("#67686E", "#9A9893"),
  // accent: Trippin's ocean
  ac: c("#0A6E86", "#6CCBE3"),
  acTx: c("#FFFFFF", "#062029"),
  acSoft: c("#E0F1F5", "#10282F"),
  acLine: c("#A9D6E1", "#1F4E5A"),
  // semantic
  good: c("#15724A", "#56C892"),
  goodSoft: c("#E1F0E6", "#12291D"),
  warn: c("#8F5200", "#F2B661"),
  warnFill: c("#E39A2E", "#E9A240"),
  warnSoft: c("#FBEED6", "#2E2312"),
  crit: c("#B3302A", "#FF8C80"),
  critFill: c("#D9473E", "#E45B50"),
  critSoft: c("#FBE5E2", "#341A19"),
  hatch: c("#C7C2B5", "#4A4C53"),
  scrim: c("rgba(24,25,29,.42)", "rgba(0,0,0,.6)"),
  // Chart palette (§3.3). c1 is always the app accent; Trippin swaps the teal c3 for cobalt so it
  // never sits next to the ocean accent (§10). Dark c3 uses the readable cobalt pastel.
  c1: c("#0A6E86", "#6CCBE3"),
  c2: c("#C7792B", "#C7792B"),
  c3: c("#2C4FCB", "#93A8FF"),
  c4: c("#B04A6F", "#B04A6F"),
  c5: c("#6A7A2F", "#6A7A2F"),
  cOther: c("#8A8780", "#8A8780"),
  // Inverse (toast) ink: the strong semantic shades of the *other* theme, readable on `tx`.
  invGood: c("#56C892", "#15724A"),
  invWarn: c("#F2B661", "#8F5200"),
  invCrit: c("#FF8C80", "#B3302A"),
  invAc: c("#6CCBE3", "#0A6E86"),
  // Sibling apps' own accents (§10), used only for their icon tiles in "Connected apps", so each
  // app is recognisable by its colour across the suite.
  "app.spendlog": c("#2C4FCB", "#93A8FF"),
  "app.spendlogSoft": c("#E6EBFB", "#1D2544"),
  "app.inframe": c("#6A3FC4", "#BBA4FF"),
  "app.inframeSoft": c("#EEE8FB", "#251D3D"),
  // Map placeholder art and pins (Trippin-specific, on the shared neutrals).
  "map.land": c("#ECE9E1", "#1A1B1E"),
  "map.water": c("#CFE5EC", "#10282F"),
  "map.green": c("#DCE5CF", "#18241C"),
  "pin.fg": c("#FFFFFF", "#111214"),
};

/** One colour per day on maps and day chips; they differ in lightness as well as hue, carry white
 * (light) or ink (dark) numerals, and repeat after 8. Day 1 is the ocean accent. These are map data,
 * not a chart series, so they keep their own contrast-tuned set. */
export const DAY_COLORS_LIGHT = ["#0A6E86", "#C2410C", "#4338CA", "#A21CAF", "#4D7C0F", "#BE123C", "#0369A1", "#92400E"];
export const DAY_COLORS_DARK = ["#6CCBE3", "#FB923C", "#A5B4FC", "#E879F9", "#A3E635", "#FB7185", "#7DD3FC", "#D9A066"];

/** Chart series order for Trippin (budget categories etc.), as token names. */
export const CHART_TOKENS = ["c1", "c2", "c3", "c4", "c5", "cOther"] as const;

/**
 * Older Trippin names, kept as aliases of the spec tokens so nothing renders blank if one is
 * missed. New code uses the spec names; `accent` / `danger` / `success` stay valid because they
 * double as tone names in a few places.
 */
const LEGACY: Record<string, string> = {
  "bg.canvas": "bg",
  "bg.surface": "sf",
  "bg.subtle": "sunk",
  "border.line": "ln",
  "fg.default": "tx",
  "fg.muted": "tx3",
  accent: "ac",
  "accent.fg": "acTx",
  "accent.soft": "acSoft",
  "accent.text": "ac",
  "warn.soft": "warnSoft",
  danger: "crit",
  "danger.soft": "critSoft",
  success: "good",
  "success.soft": "goodSoft",
  overlay: "scrim",
};

const semanticColors: Record<string, Pair | string> = { ...DS };
for (const [legacy, token] of Object.entries(LEGACY)) semanticColors[legacy] = DS[token];
DAY_COLORS_LIGHT.forEach((col, i) => {
  semanticColors[`day.${i + 1}`] = c(col, DAY_COLORS_DARK[i]);
});
// Chakra's own names, so built-in components pick up the palette too.
Object.assign(semanticColors, {
  "chakra-body-bg": DS.bg,
  "chakra-body-text": DS.tx,
  "chakra-border-color": DS.ln,
  "chakra-subtle-bg": DS.sunk,
  "chakra-subtle-text": DS.tx3,
  "chakra-placeholder-color": DS.tx3,
});

const SANS = "'IBM Plex Sans', system-ui, sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const FOCUS_RING = { outline: "3px solid var(--chakra-colors-ac)", outlineOffset: "3px", boxShadow: "none" };
const AC_HOVER = "color-mix(in srgb, var(--chakra-colors-ac) 90%, var(--chakra-colors-tx))";
const AC_PRESS = "color-mix(in srgb, var(--chakra-colors-ac) 82%, var(--chakra-colors-tx))";

const primary = {
  bg: "ac",
  color: "acTx",
  _hover: { bg: AC_HOVER, _disabled: { bg: "sunk" } },
  _active: { bg: AC_PRESS },
  _disabled: { bg: "sunk", color: "tx3", opacity: 1 },
};
const secondary = {
  bg: "sf",
  color: "tx",
  border: "1px solid",
  borderColor: "ln2",
  _hover: { bg: "sf2", _disabled: { bg: "sf" } },
  _active: { bg: "sunk" },
};
const destructive = {
  bg: "transparent",
  color: "crit",
  border: "1px solid",
  borderColor: "critSoft",
  _hover: { bg: "critSoft" },
  _active: { bg: "critSoft" },
};

/** Field look shared by Input / Select / NumberInput / Textarea (§7.2). The 2px focus edge is an
 * inset ring on top of the 1px border, so icon paddings never shift. */
const fieldLook = {
  bg: "sf",
  color: "tx",
  border: "1px solid",
  borderColor: "ln2",
  borderRadius: "md",
  _hover: { borderColor: "tx3" },
  _focusVisible: { borderColor: "ac", boxShadow: "inset 0 0 0 1px var(--chakra-colors-ac)" },
  _invalid: { borderColor: "crit", boxShadow: "inset 0 0 0 1px var(--chakra-colors-crit)" },
  _readOnly: { bg: "sf2", color: "tx2" },
  _disabled: { bg: "sf2", color: "tx3", opacity: 1, cursor: "not-allowed" },
  _placeholder: { color: "tx3" },
};
const inputSize = (h: string, fs: string) => {
  const v = { "--input-height": h, "--input-font-size": fs, "--input-padding": "14px", "--input-border-radius": "10px" };
  return { field: v, group: v, addon: v, element: { h, w: h } };
};
const softPair = (scheme: string): [string, string] => {
  switch (scheme) {
    case "brand":
    case "teal":
    case "cyan":
    case "blue":
      return ["acSoft", "ac"];
    case "orange":
    case "yellow":
      return ["warnSoft", "warn"];
    case "red":
      return ["critSoft", "crit"];
    case "green":
      return ["goodSoft", "good"];
    default:
      return ["sunk", "tx2"];
  }
};

const theme = extendTheme({
  config,
  fonts: { heading: SANS, body: SANS, mono: MONO },
  fontSizes: {
    "2xs": "11px",
    xs: "12px",
    sm: "13px",
    md: "14px",
    lg: "15px",
    xl: "17px",
    "2xl": "19px",
    "3xl": "22px",
    "4xl": "28px",
    "5xl": "34px",
    "6xl": "40px",
    "7xl": "44px",
  },
  lineHeights: {
    micro: "14px",
    caption: "16px",
    bodyS: "18px",
    body: "20px",
    bodyL: "22px",
    section: "24px",
    title: "26px",
    page: "28px",
    d34: "40px",
    d40: "48px",
    d44: "52px",
  },
  letterSpacings: { tight: "-0.02em", snug: "-0.01em", label: "0.02em" },
  radii: { xs: "3px", sm: "6px", md: "10px", lg: "12px", xl: "14px", "2xl": "16px", "3xl": "20px", full: "9999px" },
  shadows: {
    outline: "0 0 0 3px var(--chakra-colors-ac)",
  },
  colors: {
    // Legacy `gray.*` / `brand.*` usages land on the shared neutrals and the ocean accent.
    gray: {
      50: "#FAF9F5",
      100: "#F4F2EC",
      200: "#ECE9E1",
      300: "#E2DED4",
      400: "#C7C2B5",
      500: "#67686E",
      600: "#4C4D53",
      700: "#2B2D32",
      800: "#1A1B1E",
      900: "#111214",
    },
    brand: {
      50: "#F0F8FA",
      100: "#E0F1F5",
      200: "#A9D6E1",
      300: "#6CCBE3",
      400: "#2B8FA7",
      500: "#0A6E86",
      600: "#085D71",
      700: "#064B5C",
      800: "#10282F",
      900: "#062029",
    },
  },
  semanticTokens: {
    colors: semanticColors,
    shadows: {
      ds1: { default: "0 1px 2px rgba(24,25,29,.06), 0 2px 8px rgba(24,25,29,.05)", _dark: "0 0 0 1px rgba(255,255,255,.02)" },
      ds2: { default: "0 16px 40px rgba(24,25,29,.18)", _dark: "0 16px 40px rgba(0,0,0,.6)" },
      // Legacy name: only floating things (menus, popovers, map overlays) use it now.
      raised: { default: "0 16px 40px rgba(24,25,29,.18)", _dark: "0 16px 40px rgba(0,0,0,.6)" },
    },
  },
  styles: {
    global: {
      // Root stays 16px so Chakra spacing (rem) matches the design pixel-for-pixel; body text is 14/20.
      html: { bg: "bg", colorScheme: "light", _dark: { colorScheme: "dark" } },
      body: {
        bg: "bg",
        color: "tx",
        fontFamily: "body",
        fontSize: "14px",
        lineHeight: "20px",
        WebkitFontSmoothing: "antialiased",
      },
      "::placeholder": { color: "tx3", opacity: 1 },
      ".num": { fontVariantNumeric: "tabular-nums lining-nums" },
      ".mono": { fontFamily: "mono", fontVariantNumeric: "tabular-nums" },
      "a:focus-visible, [role='tab']:focus-visible, summary:focus-visible": FOCUS_RING,
      "@media (prefers-reduced-motion: reduce)": {
        "*, *::before, *::after": { transitionDuration: "0ms !important", animationDuration: "0ms !important" },
      },
      // Leaflet chrome on every map, in the suite's style: the zoom bar is a grouped control like the
      // period stepper (surface, hairline, radius 12, small lift since it floats over the map), 40px
      // icon buttons; popups are floating cards; tooltips are inverse ink like the app's tooltips.
      ".leaflet-container": { fontFamily: "body", bg: "map.land", fontSize: "13px" },
      ".leaflet-container a": { color: "ac" },
      ".leaflet-bar, .leaflet-touch .leaflet-bar": {
        border: "1px solid",
        borderColor: "ln",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "ds1",
        bgClip: "padding-box",
      },
      ".leaflet-bar a, .leaflet-touch .leaflet-bar a": {
        width: "40px",
        height: "40px",
        lineHeight: "40px",
        bg: "sf",
        color: "tx2",
        fontSize: "20px",
        fontWeight: 400,
        borderBottom: "1px solid",
        borderColor: "ln",
        borderRadius: "0 !important",
        transition: "background .12s, color .12s",
      },
      ".leaflet-bar a:last-child": { borderBottom: "none" },
      ".leaflet-bar a:hover, .leaflet-bar a:focus": { bg: "sf2", color: "tx" },
      ".leaflet-bar a:focus-visible": { outline: "3px solid", outlineColor: "ac", outlineOffset: "-3px" },
      ".leaflet-bar a.leaflet-disabled": { bg: "sf", color: "ln2" },
      ".leaflet-control-attribution, .leaflet-container .leaflet-control-attribution": {
        bg: "sf",
        color: "tx3",
        fontSize: "11px",
        lineHeight: "16px",
        borderRadius: "6px",
        px: "6px",
        mr: "8px",
        mb: "6px",
        opacity: 0.92,
        a: { color: "tx3" },
      },
      ".leaflet-popup-content-wrapper": { bg: "sf", color: "tx", borderRadius: "12px", border: "1px solid", borderColor: "ln", boxShadow: "ds2" },
      ".leaflet-popup-tip": { bg: "sf", boxShadow: "none" },
      ".leaflet-popup-content": { m: "12px 14px", fontSize: "13px", lineHeight: "18px" },
      ".leaflet-container a.leaflet-popup-close-button": { color: "tx3", w: "28px", h: "28px", fontSize: "20px", lineHeight: "28px" },
      ".leaflet-tooltip": {
        bg: "tx",
        color: "bg",
        border: "none",
        borderRadius: "10px",
        boxShadow: "none",
        fontFamily: "body",
        fontSize: "12px",
        lineHeight: "16px",
        fontWeight: 500,
        px: "8px",
        py: "4px",
      },
      ".leaflet-tooltip-top:before": { borderTopColor: "tx" },
      ".leaflet-tooltip-bottom:before": { borderBottomColor: "tx" },
      ".leaflet-tooltip-left:before": { borderLeftColor: "tx" },
      ".leaflet-tooltip-right:before": { borderRightColor: "tx" },
    },
  },
  components: {
    Heading: {
      baseStyle: { fontFamily: "heading", fontWeight: 600, color: "tx" },
      sizes: {
        "2xl": { fontSize: "44px", lineHeight: "52px", letterSpacing: "tight" },
        xl: { fontSize: "34px", lineHeight: "40px", letterSpacing: "tight" },
        lg: { fontSize: "22px", lineHeight: "28px" },
        md: { fontSize: "17px", lineHeight: "24px" },
        sm: { fontSize: "15px", lineHeight: "20px" },
        xs: { fontSize: "13px", lineHeight: "18px" },
      },
    },
    Text: { baseStyle: { fontSize: "inherit" } },
    Link: { baseStyle: { color: "ac", fontWeight: 600, _hover: { color: "tx", textDecoration: "none" }, _focusVisible: FOCUS_RING } },
    Button: {
      baseStyle: {
        fontWeight: 600,
        borderRadius: "lg",
        fontFamily: "body",
        transitionProperty: "background, color, border-color, filter",
        transitionDuration: "120ms",
        _focusVisible: FOCUS_RING,
        _disabled: { cursor: "not-allowed" },
      },
      // Heights follow the spec ladder (52 auth · 48 forms/dialogs · 40 header/default · 36 · 32 row actions).
      sizes: {
        xl: { h: "52px", minW: "52px", fontSize: "15px", px: 6, borderRadius: "lg" },
        lg: { h: "48px", minW: "48px", fontSize: "15px", px: 5, borderRadius: "lg" },
        md: { h: "40px", minW: "40px", fontSize: "14px", px: 4, borderRadius: "lg" },
        sm: { h: "36px", minW: "36px", fontSize: "13px", px: 3, borderRadius: "md" },
        xs: { h: "32px", minW: "32px", fontSize: "13px", px: 2.5, borderRadius: "md" },
      },
      variants: {
        primary,
        secondary,
        // `solid` is Trippin's historic name for the primary button.
        solid: (p: StyleFunctionProps) => {
          if (p.colorScheme === "gray") return secondary;
          // A final "Delete" confirm (§7.1): filled critical.
          if (p.colorScheme === "red") return { bg: "critFill", color: "#fff", _hover: { filter: "brightness(.94)" }, _active: { filter: "brightness(.88)" } };
          return primary;
        },
        // `outline` is the secondary button.
        outline: (p: StyleFunctionProps) => (p.colorScheme === "red" ? destructive : secondary),
        ghost: (p: StyleFunctionProps) => ({
          bg: "transparent",
          color: p.colorScheme === "red" ? "crit" : p.colorScheme === "gray" ? "tx2" : "ac",
          _hover: { bg: "sunk" },
          _active: { bg: "sunk" },
        }),
        danger: destructive,
        // AI actions: soft accent.
        ai: { bg: "acSoft", color: "ac", _hover: { boxShadow: "inset 0 0 0 1px var(--chakra-colors-acLine)" }, _active: { bg: "acLine" } },
        link: { color: "ac", fontWeight: 600, h: "auto", minW: 0, px: 0, _hover: { color: "tx", textDecoration: "none" } },
        unstyled: { _focusVisible: FOCUS_RING },
      },
      defaultProps: { variant: "solid", colorScheme: "brand", size: "md" },
    },
    CloseButton: {
      baseStyle: { color: "tx2", borderRadius: "full", _hover: { bg: "sunk" }, _focusVisible: FOCUS_RING },
    },
    Input: {
      variants: {
        ds: { field: fieldLook, addon: { bg: "sf2", border: "1px solid", borderColor: "ln2", color: "tx2" } },
        outline: { field: fieldLook, addon: { bg: "sf2", border: "1px solid", borderColor: "ln2", color: "tx2" } },
        filled: { field: { ...fieldLook, bg: "sf2" } },
      },
      sizes: { lg: inputSize("52px", "15px"), md: inputSize("44px", "14px"), sm: inputSize("40px", "14px"), xs: inputSize("32px", "13px") },
      defaultProps: { variant: "ds", size: "md" },
    },
    NumberInput: {
      variants: { ds: { field: fieldLook }, outline: { field: fieldLook } },
      sizes: { lg: inputSize("52px", "15px"), md: inputSize("44px", "14px"), sm: inputSize("40px", "14px") },
      defaultProps: { variant: "ds", size: "md" },
    },
    PinInput: {
      variants: { outline: fieldLook },
    },
    Select: {
      baseStyle: { icon: { color: "tx2" } },
      variants: { ds: { field: fieldLook }, outline: { field: fieldLook } },
      sizes: {
        lg: { field: { h: "52px", fontSize: "15px", ps: "14px", borderRadius: "md" } },
        md: { field: { h: "44px", fontSize: "14px", ps: "14px", borderRadius: "md" } },
        sm: { field: { h: "40px", fontSize: "14px", ps: "12px", borderRadius: "md" } },
        xs: { field: { h: "32px", fontSize: "13px", ps: "10px", borderRadius: "md" } },
      },
      defaultProps: { variant: "ds", size: "md" },
    },
    Textarea: {
      variants: { ds: { ...fieldLook, py: "12px", px: "14px" }, outline: { ...fieldLook, py: "12px", px: "14px" } },
      sizes: { md: { fontSize: "14px", lineHeight: "20px" }, lg: { fontSize: "15px", lineHeight: "22px" } },
      defaultProps: { variant: "ds", size: "md" },
    },
    FormLabel: { baseStyle: { fontSize: "12px", lineHeight: "16px", fontWeight: 600, letterSpacing: "label", color: "tx2", mb: "6px", me: 0 } },
    FormError: { baseStyle: { text: { color: "crit", fontSize: "12px", lineHeight: "16px", mt: "6px" }, icon: { color: "crit" } } },
    Form: { baseStyle: { helperText: { color: "tx3", fontSize: "12px", lineHeight: "16px", mt: "6px" }, requiredIndicator: { color: "crit" } } },
    // Badges and status tags (§7.4): 24 high, radius 6, 12/600, soft fill + strong text.
    Badge: {
      baseStyle: {
        h: "24px",
        px: 2,
        borderRadius: "sm",
        fontSize: "12px",
        fontWeight: 600,
        textTransform: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        fontVariantNumeric: "tabular-nums",
      },
      variants: {
        subtle: (p: StyleFunctionProps) => {
          const [bg, color] = softPair(p.colorScheme);
          return { bg, color };
        },
        solid: (p: StyleFunctionProps) => (p.colorScheme === "red" ? { bg: "critFill", color: "#fff" } : { bg: "ac", color: "acTx" }),
        outline: { bg: "transparent", color: "tx2", boxShadow: "inset 0 0 0 1px var(--chakra-colors-ln2)" },
      },
      defaultProps: { variant: "subtle", colorScheme: "gray" },
    },
    // Chips (§7.4): 36 high, full radius, 1px ln2, 13/500.
    Tag: {
      baseStyle: { container: { borderRadius: "full", fontWeight: 500, fontSize: "13px" } },
      sizes: {
        sm: { container: { minH: "24px", px: 2, fontSize: "12px" } },
        md: { container: { minH: "32px", px: 3, fontSize: "13px" } },
        lg: { container: { minH: "36px", px: "14px", fontSize: "13px" } },
      },
      variants: {
        subtle: (p: StyleFunctionProps) => {
          const [bg, color] = softPair(p.colorScheme);
          return { container: { bg, color } };
        },
        outline: { container: { boxShadow: "none", border: "1px solid", borderColor: "ln2", color: "tx", bg: "sf" } },
        solid: { container: { bg: "tx", color: "bg", border: "1px solid", borderColor: "tx" } },
      },
      defaultProps: { variant: "subtle", colorScheme: "gray" },
    },
    // Flat, bordered surfaces (§5.4): cards never have a shadow.
    Card: {
      baseStyle: { container: { bg: "sf", border: "1px solid", borderColor: "ln", borderRadius: "xl", boxShadow: "none" } },
    },
    // No underline tabs in the system: Chakra Tabs render as the segmented control (§7.3).
    Tabs: {
      variants: {
        line: {
          tablist: { bg: "sunk", borderRadius: "lg", p: 1, gap: 1, border: "none", display: "inline-flex", maxW: "full", overflowX: "auto" },
          tab: {
            h: "32px",
            px: 3,
            borderRadius: "9px",
            fontSize: "14px",
            fontWeight: 500,
            color: "tx2",
            border: "none",
            mb: 0,
            whiteSpace: "nowrap",
            _selected: { bg: "sf", color: "tx", fontWeight: 600, boxShadow: "ds1" },
            _focusVisible: FOCUS_RING,
          },
          tabpanel: { px: 0 },
        },
      },
    },
    Modal: {
      baseStyle: {
        overlay: { bg: "scrim" },
        dialog: { bg: "sf", color: "tx", borderRadius: "3xl", boxShadow: "ds2" },
        header: { fontFamily: "heading", fontWeight: 600, fontSize: "19px", lineHeight: "24px", px: 6, pt: 6, pb: 4 },
        body: { px: 6, py: 0, fontSize: "14px" },
        footer: { px: 6, pt: 5, pb: 6, gap: 2 },
        closeButton: { top: 4, insetEnd: 4, w: "40px", h: "40px" },
      },
    },
    Drawer: {
      baseStyle: {
        overlay: { bg: "scrim" },
        dialog: { bg: "sf", color: "tx", boxShadow: "ds2" },
        header: { fontFamily: "heading", fontWeight: 600, fontSize: "19px", lineHeight: "24px" },
        closeButton: { w: "40px", h: "40px" },
      },
    },
    Menu: {
      baseStyle: {
        list: { bg: "sf", border: "1px solid", borderColor: "ln", borderRadius: "lg", boxShadow: "ds2", py: 1.5, minW: "220px" },
        item: { bg: "sf", color: "tx", fontSize: "14px", minH: "40px", px: 3, _hover: { bg: "sunk" }, _focus: { bg: "sunk" } },
        groupTitle: { fontSize: "12px", fontWeight: 600, color: "tx3", mx: 3 },
        divider: { borderColor: "ln", opacity: 1 },
        icon: { color: "tx2" },
      },
    },
    Popover: {
      baseStyle: {
        content: { bg: "sf", border: "1px solid", borderColor: "ln", borderRadius: "lg", boxShadow: "ds2", "--popper-arrow-bg": "var(--chakra-colors-sf)" },
        header: { borderColor: "ln", fontWeight: 600 },
        footer: { borderColor: "ln" },
      },
    },
    Tooltip: {
      baseStyle: { borderRadius: "md", fontSize: "12px", lineHeight: "16px", px: 2.5, py: 1.5, bg: "tx", color: "bg", "--popper-arrow-bg": "var(--chakra-colors-tx)", boxShadow: "none" },
    },
    Alert: {
      baseStyle: { container: { borderRadius: "lg", px: 4, py: 3 }, title: { fontWeight: 600 }, icon: { boxSize: "20px" } },
      variants: {
        // Callouts (§7.5): info is accent tint + ink, the rest soft + strong.
        subtle: (p: StyleFunctionProps) => {
          const map: Record<string, [string, string, string]> = {
            info: ["acSoft", "tx", "ac"],
            loading: ["acSoft", "tx", "ac"],
            warning: ["warnSoft", "warn", "warn"],
            error: ["critSoft", "crit", "crit"],
            success: ["goodSoft", "good", "good"],
          };
          const [bg, fg, icon] = map[p.status ?? "info"] ?? map.info;
          return { container: { bg, color: fg }, icon: { color: icon }, spinner: { color: icon } };
        },
        // Toasts (§7.12): inverse ink, radius 12, floating shadow.
        solid: (p: StyleFunctionProps) => {
          const icon: Record<string, string> = { info: "invAc", loading: "invAc", success: "invGood", warning: "invWarn", error: "invCrit" };
          return {
            container: { bg: "tx", color: "bg", borderRadius: "lg", boxShadow: "ds2", minH: "52px", alignItems: "center", fontSize: "14px", lineHeight: "20px" },
            title: { fontWeight: 600 },
            description: { color: "bg", opacity: 0.85 },
            icon: { color: icon[p.status ?? "info"] ?? "invAc" },
            spinner: { color: "invAc" },
          };
        },
      },
    },
    Divider: { baseStyle: { borderColor: "ln", opacity: 1 } },
    Checkbox: {
      baseStyle: {
        control: {
          w: "20px",
          h: "20px",
          borderRadius: "6px",
          border: "1.5px solid",
          borderColor: "ln2",
          bg: "sf",
          _checked: { bg: "ac", borderColor: "ac", color: "acTx", _hover: { bg: "ac", borderColor: "ac" } },
          _indeterminate: { bg: "ac", borderColor: "ac", color: "acTx" },
          _focusVisible: { boxShadow: "outline" },
        },
        label: { fontSize: "14px" },
      },
      defaultProps: { colorScheme: "brand" },
    },
    Radio: {
      baseStyle: {
        control: {
          border: "1.5px solid",
          borderColor: "ln2",
          bg: "sf",
          _checked: { bg: "sf", borderColor: "ac", color: "ac", _hover: { bg: "sf", borderColor: "ac" } },
          _focusVisible: { boxShadow: "outline" },
        },
      },
      defaultProps: { colorScheme: "brand" },
    },
    // Switch (§7.2): 52×32 track, 24 thumb; off ln2 / sf, on ac / acTx.
    Switch: {
      baseStyle: {
        track: { p: "4px", bg: "ln2", _checked: { bg: "ac" }, _focusVisible: { boxShadow: "outline" } },
        thumb: { bg: "sf", _checked: { bg: "acTx" } },
      },
      // Track sizes exclude the 4px padding: md is the spec's 52×32, sm a compact 36×24.
      sizes: {
        sm: { container: { "--switch-track-width": "28px", "--switch-track-height": "16px" } },
        md: { container: { "--switch-track-width": "44px", "--switch-track-height": "24px" } },
        lg: { container: { "--switch-track-width": "44px", "--switch-track-height": "24px" } },
      },
      defaultProps: { colorScheme: "brand", size: "md" },
    },
    Progress: {
      baseStyle: { track: { bg: "sunk", borderRadius: "full" }, filledTrack: { bg: "ac", borderRadius: "full" } },
    },
    Spinner: { baseStyle: { color: "ac" } },
    Skeleton: {
      baseStyle: {
        borderRadius: "md",
        "--skeleton-start-color": "var(--chakra-colors-sunk)",
        "--skeleton-end-color": "var(--chakra-colors-sf2)",
        _dark: { "--skeleton-start-color": "var(--chakra-colors-sunk)", "--skeleton-end-color": "var(--chakra-colors-sf2)" },
      },
    },
    Table: {
      baseStyle: {
        th: { fontFamily: "body", textTransform: "none", letterSpacing: 0, fontSize: "12px", fontWeight: 600, color: "tx2" },
        td: { fontVariantNumeric: "tabular-nums" },
      },
      variants: {
        simple: { th: { borderColor: "ln", color: "tx2" }, td: { borderColor: "ln" }, caption: { color: "tx3" } },
      },
    },
    Avatar: {
      baseStyle: { container: { bg: "tx", color: "bg", fontWeight: 600 } },
    },
    Kbd: { baseStyle: { bg: "sunk", borderColor: "ln2", color: "tx2", fontFamily: "mono" } },
    Code: { baseStyle: { fontFamily: "mono", bg: "sunk", color: "tx", borderRadius: "sm", px: 1.5 } },
  },
});

export default theme;
