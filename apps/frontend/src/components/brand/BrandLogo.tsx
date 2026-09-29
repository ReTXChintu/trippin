import { Box, Flex, HStack, Text } from "@chakra-ui/react";

/** The one place the Trippin logo is defined — swap `BrandMark`'s contents when the final logo
 * arrives and every screen (sidebar, rail, auth, landing, share page) picks it up. */

export const BRAND_NAME = "Trippin";

export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      borderRadius={`${Math.round(size * 0.27)}px`}
      bg="accent"
      color="accent.fg"
      align="center"
      justify="center"
      flexShrink={0}
      aria-hidden
    >
      <svg width={size * 0.53} height={size * 0.53} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5l-2 5-5 2 2-5z" />
      </svg>
    </Flex>
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
