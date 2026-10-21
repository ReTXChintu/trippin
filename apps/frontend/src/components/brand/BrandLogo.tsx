import { Box, HStack, Text } from "@chakra-ui/react";

/**
 * The Trippin' mark, built the way every app in the suite builds its mark (design system §7.16,
 * §10): a 28-unit square, rx 8, filled with the app accent, and a 2.2-stroke round-cap glyph in
 * `acTx`. Trippin's glyph is a route line ending in a pin. It switches with the colour mode.
 * The illustrated `logo.png` stays the launcher / favicon / PWA artwork (`public/`).
 */

export const BRAND_NAME = "Trippin'";

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <Box as="span" display="inline-flex" w={`${size}px`} h={`${size}px`} flexShrink={0} color="ac" aria-hidden>
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="28" height="28" rx="8" fill="currentColor" />
        <g stroke="var(--chakra-colors-acTx)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {/* the route: from bottom-left, a dashed-feel bend up to the pin */}
          <path d="M6.5 21.5c2.6 0 3.4-1.6 5-3.4 1.4-1.6 2.6-2.4 4.6-2.4" />
          {/* the pin */}
          <path d="M19.5 15.6c-2.1-2.2-3.2-4-3.2-5.6a3.2 3.2 0 0 1 6.4 0c0 1.6-1.1 3.4-3.2 5.6Z" />
        </g>
        <circle cx="19.5" cy="10" r="1.1" fill="var(--chakra-colors-acTx)" />
      </svg>
    </Box>
  );
}

/** Mark + 18/700 wordmark, gap 10. */
export function BrandLogo({ size = 28, fontSize = "18px" }: { size?: number; fontSize?: string }) {
  return (
    <HStack spacing="10px">
      <BrandMark size={size} />
      <Text fontWeight={700} fontSize={fontSize} letterSpacing="-0.01em" lineHeight={1} color="tx">
        {BRAND_NAME}
      </Text>
    </HStack>
  );
}
