import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Input,
  Link,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link as RouterLink } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useForgotPassword } from "@/modules/auth/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/modules/auth/validators/auth.validator";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const forgotPassword = useForgotPassword();

  const bg = "bg.surface";
  const borderColor = "border.line";

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

  return (
    <Box w="full" maxW="md" p={8} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl" shadow="sm">
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Heading size="lg" mb={2}>
            Forgot password
          </Heading>
          <Text color="fg.muted">Enter your email and we&apos;ll send you a reset link</Text>
        </Box>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {success && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            {success}
          </Alert>
        )}

        {devResetUrl && (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Box>
              <Text fontSize="sm" fontWeight="medium">
                Dev reset link:
              </Text>
              <Link href={devResetUrl} fontSize="sm" wordBreak="break-all">
                {devResetUrl}
              </Link>
            </Box>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={4}>
            <FormControl isInvalid={!!errors.email}>
              <FormLabel>Email</FormLabel>
              <Input type="email" placeholder="you@example.com" {...register("email")} />
              <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
            </FormControl>

            <Button type="submit" colorScheme="brand" size="lg" isLoading={forgotPassword.isPending}>
              Send Reset Link
            </Button>
          </Stack>
        </form>

        <Text textAlign="center" fontSize="sm" color="fg.muted">
          <Link as={RouterLink} to="/login" color="brand.500" fontWeight="medium">
            Back to sign in
          </Link>
        </Text>
      </VStack>
    </Box>
  );
}
