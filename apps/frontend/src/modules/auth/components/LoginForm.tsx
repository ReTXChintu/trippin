import { Button, Flex, Icon, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiInfo, FiLogIn } from "react-icons/fi";
import { signInUrl } from "@/modules/auth/api/auth.api";
import { AuthIntro, AuthNotice } from "./AuthIntro";
import { isInviteCallback, useCallbackUrl } from "./auth-callback";

/** Why the sign-in round trip came back without a session (`?error=` from the backend). */
const SIGN_IN_ERRORS: Record<string, string> = {
  cancelled: "Sign-in was cancelled.",
  expired: "The sign-in took too long. Please try again.",
  state: "That sign-in couldn’t be verified. Please try again.",
  nonce: "That sign-in couldn’t be verified. Please try again.",
  email_unverified: "A Trippin account already uses this email. Verify your email address in your account, then sign in again.",
  account_conflict: "This email belongs to a Trippin account that’s linked to a different sign-in.",
  missing_email: "Your account has no email address, and Trippin needs one.",
  unavailable: "The sign-in service can’t be reached right now. Try again in a moment.",
  not_configured: "Sign-in isn’t set up on this server yet.",
};

export function LoginForm() {
  const [searchParams] = useSearchParams();
  const callback = useCallbackUrl();
  const invited = isInviteCallback(callback);
  const [leaving, setLeaving] = useState(false);
  const errorCode = searchParams.get("error");
  const error = errorCode ? (SIGN_IN_ERRORS[errorCode] ?? "Sign-in failed. Please try again.") : null;

  // Coming back with the browser's Back button restores this page as it was — spinner and all.
  useEffect(() => {
    const reset = () => setLeaving(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  return (
    <Stack spacing={5}>
      <AuthIntro
        title="Welcome to Trippin"
        subtitle="One account for Trippin, SpendLog and InFrame."
        notice={error ? <AuthNotice tone="danger">{error}</AuthNotice> : null}
      />

      <Button
        as="a"
        href={signInUrl(callback)}
        size="xl"
        w="full"
        leftIcon={<FiLogIn size={18} />}
        isLoading={leaving}
        loadingText="Signing in…"
        onClick={() => setLeaving(true)}
      >
        {invited ? "Sign in and join the trip" : "Sign in with your account"}
      </Button>

      <Flex gap="10px" px="14px" py={3} borderRadius="lg" bg="sunk" color="tx2" fontSize="13px" lineHeight="18px">
        <Icon as={FiInfo} boxSize="18px" flexShrink={0} mt="1px" />
        <Text>New here? The same button creates your account — you’ll come straight back to Trippin.</Text>
      </Flex>
    </Stack>
  );
}
