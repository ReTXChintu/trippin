import { Avatar, Box, Button, Collapse, Flex, FormControl, FormErrorMessage, FormLabel, Heading, HStack, Icon, SimpleGrid, Skeleton, Stack, Text, useToast } from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { IconType } from "react-icons";
import { FiImage, FiLink, FiMapPin, FiShield, FiUser } from "react-icons/fi";
import { LuSparkles } from "react-icons/lu";
import { SurfaceCard } from "@/components/ui";
import { IconInput } from "@/components/ui/app";
import { useProfileQuery, useUpdateProfile } from "@/modules/profile/hooks/useProfile";
import { getApiErrorMessage } from "@/lib/api";
import { profileSchema, type ProfileInput } from "@/modules/auth/validators/auth.validator";
import { AiSettingsCard } from "@/modules/profile/components/AiSettingsCard";
import { ApiKeyCard } from "@/modules/profile/components/ApiKeyCard";
import { GoogleUsageCard } from "@/modules/profile/components/GoogleUsageCard";

const UNLOCKS: { icon: IconType; title: string; text: string }[] = [
  { icon: LuSparkles, title: "OpenAI or Gemini", text: "Describe-a-trip, Ask AI, guides, summaries, compare" },
  { icon: FiMapPin, title: "Google Maps", text: "Rich place search, photos, ratings, opening hours" },
  { icon: FiShield, title: "Neither", text: "City search, manual stops, plan generation still work" },
];

export function ProfileForm() {
  const toast = useToast();
  const { data, isLoading: isFetching } = useProfileQuery();
  const profile = data?.profile;
  const updateProfile = useUpdateProfile();
  const [photoOpen, setPhotoOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
  });

  const avatarUrl = watch("avatar");
  const nameValue = watch("name");

  useEffect(() => {
    if (profile) {
      reset({ name: profile.name, avatar: profile.avatar ?? "" });
    }
  }, [profile, reset]);

  const onSubmit = async (data: ProfileInput) => {
    try {
      await updateProfile.mutateAsync({ name: data.name, avatar: data.avatar || undefined });
      setPhotoOpen(false);
      toast({ title: "Profile updated", status: "success", duration: 3000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 4000 });
    }
  };

  if (isFetching || !profile) {
    return (
      <Stack spacing={5}>
        <Skeleton h="104px" borderRadius="xl" />
        <Skeleton h="180px" borderRadius="xl" />
        <Skeleton h="150px" borderRadius="xl" />
      </Stack>
    );
  }

  return (
    <Stack spacing={5}>
      <SurfaceCard as="form" id="profile" onSubmit={handleSubmit(onSubmit)} p={5} scrollMarginTop="96px" aria-label="Your profile">
        <Flex gap={4} align={{ base: "flex-start", md: "center" }} direction={{ base: "column", md: "row" }}>
          <Avatar
            w="64px"
            h="64px"
            fontSize="22px"
            name={nameValue || profile.name}
            src={avatarUrl || profile.avatar || undefined}
            bg="acSoft"
            color="ac"
            flexShrink={0}
          />
          <FormControl isInvalid={!!errors.name} flex={1}>
            <FormLabel htmlFor="profile-name">
              Name
            </FormLabel>
            <IconInput id="profile-name" icon={FiUser} autoComplete="name" {...register("name")} />
            <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
            <Text fontSize="12px" lineHeight="16px" color="tx3" mt="6px">
              Signed in as{" "}
              <Text as="span" fontFamily="mono">
                {profile.email}
              </Text>
            </Text>
          </FormControl>
          <HStack spacing={2} alignSelf={{ base: "stretch", md: "center" }}>
            <Button variant="outline" leftIcon={<FiImage size={18} />} onClick={() => setPhotoOpen((o) => !o)} aria-expanded={photoOpen} flex={{ base: 1, md: "none" }}>
              Change photo
            </Button>
            {isDirty && (
              <Button type="submit" isLoading={updateProfile.isPending} flex={{ base: 1, md: "none" }}>
                Save
              </Button>
            )}
          </HStack>
        </Flex>
        <Collapse in={photoOpen || !!errors.avatar} animateOpacity>
          <FormControl isInvalid={!!errors.avatar} mt={4}>
            <FormLabel htmlFor="profile-avatar">
              Photo URL
            </FormLabel>
            <IconInput id="profile-avatar" icon={FiLink} placeholder="https://…" {...register("avatar")} />
            <FormErrorMessage>{errors.avatar?.message}</FormErrorMessage>
            <Text fontSize="12px" lineHeight="16px" color="tx3" mt="6px">
              Paste a link to an image, then Save. Leave empty to use your initials.
            </Text>
          </FormControl>
        </Collapse>
      </SurfaceCard>

      <Box pt={1} id="api-keys" scrollMarginTop="96px">
        <Heading as="h2" fontSize="17px" lineHeight="24px">
          What each key unlocks
        </Heading>
        <Text color="tx2" fontSize="14px" lineHeight="20px" mt={1}>
          You can use the whole planner with no keys. Keys add shortcuts. They&rsquo;re used for trips you own — members use the owner&rsquo;s keys.
        </Text>
      </Box>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
        {UNLOCKS.map((u) => (
          <Flex key={u.title} gap={3} p="14px" bg="sf2" borderWidth="1px" borderColor="ln" borderRadius="xl">
            <Flex w="36px" h="36px" borderRadius="md" bg="sunk" color="tx2" align="center" justify="center" flexShrink={0}>
              <Icon as={u.icon} boxSize="18px" />
            </Flex>
            <Box minW={0}>
            <Text fontWeight={600} fontSize="14px" lineHeight="20px">
              {u.title}
            </Text>
            <Text fontSize="12px" lineHeight="16px" color="tx3" mt="2px">
              {u.text}
            </Text>
            </Box>
          </Flex>
        ))}
      </SimpleGrid>

      <SimpleGrid templateColumns="repeat(auto-fit, minmax(min(100%, 340px), 1fr))" spacing={5} alignItems="start">
      <ApiKeyCard
        name="OpenAI"
        description="Powers AI drafting and editing"
        field="openaiApiKey"
        clearField="clearOpenai"
        hasKey={profile.hasOpenaiKey}
        last4={profile.openaiApiKeyLast4}
        serverKey={profile.serverKeys?.openai}
        placeholder="sk-…"
        link={{ href: "https://platform.openai.com/api-keys", label: "Get a key at platform.openai.com" }}
      />
      <ApiKeyCard
        name="Gemini"
        description="Alternative AI provider, with a generous free tier"
        field="geminiApiKey"
        clearField="clearGemini"
        hasKey={profile.hasGeminiKey}
        last4={profile.geminiApiKeyLast4}
        serverKey={profile.serverKeys?.gemini}
        placeholder="Paste your key"
        link={{ href: "https://aistudio.google.com/app/apikey", label: "Get a key at aistudio.google.com" }}
      />
      <ApiKeyCard
        name="Google Maps Places"
        description="Place search, photos and reviews"
        field="googleMapsApiKey"
        clearField="clearGoogleMaps"
        hasKey={profile.hasGoogleMapsKey}
        last4={profile.googleMapsApiKeyLast4}
        placeholder="AIza…"
        extraNote="Billed to your own Google Cloud account."
        link={{ href: "/help/google-maps-key", label: "Step-by-step guide to get a key" }}
        guideTo="/help/google-maps-key"
      />
      </SimpleGrid>

      <SimpleGrid templateColumns="repeat(auto-fit, minmax(min(100%, 420px), 1fr))" spacing={5} alignItems="start">
        <GoogleUsageCard id="google-usage" />
        <AiSettingsCard profile={profile} id="ai-settings" />
      </SimpleGrid>
    </Stack>
  );
}
