import { Box, Flex, FormControl, FormErrorMessage, FormLabel, Heading, Link, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { FiMap } from "react-icons/fi";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { callbackQuery, isInviteCallback, useCallbackUrl } from "./auth-callback";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Banner, PhotoFallback, Segmented } from "@/components/ui";

/** Logo, the "you were invited" note, title and the Log in / Create account switch. */
export function AuthIntro({
  title,
  subtitle,
  mode,
  notice,
}: {
  title: string;
  subtitle: string;
  /** Shows the Log in / Create account switch on those two screens. */
  mode?: "login" | "register";
  notice?: ReactNode;
}) {
  const navigate = useNavigate();
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
              {mode === "register"
                ? "Create an account, then log in to join — you’ll come straight back."
                : "Log in or create an account to join — you’ll come straight back."}
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

      {mode && (
        <Segmented
          alignSelf="flex-start"
          value={mode}
          options={[
            { value: "login", label: "Log in" },
            { value: "register", label: "Create account" },
          ]}
          onChange={(v) => navigate(`/${v}${callbackQuery(callbackUrl)}`)}
        />
      )}
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

/** Label + input + error, with the label row able to carry a link (Forgot password?). */
export function AuthField({
  label,
  error,
  labelAction,
  children,
}: {
  label: string;
  error?: string;
  labelAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <FormControl isInvalid={!!error}>
      <Flex justify="space-between" align="baseline">
        <FormLabel>{label}</FormLabel>
        {labelAction}
      </Flex>
      {children}
      <FormErrorMessage>{error}</FormErrorMessage>
    </FormControl>
  );
}


