import { Box, Flex, Heading, Link, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { FiMap } from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import { isInviteCallback, useCallbackUrl } from "./auth-callback";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Banner, PhotoFallback } from "@/components/ui";

/** Logo, the "you were invited" note and the title. */
export function AuthIntro({ title, subtitle, notice }: { title: string; subtitle: string; notice?: ReactNode }) {
  const callbackUrl = useCallbackUrl();
  const invited = isInviteCallback(callbackUrl);

  return (
    <Stack spacing="20px">
      <Link as={RouterLink} to="/" alignSelf="flex-start" _hover={{ textDecoration: "none" }}>
        <BrandLogo />
      </Link>

      {invited && (
        <Flex align="center" gap={3} p={3} borderRadius="xl" bg="accent.soft">
          <PhotoFallback seed="invite" icon={FiMap} iconSize={22} w="52px" h="52px" borderRadius="10px" flexShrink={0} />
          <Box minW={0}>
            <Text fontWeight={600}>You&rsquo;ve been invited to a trip</Text>
            <Text fontSize="12px" color="accent.text">
              Sign in to join — you’ll come straight back.
            </Text>
          </Box>
        </Flex>
      )}

      {notice}

      <Box>
        <Heading as="h1" fontSize={{ base: "30px", md: "36px" }} lineHeight={1.15}>
          {title}
        </Heading>
        <Text color="fg.muted" mt={1}>
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
