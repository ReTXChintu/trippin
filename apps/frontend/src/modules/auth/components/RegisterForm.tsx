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
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRegister } from "@/modules/auth/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/api";
import { registerSchema, type RegisterInput } from "@/modules/auth/validators/auth.validator";

export function RegisterForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const register_ = useRegister();

  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

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
      navigate("/login?registered=true");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Box w="full" maxW="md" p={8} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl" shadow="sm">
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Heading size="lg" mb={2}>
            Create account
          </Heading>
          <Text color="gray.500">Start planning smarter trips today</Text>
        </Box>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={4}>
            <FormControl isInvalid={!!errors.name}>
              <FormLabel>Full Name</FormLabel>
              <Input placeholder="Your name" {...register("name")} />
              <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.email}>
              <FormLabel>Email</FormLabel>
              <Input type="email" placeholder="you@example.com" {...register("email")} />
              <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.password}>
              <FormLabel>Password</FormLabel>
              <Input type="password" placeholder="••••••••" {...register("password")} />
              <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.confirmPassword}>
              <FormLabel>Confirm Password</FormLabel>
              <Input type="password" placeholder="••••••••" {...register("confirmPassword")} />
              <FormErrorMessage>{errors.confirmPassword?.message}</FormErrorMessage>
            </FormControl>

            <Button type="submit" colorScheme="brand" size="lg" isLoading={register_.isPending}>
              Create Account
            </Button>
          </Stack>
        </form>

        <Text textAlign="center" fontSize="sm" color="gray.500">
          Already have an account?{" "}
          <Link as={RouterLink} to="/login" color="brand.500" fontWeight="medium">
            Sign in
          </Link>
        </Text>
      </VStack>
    </Box>
  );
}
