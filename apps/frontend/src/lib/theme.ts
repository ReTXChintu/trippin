import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "system",
  useSystemColorMode: true,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: "var(--font-geist-sans), system-ui, sans-serif",
    body: "var(--font-geist-sans), system-ui, sans-serif",
  },
  colors: {
    brand: {
      50: "#e6f7f5",
      100: "#b3e8e2",
      200: "#80d9cf",
      300: "#4dcabc",
      400: "#26bfa9",
      500: "#0d9488",
      600: "#0b7a70",
      700: "#086058",
      800: "#064640",
      900: "#032c28",
    },
    accent: {
      50: "#fff7ed",
      100: "#ffedd5",
      200: "#fed7aa",
      300: "#fdba74",
      400: "#fb923c",
      500: "#f97316",
      600: "#ea580c",
      700: "#c2410c",
      800: "#9a3412",
      900: "#7c2d12",
    },
  },
  styles: {
    global: {
      body: {
        bg: "gray.50",
        color: "gray.800",
        _dark: {
          bg: "gray.900",
          color: "gray.100",
        },
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: "brand",
      },
    },
  },
});

export default theme;
