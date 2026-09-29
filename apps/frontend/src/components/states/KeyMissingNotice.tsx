import { Box, type BoxProps, Button, Flex, HStack, Icon, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { FiArrowRight, FiMapPin } from "react-icons/fi";
import { LuSparkles } from "react-icons/lu";

type KeyKind = "ai" | "maps";

const COPY: Record<KeyKind, { banner: string; ownerOnly: string; icon: typeof FiMapPin }> = {
  ai: {
    banner: "AI key missing — AI features are off.",
    ownerOnly: "AI features are off until the trip owner adds an OpenAI or Gemini key.",
    icon: LuSparkles,
  },
  maps: {
    banner: "Google Maps key missing — place search is limited.",
    ownerOnly: "Place search is limited until the trip owner adds a Google Maps key.",
    icon: FiMapPin,
  },
};

/**
 * Tells the user a feature needs an API key. `banner` = slim warn strip with "Add in Profile";
 * `card` = explains one feature (`feature` title + `text`) with a "Set up … in Profile" button.
 * Pass `canFix={false}` for members who aren't the owner (no Profile link — only the owner can add it).
 */
export function KeyMissingNotice({
  kind = "ai",
  variant = "banner",
  canFix = true,
  feature,
  text,
  ...rest
}: {
  kind?: KeyKind;
  variant?: "banner" | "card";
  canFix?: boolean;
  feature?: string;
  text?: string;
} & BoxProps) {
  const copy = COPY[kind];

  if (variant === "card") {
    return (
      <Box bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl" p={3} {...rest}>
        <HStack spacing="6px" fontSize="13px" fontWeight={600}>
          <Icon as={copy.icon} boxSize="14px" />
          <Text>{feature ?? (kind === "ai" ? "AI features" : "Place search")}</Text>
        </HStack>
        <Text fontSize="12px" color="fg.muted" mt={1} mb={canFix ? 2 : 0}>
          {canFix ? (text ?? (kind === "ai" ? "Needs an AI key. Everything else works." : "Needs a Google Maps key.")) : copy.ownerOnly}
        </Text>
        {canFix && (
          <Button as={RouterLink} to="/profile" variant="ai" w="full" leftIcon={<FiArrowRight />}>
            {kind === "ai" ? "Set up AI in Profile" : "Add Maps key in Profile"}
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Flex role="note" align="center" gap="10px" px="14px" py="10px" bg="warn.soft" color="warn" borderRadius="md" {...rest}>
      <Icon as={copy.icon} boxSize="16px" flexShrink={0} />
      <Text flex={1} fontSize="12px" fontWeight={600} minW={0}>
        {canFix ? copy.banner : copy.ownerOnly}
      </Text>
      {canFix && (
        <Text as={RouterLink} to="/profile" fontSize="12px" fontWeight={600} textDecoration="underline" flexShrink={0}>
          Add in Profile
        </Text>
      )}
    </Flex>
  );
}
