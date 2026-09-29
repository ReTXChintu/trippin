import { extendTheme, type StyleFunctionProps, type ThemeConfig } from "@chakra-ui/react";

/**
 * Trippin' design system — warm paper neutrals, a deep teal accent, Fraunces for display and
 * DM Sans for UI. Every semantic token has a light and a dark value (see `semanticTokens`);
 * components use those, so a page never needs its own `useColorModeValue` for colour.
 */

const config: ThemeConfig = {
  initialColorMode: "system",
  useSystemColorMode: true,
};

/** Raw values, light / dark. */
const T = {
  bg: ["#F5F3EE", "#0E1514"],
  surface: ["#FFFFFF", "#151E1D"],
  surface2: ["#EEEBE3", "#1C2827"],
  line: ["#E2DDD1", "#2B3B39"],
  text: ["#1A2422", "#E6EEEC"],
  muted: ["#55625F", "#9BAEAA"],
  accent: ["#0F766E", "#4FBDB0"],
  accentFg: ["#FFFFFF", "#05201D"],
  accentSoft: ["#DCF0ED", "#12332F"],
  accentText: ["#0A544E", "#86DCD1"],
  warn: ["#8A4B08", "#F0B562"],
  warnSoft: ["#FBEBCB", "#35270F"],
  danger: ["#B42318", "#F49C93"],
  dangerSoft: ["#FDE4E1", "#3A1B18"],
  success: ["#25703F", "#7DD69B"],
  successSoft: ["#DDF1E3", "#14301F"],
  overlay: ["rgba(20,30,28,.42)", "rgba(0,0,0,.6)"],
  pinText: ["#FFFFFF", "#0E1514"],
  mapLand: ["#EDE9DD", "#1B2422"],
  mapWater: ["#BFD9E2", "#14303A"],
  mapGreen: ["#D5E3C6", "#1A2E22"],
} as const;

/** One colour per day on maps and day chips; they differ in lightness as well as hue. Repeats after 8. */
export const DAY_COLORS_LIGHT = ["#0E7490", "#C2410C", "#4338CA", "#A21CAF", "#4D7C0F", "#BE123C", "#0369A1", "#92400E"];
export const DAY_COLORS_DARK = ["#4FC3D9", "#FB923C", "#A5B4FC", "#E879F9", "#A3E635", "#FB7185", "#7DD3FC", "#D9A066"];

const pair = ([light, dark]: readonly [string, string]) => ({ default: light, _dark: dark });

const semanticColors: Record<string, { default: string; _dark: string }> = {
  "bg.canvas": pair(T.bg),
  "bg.surface": pair(T.surface),
  "bg.subtle": pair(T.surface2),
  "border.line": pair(T.line),
  "fg.default": pair(T.text),
  "fg.muted": pair(T.muted),
  accent: pair(T.accent),
  "accent.fg": pair(T.accentFg),
  "accent.soft": pair(T.accentSoft),
  "accent.text": pair(T.accentText),
  warn: pair(T.warn),
  "warn.soft": pair(T.warnSoft),
  danger: pair(T.danger),
  "danger.soft": pair(T.dangerSoft),
  success: pair(T.success),
  "success.soft": pair(T.successSoft),
  overlay: pair(T.overlay),
  "pin.fg": pair(T.pinText),
  "map.land": pair(T.mapLand),
  "map.water": pair(T.mapWater),
  "map.green": pair(T.mapGreen),
  // Chakra's own names, so built-in components pick up the palette too.
  "chakra-body-bg": pair(T.bg),
  "chakra-body-text": pair(T.text),
  "chakra-border-color": pair(T.line),
  "chakra-subtle-bg": pair(T.surface2),
  "chakra-subtle-text": pair(T.muted),
  "chakra-placeholder-color": pair(T.muted),
};
DAY_COLORS_LIGHT.forEach((c, i) => {
  semanticColors[`day.${i + 1}`] = { default: c, _dark: DAY_COLORS_DARK[i] };
});

const shadows = {
  raised: "0 1px 2px rgba(20,30,28,.06), 0 10px 28px rgba(20,30,28,.07)",
  raisedDark: "0 1px 2px rgba(0,0,0,.4), 0 10px 28px rgba(0,0,0,.35)",
};

const theme = extendTheme({
  config,
  fonts: {
    heading: "'Fraunces', Georgia, serif",
    body: "'DM Sans', system-ui, -apple-system, sans-serif",
  },
  fontSizes: { xs: "12px", sm: "13px", md: "14px", lg: "15px", xl: "20px", "2xl": "24px", "3xl": "28px", "4xl": "36px", "5xl": "40px", "6xl": "64px" },
  radii: { sm: "6px", md: "10px", lg: "12px", xl: "14px", "2xl": "18px" },
  colors: {
    // Warm neutrals: legacy `gray.*` usages land on the new palette.
    gray: {
      50: "#F5F3EE",
      100: "#EEEBE3",
      200: "#E2DDD1",
      300: "#CEC7B7",
      400: "#9BAEAA",
      500: "#55625F",
      600: "#3E4A48",
      700: "#2B3B39",
      800: "#151E1D",
      900: "#0E1514",
    },
    brand: {
      50: "#EEF8F6",
      100: "#DCF0ED",
      200: "#86DCD1",
      300: "#4FBDB0",
      400: "#1F9A8F",
      500: "#0F766E",
      600: "#0C655E",
      700: "#0A544E",
      800: "#12332F",
      900: "#05201D",
    },
  },
  semanticTokens: {
    colors: semanticColors,
    shadows: {
      raised: { default: shadows.raised, _dark: shadows.raisedDark },
    },
  },
  styles: {
    global: {
      // Root stays 16px so Chakra spacing (rem) matches the design pixel-for-pixel; body text is 14px.
      html: { bg: "bg.canvas" },
      body: { bg: "bg.canvas", color: "fg.default", fontSize: "14px", lineHeight: 1.45 },
      "h1, h2, h3": { letterSpacing: "-0.01em" },
      "::placeholder": { color: "fg.muted", opacity: 1 },
      ".leaflet-container": { fontFamily: "'DM Sans', system-ui, sans-serif", bg: "map.land" },
    },
  },
  components: {
    Heading: {
      baseStyle: { fontFamily: "heading", fontWeight: 600, letterSpacing: "-0.01em", color: "fg.default" },
      sizes: {
        "2xl": { fontSize: "64px", lineHeight: 1.05 },
        xl: { fontSize: "40px", lineHeight: 1.1 },
        lg: { fontSize: "28px", lineHeight: 1.15 },
        md: { fontSize: "20px", lineHeight: 1.25 },
        sm: { fontSize: "18px", lineHeight: 1.3 },
        xs: { fontSize: "15px", lineHeight: 1.35 },
      },
    },
    Text: { baseStyle: { fontSize: "inherit" } },
    Button: {
      baseStyle: { fontWeight: 600, borderRadius: "md", fontFamily: "body", _focusVisible: { boxShadow: "0 0 0 3px var(--chakra-colors-accent-soft)" } },
      sizes: {
        xs: { h: "26px", minW: "26px", fontSize: "12px", px: 2.5, borderRadius: "8px" },
        sm: { h: "32px", minW: "32px", fontSize: "13px", px: 3, borderRadius: "md" },
        md: { h: "36px", minW: "36px", fontSize: "13px", px: "14px", borderRadius: "md" },
        lg: { h: "44px", minW: "44px", fontSize: "14px", px: 5, borderRadius: "lg" },
        xl: { h: "52px", minW: "52px", fontSize: "15px", px: "26px", borderRadius: "xl" },
      },
      variants: {
        // Primary: brand fill (any colorScheme="brand" solid button).
        solid: (p: StyleFunctionProps) => {
          if (p.colorScheme === "brand" || p.colorScheme === "teal") {
            return {
              bg: "accent",
              color: "accent.fg",
              _hover: { bg: "accent", filter: "brightness(1.08)", _disabled: { bg: "accent" } },
              _active: { filter: "brightness(.95)" },
            };
          }
          if (p.colorScheme === "gray") {
            return { bg: "bg.subtle", color: "fg.default", _hover: { bg: "border.line" } };
          }
          if (p.colorScheme === "red") {
            return { bg: "danger", color: "bg.surface", _hover: { filter: "brightness(1.08)" } };
          }
          return {};
        },
        // Secondary: surface + line border.
        outline: (p: StyleFunctionProps) => ({
          bg: "bg.surface",
          borderWidth: "1px",
          borderColor: "border.line",
          color: p.colorScheme === "red" ? "danger" : "fg.default",
          _hover: { bg: "bg.subtle" },
          _active: { bg: "bg.subtle" },
        }),
        ghost: (p: StyleFunctionProps) => ({
          color: p.colorScheme === "red" ? "danger" : p.colorScheme === "brand" ? "accent.text" : "fg.default",
          _hover: { bg: "bg.subtle" },
          _active: { bg: "bg.subtle" },
        }),
        // AI actions: soft accent.
        ai: { bg: "accent.soft", color: "accent.text", _hover: { filter: "brightness(.97)" } },
        danger: { bg: "bg.surface", borderWidth: "1px", borderColor: "border.line", color: "danger", _hover: { bg: "danger.soft" } },
        link: { color: "accent.text", fontWeight: 600 },
      },
      defaultProps: { colorScheme: "brand", size: "md" },
    },
    IconButton: { defaultProps: { variant: "outline" } },
    Input: {
      variants: {
        outline: {
          field: {
            bg: "bg.surface",
            borderColor: "border.line",
            borderRadius: "md",
            color: "fg.default",
            _hover: { borderColor: "gray.300", _dark: { borderColor: "gray.600" } },
            _focusVisible: { borderColor: "accent", boxShadow: "0 0 0 1px var(--chakra-colors-accent)" },
          },
          addon: { bg: "bg.subtle", borderColor: "border.line" },
        },
      },
      sizes: { md: { field: { h: "40px", fontSize: "14px", borderRadius: "md" } }, lg: { field: { h: "48px", fontSize: "15px", borderRadius: "lg" } } },
      defaultProps: { focusBorderColor: "accent" },
    },
    NumberInput: {
      variants: { outline: { field: { bg: "bg.surface", borderColor: "border.line", borderRadius: "md" } } },
    },
    Select: {
      variants: { outline: { field: { bg: "bg.surface", borderColor: "border.line", borderRadius: "md" } } },
      sizes: { md: { field: { h: "40px", fontSize: "14px" } } },
    },
    Textarea: {
      variants: {
        outline: {
          bg: "bg.surface",
          borderColor: "border.line",
          borderRadius: "lg",
          _focusVisible: { borderColor: "accent", boxShadow: "0 0 0 1px var(--chakra-colors-accent)" },
        },
      },
    },
    FormLabel: { baseStyle: { fontSize: "12px", fontWeight: 600, color: "fg.muted", mb: 1.5 } },
    Tag: {
      baseStyle: { container: { borderRadius: "full", fontWeight: 600 } },
      variants: {
        subtle: (p: StyleFunctionProps) =>
          p.colorScheme === "brand" || p.colorScheme === "teal"
            ? { container: { bg: "accent.soft", color: "accent.text" } }
            : p.colorScheme === "orange" || p.colorScheme === "yellow"
              ? { container: { bg: "warn.soft", color: "warn" } }
              : p.colorScheme === "red"
                ? { container: { bg: "danger.soft", color: "danger" } }
                : p.colorScheme === "green"
                  ? { container: { bg: "success.soft", color: "success" } }
                  : p.colorScheme === "gray"
                    ? { container: { bg: "bg.subtle", color: "fg.muted" } }
                    : {},
        outline: { container: { boxShadow: "none", borderWidth: "1px", borderColor: "border.line", color: "fg.default", bg: "bg.surface" } },
      },
      defaultProps: { variant: "subtle", colorScheme: "gray" },
    },
    Badge: {
      baseStyle: { borderRadius: "full", textTransform: "none", fontWeight: 600, px: 2 },
      variants: {
        subtle: (p: StyleFunctionProps) =>
          p.colorScheme === "brand" || p.colorScheme === "teal"
            ? { bg: "accent.soft", color: "accent.text" }
            : p.colorScheme === "orange" || p.colorScheme === "yellow"
              ? { bg: "warn.soft", color: "warn" }
              : p.colorScheme === "red"
                ? { bg: "danger.soft", color: "danger" }
                : p.colorScheme === "green"
                  ? { bg: "success.soft", color: "success" }
                  : { bg: "bg.subtle", color: "fg.muted" },
      },
    },
    Card: {
      baseStyle: { container: { bg: "bg.surface", borderWidth: "1px", borderColor: "border.line", borderRadius: "xl", boxShadow: "none" } },
    },
    Tabs: {
      variants: {
        line: {
          tablist: { borderBottom: "1px solid", borderColor: "border.line", gap: "22px" },
          tab: {
            px: 1,
            h: "44px",
            fontWeight: 500,
            fontSize: "14px",
            color: "fg.muted",
            borderBottom: "2px solid",
            borderColor: "transparent",
            mb: "-1px",
            _selected: { color: "fg.default", borderColor: "accent", fontWeight: 600 },
          },
        },
      },
    },
    Modal: {
      baseStyle: {
        overlay: { bg: "overlay" },
        dialog: { bg: "bg.surface", borderRadius: "xl", boxShadow: "raised" },
        header: { fontFamily: "heading", fontWeight: 600, fontSize: "20px" },
      },
    },
    Drawer: {
      baseStyle: {
        overlay: { bg: "overlay" },
        dialog: { bg: "bg.surface" },
        header: { fontFamily: "heading", fontWeight: 600, fontSize: "20px" },
      },
    },
    Menu: {
      baseStyle: {
        list: { bg: "bg.surface", borderColor: "border.line", borderRadius: "lg", boxShadow: "raised", py: 1.5 },
        item: { bg: "bg.surface", fontSize: "14px", _hover: { bg: "bg.subtle" }, _focus: { bg: "bg.subtle" } },
      },
    },
    Popover: { baseStyle: { content: { bg: "bg.surface", borderColor: "border.line", borderRadius: "lg", boxShadow: "raised" } } },
    Tooltip: { baseStyle: { borderRadius: "md", fontSize: "12px", bg: "fg.default", color: "bg.surface" } },
    Alert: {
      variants: {
        subtle: (p: StyleFunctionProps) => {
          const map: Record<string, [string, string]> = {
            info: ["accent.soft", "accent.text"],
            warning: ["warn.soft", "warn"],
            error: ["danger.soft", "danger"],
            success: ["success.soft", "success"],
          };
          const [bg, fg] = map[p.status ?? "info"] ?? map.info;
          return { container: { bg, color: fg, borderRadius: "lg" }, icon: { color: fg } };
        },
      },
    },
    Divider: { baseStyle: { borderColor: "border.line", opacity: 1 } },
    Checkbox: { defaultProps: { colorScheme: "brand" } },
    Switch: { defaultProps: { colorScheme: "brand" } },
    Radio: { defaultProps: { colorScheme: "brand" } },
    Progress: {
      baseStyle: { track: { bg: "bg.subtle", borderRadius: "full" }, filledTrack: { bg: "accent" } },
    },
    Skeleton: { baseStyle: { borderRadius: "md" } },
  },
});

export default theme;
