import { Box, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { FiMap } from "react-icons/fi";
import { isInviteCallback, useCallbackUrl } from "./auth-callback";
import { Banner, PhotoFallback } from "@/components/ui";

/** The "you were invited" note and the auth card's title (22/28) and lede (15/22). The logo lives
 * in the brand panel next to the card. */
export function AuthIntro({ title, subtitle, notice }: { title: string; subtitle: string; notice?: ReactNode }) {
  const callbackUrl = useCallbackUrl();
  const invited = isInviteCallback(callbackUrl);

  return (
    <Stack spacing={5}>
      {invited && (
        <Flex align="center" gap={3} px="14px" py={3} borderRadius="lg" bg="acSoft">
          <PhotoFallback seed="invite" icon={FiMap} iconSize={20} w="40px" h="40px" borderRadius="md" flexShrink={0} />
          <Box minW={0}>
            <Text fontWeight={500} fontSize="14px" lineHeight="20px">
              You&rsquo;ve been invited to a trip
            </Text>
            <Text fontSize="12px" lineHeight="16px" color="tx2">
              Sign in to join — you’ll come straight back.
            </Text>
          </Box>
        </Flex>
      )}

      {notice}

      <Box>
        <Heading as="h1" fontSize="22px" lineHeight="28px">
          {title}
        </Heading>
        <Text color="tx2" fontSize="15px" lineHeight="22px" mt={2}>
          {subtitle}
        </Text>
      </Box>
    </Stack>
  );
}

export function AuthNotice({ tone, children }: { tone: "success" | "danger" | "accent"; children: ReactNode }) {
  return (
    <Banner tone={tone} role={tone === "danger" ? "alert" : "status"}>
      {children}
    </Banner>
  );
}
