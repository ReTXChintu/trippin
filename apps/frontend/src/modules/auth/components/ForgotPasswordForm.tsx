import { Box, Button, Link, Stack, Text } from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link as RouterLink } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FiArrowLeft, FiMail, FiSend } from "react-icons/fi";
import { useForgotPassword } from "@/modules/auth/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/modules/auth/validators/auth.validator";
import { IconInput } from "@/components/ui/app";
import { AuthField, AuthIntro, AuthNotice } from "./AuthIntro";
import { authLinkProps } from "./auth-callback";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const forgotPassword = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setError(null);
    setSuccess(null);
    setDevResetUrl(null);

    try {
      const result = await forgotPassword.mutateAsync(data.email);
      setSuccess(result.message ?? "Check your email for a reset link.");
      if (result.resetUrl) setDevResetUrl(result.resetUrl);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const notice = (
    <>
      {error && <AuthNotice tone="danger">{error}</AuthNotice>}
      {success && <AuthNotice tone="success">{success}</AuthNotice>}
      {devResetUrl && (
        <AuthNotice tone="accent">
          <Box>
            <Text fontWeight={600}>Dev reset link:</Text>
            <Link href={devResetUrl} wordBreak="break-all" textDecoration="underline">
              {devResetUrl}
            </Link>
          </Box>
        </AuthNotice>
      )}
    </>
  );

  return (
    <Stack spacing="20px">
      <AuthIntro title="Forgot password" subtitle="Enter your email and we’ll send you a reset link." notice={notice} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing="20px">
          <AuthField label="Email" error={errors.email?.message}>
            <IconInput icon={FiMail} type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
          </AuthField>

          <Button type="submit" size="xl" w="full" leftIcon={<FiSend />} isLoading={forgotPassword.isPending}>
            Send reset link
          </Button>
        </Stack>
      </form>

      <Link as={RouterLink} to="/login" fontSize="12px" display="inline-flex" alignItems="center" gap={1.5} alignSelf="flex-start" {...authLinkProps}>
        <FiArrowLeft /> Back to log in
      </Link>
    </Stack>
  );
}
