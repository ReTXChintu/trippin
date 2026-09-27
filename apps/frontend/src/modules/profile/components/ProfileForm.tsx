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
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useProfileQuery, useUpdateApiKeys, useUpdateProfile } from "@/modules/profile/hooks/useProfile";
import { getApiErrorMessage } from "@/lib/api";
import {
  apiKeysSchema,
  profileSchema,
  type ApiKeysInput,
  type ProfileInput,
} from "@/modules/auth/validators/auth.validator";
import { AiSettingsCard } from "@/modules/profile/components/AiSettingsCard";

function SharedKeyNote() {
  return (
    <Text fontSize="sm" color="green.500" mb={1}>
      Using the shared key from this server — add your own to use it instead.
    </Text>
  );
}

export function ProfileForm() {
  const toast = useToast();
  const { data, isLoading: isFetching } = useProfileQuery();
  const profile = data?.profile;
  const updateProfile = useUpdateProfile();
  const updateApiKeys = useUpdateApiKeys();

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
      geminiApiKey: "",
      googleMapsApiKey: "",
      clearOpenai: false,
      clearGemini: false,
      clearGoogleMaps: false,
    },
  });

  const avatarUrl = watch("avatar");

  useEffect(() => {
    if (profile) {
      reset({ name: profile.name, avatar: profile.avatar ?? "" });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileInput) => {
    try {
      await updateProfile.mutateAsync({ name: data.name, avatar: data.avatar || undefined });
      toast({ title: "Profile updated", status: "success", duration: 3000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 4000 });
    }
  };

  const onKeysSubmit = async (data: ApiKeysInput) => {
    try {
      await updateApiKeys.mutateAsync(data);
      resetKeys({
        openaiApiKey: "",
        geminiApiKey: "",
        googleMapsApiKey: "",
        clearOpenai: false,
        clearGemini: false,
        clearGoogleMaps: false,
      });
      toast({ title: "API keys updated", status: "success", duration: 3000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 4000 });
    }
  };

  const handleClearOpenai = async () => {
    try {
      await updateApiKeys.mutateAsync({ clearOpenai: true });
      toast({ title: "OpenAI key removed", status: "success", duration: 3000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 4000 });
    }
  };

  const handleClearGemini = async () => {
    try {
      await updateApiKeys.mutateAsync({ clearGemini: true });
      toast({ title: "Gemini key removed", status: "success", duration: 3000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 4000 });
    }
  };

  const handleClearGoogleMaps = async () => {
    try {
      await updateApiKeys.mutateAsync({ clearGoogleMaps: true });
      toast({ title: "Google Maps key removed", status: "success", duration: 3000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 4000 });
    }
  };

  if (isFetching || !profile) {
    return null;
  }

  return (
    <VStack spacing={6} align="stretch" maxW="2xl">
      <Box p={6} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
        <VStack spacing={6} align="stretch">
          <Box>
            <Heading size="md" mb={1}>
              Profile Settings
            </Heading>
            <Text color="gray.500" fontSize="sm">
              {profile.email}
            </Text>
          </Box>

          <Stack direction="row" align="center" spacing={4}>
            <Avatar size="lg" name={watch("name") || profile.name} src={avatarUrl || profile.avatar || undefined} />
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
                isLoading={updateProfile.isPending}
                isDisabled={!isDirty}
                alignSelf="flex-start"
              >
                Save Changes
              </Button>
            </Stack>
          </form>
        </VStack>
      </Box>

      <AiSettingsCard profile={profile} />

      <Box p={6} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
        <VStack spacing={4} align="stretch">
          <Box>
            <Heading size="md" mb={1}>
              API Keys
            </Heading>
            <Text color="gray.500" fontSize="sm">
              Your keys are encrypted and used for trips you own. Trip members use the owner&apos;s keys for
              discovery and AI features.
            </Text>
          </Box>

          <form onSubmit={handleKeysSubmit(onKeysSubmit)}>
            <Stack spacing={4}>
              <FormControl isInvalid={!!keyErrors.openaiApiKey}>
                <FormLabel>OpenAI API Key</FormLabel>
                {profile.hasOpenaiKey && (
                  <Text fontSize="sm" color="green.500" mb={1}>
                    Configured ···{profile.openaiApiKeyLast4}
                  </Text>
                )}
                <Input
                  type="password"
                  placeholder={profile.hasOpenaiKey ? "Enter new key to replace" : "sk-..."}
                  autoComplete="off"
                  {...registerKeys("openaiApiKey")}
                />
                {!profile.hasOpenaiKey && profile.serverKeys?.openai && <SharedKeyNote />}
                <FormHelperText>
                  One of OpenAI or Gemini powers AI guides, summaries and plan comparison — choose which above.{" "}
                  <Link href="https://platform.openai.com/api-keys" isExternal color="brand.500">
                    Get an OpenAI key
                  </Link>
                </FormHelperText>
                {profile.hasOpenaiKey && (
                  <Button
                    mt={2}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    type="button"
                    isLoading={updateApiKeys.isPending}
                    onClick={handleClearOpenai}
                  >
                    Remove OpenAI key
                  </Button>
                )}
              </FormControl>

              <Divider />

              <FormControl isInvalid={!!keyErrors.geminiApiKey}>
                <FormLabel>Google Gemini API Key</FormLabel>
                {profile.hasGeminiKey && (
                  <Text fontSize="sm" color="green.500" mb={1}>
                    Configured ···{profile.geminiApiKeyLast4}
                  </Text>
                )}
                <Input
                  type="password"
                  placeholder={profile.hasGeminiKey ? "Enter new key to replace" : "AIza..."}
                  autoComplete="off"
                  {...registerKeys("geminiApiKey")}
                />
                {!profile.hasGeminiKey && profile.serverKeys?.gemini && <SharedKeyNote />}
                <FormHelperText>
                  An alternative to OpenAI with a generous free tier.{" "}
                  <Link href="https://aistudio.google.com/app/apikey" isExternal color="brand.500">
                    Get a Gemini key
                  </Link>
                </FormHelperText>
                {profile.hasGeminiKey && (
                  <Button
                    mt={2}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    type="button"
                    isLoading={updateApiKeys.isPending}
                    onClick={handleClearGemini}
                  >
                    Remove Gemini key
                  </Button>
                )}
              </FormControl>

              <Divider />

              <FormControl isInvalid={!!keyErrors.googleMapsApiKey}>
                <FormLabel>Google Maps API Key</FormLabel>
                {profile.hasGoogleMapsKey && (
                  <Text fontSize="sm" color="green.500" mb={1}>
                    Configured ···{profile.googleMapsApiKeyLast4}
                  </Text>
                )}
                <Input
                  type="password"
                  placeholder={profile.hasGoogleMapsKey ? "Enter new key to replace" : "AIza..."}
                  autoComplete="off"
                  {...registerKeys("googleMapsApiKey")}
                />
                {!profile.hasGoogleMapsKey && profile.serverKeys?.googleMaps && <SharedKeyNote />}
                <FormHelperText>
                  Used for place search, discovery, and photos. Enable Places API (New) and Geocoding in Google
                  Cloud.{" "}
                  <Link
                    href="https://developers.google.com/maps/documentation/places/web-service/get-api-key"
                    isExternal
                    color="brand.500"
                  >
                    Get a Google Maps key
                  </Link>
                </FormHelperText>
                {profile.hasGoogleMapsKey && (
                  <Button
                    mt={2}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    type="button"
                    isLoading={updateApiKeys.isPending}
                    onClick={handleClearGoogleMaps}
                  >
                    Remove Google Maps key
                  </Button>
                )}
              </FormControl>

              <Button type="submit" colorScheme="brand" isLoading={updateApiKeys.isPending} alignSelf="flex-start">
                Save API Keys
              </Button>
            </Stack>
          </form>
        </VStack>
      </Box>
    </VStack>
  );
}
