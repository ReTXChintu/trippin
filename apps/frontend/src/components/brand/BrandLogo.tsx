import { Box, HStack, Image, Text } from "@chakra-ui/react";

/** The one place the Trippin' logo is used — every screen (sidebar, rail, auth, landing, share page)
 * renders `BrandMark` / `BrandLogo`. Source artwork: `logo.png` at the repo root; the web copies in
 * `public/brand/` (and the favicon / PWA icons) are generated from it with transparent corners. */

export const BRAND_NAME = "Trippin'";

export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <Image
      src={size > 48 ? "/brand/logo-256.png" : "/brand/logo-64.png"}
      srcSet={size > 48 ? undefined : "/brand/logo-64.png 1x, /brand/logo-256.png 3x"}
      alt=""
      w={`${size}px`}
      h={`${size}px`}
      flexShrink={0}
      draggable={false}
    />
  );
}

export function BrandLogo({ size = 34, fontSize = "20px" }: { size?: number; fontSize?: string }) {
  return (
    <HStack spacing={2.5}>
      <BrandMark size={size} />
      <Box>
        <Text fontFamily="heading" fontWeight={600} fontSize={fontSize} letterSpacing="-0.01em" lineHeight={1}>
          {BRAND_NAME}
        </Text>
      </Box>
    </HStack>
  );
}
