import { Button, Link, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FiArrowRight, FiLock, FiMail, FiUser } from "react-icons/fi";
import { LuKeyRound } from "react-icons/lu";
import { useRegister } from "@/modules/auth/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api";
import { registerSchema, type RegisterInput } from "@/modules/auth/validators/auth.validator";
import { IconInput } from "@/components/ui/app";
import { AuthField, AuthIntro, AuthNotice } from "./AuthIntro";
import { authLinkProps, callbackQuery, useCallbackUrl } from "./auth-callback";

export function RegisterForm() {
  const navigate = useNavigate();
  const callbackUrl = useCallbackUrl();
  const [error, setError] = useState<string | null>(null);
  const register_ = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    try {
      await register_.mutateAsync(data);
      navigate(`/login?registered=true${callbackQuery(callbackUrl, "&")}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Stack spacing="20px">
      <AuthIntro
        title="Create your account"
        subtitle="Free to start. AI is optional."
        mode="register"
        notice={error ? <AuthNotice tone="danger">{error}</AuthNotice> : null}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing="16px">
          <AuthField label="Name" error={errors.name?.message}>
            <IconInput icon={FiUser} autoComplete="name" placeholder="Your name" {...register("name")} />
          </AuthField>

          <AuthField label="Email" error={errors.email?.message}>
            <IconInput icon={FiMail} type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
          </AuthField>

          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing="16px">
            <AuthField label="Password" error={errors.password?.message}>
              <IconInput icon={LuKeyRound} type="password" autoComplete="new-password" placeholder="8+ characters" {...register("password")} />
            </AuthField>
            <AuthField label="Confirm password" error={errors.confirmPassword?.message}>
              <IconInput icon={FiLock} type="password" autoComplete="new-password" placeholder="Same again" {...register("confirmPassword")} />
            </AuthField>
          </SimpleGrid>
          <Text fontSize="12px" color="fg.muted" mt={-1}>
            At least 8 characters, with an uppercase letter and a number.
          </Text>

          <Button type="submit" size="xl" w="full" mt={1} leftIcon={<FiArrowRight />} isLoading={register_.isPending}>
            Create account
          </Button>
        </Stack>
      </form>

      <Text fontSize="12px" color="fg.muted">
        Already have an account?{" "}
        <Link as={RouterLink} to={`/login${callbackQuery(callbackUrl)}`} {...authLinkProps}>
          Log in
        </Link>
      </Text>
    </Stack>
  );
}
