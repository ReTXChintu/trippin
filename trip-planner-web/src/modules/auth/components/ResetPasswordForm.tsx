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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { resetPasswordAction } from "@/modules/auth/actions/auth.actions";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/modules/auth/validators/auth.validator";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("token", data.token);
    formData.append("password", data.password);
    formData.append("confirmPassword", data.confirmPassword);

    const result = await resetPasswordAction(formData);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push("/login?reset=true");
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
            Reset password
          </Heading>
          <Text color="gray.500">Enter your new password below</Text>
        </Box>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={4}>
            <input type="hidden" {...register("token")} />

            <FormControl isInvalid={!!errors.password}>
              <FormLabel>New Password</FormLabel>
              <Input type="password" placeholder="••••••••" {...register("password")} />
              <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.confirmPassword}>
              <FormLabel>Confirm Password</FormLabel>
              <Input type="password" placeholder="••••••••" {...register("confirmPassword")} />
              <FormErrorMessage>{errors.confirmPassword?.message}</FormErrorMessage>
            </FormControl>

            <Button type="submit" colorScheme="brand" size="lg" isLoading={isLoading}>
              Update Password
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
