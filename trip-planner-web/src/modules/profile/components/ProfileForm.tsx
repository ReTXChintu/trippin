"use client";

import {
  Avatar,
  Box,
  Button,
  Divider,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  Link,
  Stack,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  getProfileAction,
  updateApiKeysAction,
  updateProfileAction,
} from "@/modules/auth/actions/auth.actions";
import {
  apiKeysSchema,
  profileSchema,
  type ApiKeysInput,
  type ProfileInput,
} from "@/modules/auth/validators/auth.validator";

export function ProfileForm() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isKeysLoading, setIsKeysLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [hasGoogleMapsKey, setHasGoogleMapsKey] = useState(false);
  const [openaiLast4, setOpenaiLast4] = useState<string>();
  const [googleLast4, setGoogleLast4] = useState<string>();

  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
  });

  const {
    register: registerKeys,
    handleSubmit: handleKeysSubmit,
    reset: resetKeys,
    formState: { errors: keyErrors },
  } = useForm<ApiKeysInput>({
    resolver: zodResolver(apiKeysSchema),
    defaultValues: {
      openaiApiKey: "",
      googleMapsApiKey: "",
      clearOpenai: false,
      clearGoogleMaps: false,
    },
  });

  const avatarUrl = watch("avatar");

  useEffect(() => {
    async function loadProfile() {
      const profile = await getProfileAction();
      if (profile) {
        reset({
          name: profile.name,
          avatar: profile.avatar ?? "",
        });
        setHasOpenaiKey(profile.hasOpenaiKey);
        setHasGoogleMapsKey(profile.hasGoogleMapsKey);
        setOpenaiLast4(profile.openaiApiKeyLast4);
        setGoogleLast4(profile.googleMapsApiKeyLast4);
      }
      setIsFetching(false);
    }
    loadProfile();
  }, [reset]);

  const onSubmit = async (data: ProfileInput) => {
    setIsLoading(true);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("avatar", data.avatar ?? "");

    const result = await updateProfileAction(formData);
    setIsLoading(false);

    if (!result.success) {
      toast({ title: result.error, status: "error", duration: 4000 });
      return;
    }

    await update({ name: data.name, avatar: data.avatar || undefined });
    toast({ title: "Profile updated", status: "success", duration: 3000 });
    router.refresh();
  };

  const onKeysSubmit = async (data: ApiKeysInput) => {
    setIsKeysLoading(true);
    const result = await updateApiKeysAction(data);
    setIsKeysLoading(false);

    if (!result.success) {
      toast({ title: result.error, status: "error", duration: 4000 });
      return;
    }

    const profile = await getProfileAction();
    if (profile) {
      setHasOpenaiKey(profile.hasOpenaiKey);
      setHasGoogleMapsKey(profile.hasGoogleMapsKey);
      setOpenaiLast4(profile.openaiApiKeyLast4);
      setGoogleLast4(profile.googleMapsApiKeyLast4);
    }
    resetKeys({
      openaiApiKey: "",
      googleMapsApiKey: "",
      clearOpenai: false,
      clearGoogleMaps: false,
    });
    toast({ title: "API keys updated", status: "success", duration: 3000 });
    router.refresh();
  };

  if (isFetching) {
    return null;
  }

  return (
    <VStack spacing={6} align="stretch" maxW="lg">
      <Box
        p={6}
        bg={bg}
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="xl"
      >
        <VStack spacing={6} align="stretch">
          <Box>
            <Heading size="md" mb={1}>
              Profile Settings
            </Heading>
            <Text color="gray.500" fontSize="sm">
              {session?.user?.email}
            </Text>
          </Box>

          <Stack direction="row" align="center" spacing={4}>
            <Avatar
              size="lg"
              name={watch("name") || session?.user?.name || "User"}
              src={avatarUrl || session?.user?.avatar || undefined}
            />
          </Stack>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={4}>
              <FormControl isInvalid={!!errors.name}>
                <FormLabel>Display Name</FormLabel>
                <Input {...register("name")} />
                <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.avatar}>
                <FormLabel>Avatar URL</FormLabel>
                <Input placeholder="https://..." {...register("avatar")} />
                <FormErrorMessage>{errors.avatar?.message}</FormErrorMessage>
              </FormControl>

              <Button
                type="submit"
                colorScheme="brand"
                isLoading={isLoading}
                isDisabled={!isDirty}
                alignSelf="flex-start"
              >
                Save Changes
              </Button>
            </Stack>
          </form>
        </VStack>
      </Box>

      <Box
        p={6}
        bg={bg}
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="xl"
      >
        <VStack spacing={4} align="stretch">
          <Box>
            <Heading size="md" mb={1}>
              API Keys
            </Heading>
            <Text color="gray.500" fontSize="sm">
              Your keys are encrypted and used for trips you own. Trip members use
              the owner&apos;s keys for discovery and AI features.
            </Text>
          </Box>

          <form onSubmit={handleKeysSubmit(onKeysSubmit)}>
            <Stack spacing={4}>
              <FormControl isInvalid={!!keyErrors.openaiApiKey}>
                <FormLabel>OpenAI API Key</FormLabel>
                {hasOpenaiKey && (
                  <Text fontSize="sm" color="green.500" mb={1}>
                    Configured ···{openaiLast4}
                  </Text>
                )}
                <Input
                  type="password"
                  placeholder={hasOpenaiKey ? "Enter new key to replace" : "sk-..."}
                  autoComplete="off"
                  {...registerKeys("openaiApiKey")}
                />
                <FormHelperText>
                  Used for AI summaries, optimization, and travel guides.{" "}
                  <Link href="https://platform.openai.com/api-keys" isExternal color="brand.500">
                    Get an OpenAI key
                  </Link>
                </FormHelperText>
                {hasOpenaiKey && (
                  <Button
                    mt={2}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    type="button"
                    isLoading={isKeysLoading}
                    onClick={async () => {
                      setIsKeysLoading(true);
                      const result = await updateApiKeysAction({ clearOpenai: true });
                      setIsKeysLoading(false);
                      if (!result.success) {
                        toast({ title: result.error, status: "error", duration: 4000 });
                        return;
                      }
                      setHasOpenaiKey(false);
                      setOpenaiLast4(undefined);
                      toast({ title: "OpenAI key removed", status: "success", duration: 3000 });
                    }}
                  >
                    Remove OpenAI key
                  </Button>
                )}
              </FormControl>

              <Divider />

              <FormControl isInvalid={!!keyErrors.googleMapsApiKey}>
                <FormLabel>Google Maps API Key</FormLabel>
                {hasGoogleMapsKey && (
                  <Text fontSize="sm" color="green.500" mb={1}>
                    Configured ···{googleLast4}
                  </Text>
                )}
                <Input
                  type="password"
                  placeholder={hasGoogleMapsKey ? "Enter new key to replace" : "AIza..."}
                  autoComplete="off"
                  {...registerKeys("googleMapsApiKey")}
                />
                <FormHelperText>
                  Used for place search, discovery, and photos. Enable Places API
                  (New) and Geocoding in Google Cloud.{" "}
                  <Link
                    href="https://developers.google.com/maps/documentation/places/web-service/get-api-key"
                    isExternal
                    color="brand.500"
                  >
                    Get a Google Maps key
                  </Link>
                </FormHelperText>
                {hasGoogleMapsKey && (
                  <Button
                    mt={2}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    type="button"
                    isLoading={isKeysLoading}
                    onClick={async () => {
                      setIsKeysLoading(true);
                      const result = await updateApiKeysAction({ clearGoogleMaps: true });
                      setIsKeysLoading(false);
                      if (!result.success) {
                        toast({ title: result.error, status: "error", duration: 4000 });
                        return;
                      }
                      setHasGoogleMapsKey(false);
                      setGoogleLast4(undefined);
                      toast({ title: "Google Maps key removed", status: "success", duration: 3000 });
                    }}
                  >
                    Remove Google Maps key
                  </Button>
                )}
              </FormControl>

              <Button
                type="submit"
                colorScheme="brand"
                isLoading={isKeysLoading}
                alignSelf="flex-start"
              >
                Save API Keys
              </Button>
            </Stack>
          </form>
        </VStack>
      </Box>
    </VStack>
  );
}
