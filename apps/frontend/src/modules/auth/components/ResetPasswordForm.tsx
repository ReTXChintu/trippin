import { Button, Link, Stack, Text } from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FiArrowLeft, FiCheck, FiLock } from "react-icons/fi";
import { LuKeyRound } from "react-icons/lu";
import { useResetPassword } from "@/modules/auth/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api";
import { resetPasswordSchema, type ResetPasswordInput } from "@/modules/auth/validators/auth.validator";
import { IconInput } from "@/components/ui/app";
import { AuthField, AuthIntro, AuthNotice } from "./AuthIntro";
import { authLinkProps } from "./auth-callback";

export function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setError(null);
    try {
      await resetPassword.mutateAsync(data);
      navigate("/login?reset=true");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const notice = error ? (
    <AuthNotice tone="danger">{error}</AuthNotice>
  ) : !token ? (
    <AuthNotice tone="danger">This reset link is missing its token — open the link from your email again.</AuthNotice>
  ) : null;

  return (
    <Stack spacing="20px">
      <AuthIntro title="Set a new password" subtitle="Choose a new password for your account." notice={notice} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing="16px">
          <input type="hidden" {...register("token")} />

          <AuthField label="New password" error={errors.password?.message}>
            <IconInput icon={LuKeyRound} type="password" autoComplete="new-password" placeholder="8+ characters" {...register("password")} />
          </AuthField>

          <AuthField label="Confirm password" error={errors.confirmPassword?.message}>
            <IconInput icon={FiLock} type="password" autoComplete="new-password" placeholder="Same again" {...register("confirmPassword")} />
          </AuthField>
          <Text fontSize="12px" color="fg.muted" mt={-1}>
            At least 8 characters, with an uppercase letter and a number.
          </Text>

          <Button type="submit" size="xl" w="full" mt={1} leftIcon={<FiCheck />} isLoading={resetPassword.isPending}>
            Update password
          </Button>
        </Stack>
      </form>

      <Link as={RouterLink} to="/login" fontSize="12px" display="inline-flex" alignItems="center" gap={1.5} alignSelf="flex-start" {...authLinkProps}>
        <FiArrowLeft /> Back to log in
      </Link>
    </Stack>
  );
}
