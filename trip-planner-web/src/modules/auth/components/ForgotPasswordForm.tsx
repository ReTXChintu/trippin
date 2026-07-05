"use client";

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
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import NextLink from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { forgotPasswordAction } from "@/modules/auth/actions/auth.actions";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/modules/auth/validators/auth.validator";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setDevResetUrl(null);

    const formData = new FormData();
    formData.append("email", data.email);

    const result = await forgotPasswordAction(formData);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSuccess(result.message ?? "Check your email for a reset link.");
    if (result.data?.resetUrl) {
      setDevResetUrl(result.data.resetUrl);
    }
  };

  return (
    <Box
      w="full"
      maxW="md"
      p={8}
      bg={bg}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="xl"
      shadow="sm"
    >
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Heading size="lg" mb={2}>
            Forgot password
          </Heading>
          <Text color="gray.500">
            Enter your email and we&apos;ll send you a reset link
          </Text>
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

            <Button type="submit" colorScheme="brand" size="lg" isLoading={isLoading}>
              Send Reset Link
            </Button>
          </Stack>
        </form>

        <Text textAlign="center" fontSize="sm" color="gray.500">
          <Link as={NextLink} href="/login" color="brand.500" fontWeight="medium">
            Back to sign in
          </Link>
        </Text>
      </VStack>
    </Box>
  );
}
