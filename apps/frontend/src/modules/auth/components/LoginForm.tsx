import { Button, Link, Stack, Text } from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FiArrowRight, FiMail } from "react-icons/fi";
import { LuKeyRound } from "react-icons/lu";
import { loginSchema, type LoginInput } from "@/modules/auth/validators/auth.validator";
import { useLogin } from "@/modules/auth/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api";
import { IconInput } from "@/components/ui/app";
import { AuthField, AuthIntro, AuthNotice } from "./AuthIntro";
import { authLinkProps, callbackQuery, isInviteCallback, useCallbackUrl } from "./auth-callback";

export function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const callback = useCallbackUrl();
  const callbackUrl = callback ?? "/dashboard";
  const invited = isInviteCallback(callback);
  const [error, setError] = useState<string | null>(null);
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    try {
      await login.mutateAsync(data);
      navigate(callbackUrl);
    } catch (err) {
      setError(getApiErrorMessage(err, "Invalid email or password"));
    }
  };

  const notice = error ? (
    <AuthNotice tone="danger">{error}</AuthNotice>
  ) : searchParams.get("registered") ? (
    <AuthNotice tone="success">Account created — log in to continue.</AuthNotice>
  ) : searchParams.get("reset") ? (
    <AuthNotice tone="success">Password updated — log in with your new password.</AuthNotice>
  ) : null;

  return (
    <Stack spacing="20px">
      <AuthIntro title="Welcome back" subtitle="Log in to continue planning." mode="login" notice={notice} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing="20px">
          <AuthField label="Email" error={errors.email?.message}>
            <IconInput icon={FiMail} type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
          </AuthField>

          <AuthField
            label="Password"
            error={errors.password?.message}
            labelAction={
              <Link as={RouterLink} to="/forgot-password" fontSize="12px" {...authLinkProps}>
                Forgot password?
              </Link>
            }
          >
            <IconInput icon={LuKeyRound} type="password" autoComplete="current-password" placeholder="Your password" {...register("password")} />
          </AuthField>

          <Button type="submit" size="xl" w="full" leftIcon={<FiArrowRight />} isLoading={login.isPending}>
            {invited ? "Log in and join trip" : "Log in"}
          </Button>
        </Stack>
      </form>

      <Text fontSize="12px" color="fg.muted">
        New here?{" "}
        <Link as={RouterLink} to={`/register${callbackQuery(callback)}`} {...authLinkProps}>
          Create an account
        </Link>
      </Text>
    </Stack>
  );
}
