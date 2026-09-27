import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Select,
  SimpleGrid,
  Spinner,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import type { AiProviderName, ProfileDTO } from "@/modules/profile/api/profile.api";
import { useAiModelsQuery, useUpdateAiSettings } from "@/modules/profile/hooks/useProfile";

const PROVIDERS: { id: AiProviderName; name: string; vendor: string }[] = [
  { id: "openai", name: "OpenAI", vendor: "GPT models" },
  { id: "gemini", name: "Google Gemini", vendor: "Gemini models" },
];

function ProviderCard({
  name,
  vendor,
  keyLast4,
  hasKey,
  isSelected,
  isActive,
  onSelect,
}: {
  name: string;
  vendor: string;
  keyLast4?: string;
  hasKey: boolean;
  isSelected: boolean;
  isActive: boolean;
  onSelect: () => void;
}) {
  const border = useColorModeValue("gray.200", "gray.600");
  const selectedBg = useColorModeValue("brand.50", "whiteAlpha.100");
  const muted = useColorModeValue("gray.500", "gray.400");

  return (
    <Box
      as="button"
      type="button"
      textAlign="left"
      p={4}
      borderWidth="2px"
      borderRadius="lg"
      borderColor={isSelected ? "brand.500" : border}
      bg={isSelected ? selectedBg : undefined}
      opacity={hasKey ? 1 : 0.55}
      cursor={hasKey ? "pointer" : "not-allowed"}
      onClick={hasKey ? onSelect : undefined}
      aria-pressed={isSelected}
      aria-disabled={!hasKey}
      transition="all .15s"
    >
      <Flex justify="space-between" align="start" gap={2}>
        <Box>
          <Text fontWeight="semibold">{name}</Text>
          <Text fontSize="xs" color={muted}>
            {vendor}
          </Text>
        </Box>
        {isActive && (
          <Badge colorScheme="green" variant="subtle">
            In use
          </Badge>
        )}
      </Flex>
      <Text fontSize="xs" mt={2} color={hasKey ? "green.500" : muted}>
        {hasKey ? `Key ···${keyLast4 ?? ""}` : "No key yet — add it below"}
      </Text>
    </Box>
  );
}

/** Pick which AI provider runs the app's AI features, and which of its models. */
export function AiSettingsCard({ profile }: { profile: ProfileDTO }) {
  const toast = useToast();
  const updateAiSettings = useUpdateAiSettings();
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const muted = useColorModeValue("gray.500", "gray.400");

  const hasKey: Record<AiProviderName, boolean> = {
    openai: profile.hasOpenaiKey || !!profile.serverKeys?.openai,
    gemini: profile.hasGeminiKey || !!profile.serverKeys?.gemini,
  };
  const keyLast4: Record<AiProviderName, string | undefined> = {
    openai: profile.openaiApiKeyLast4,
    gemini: profile.geminiApiKeyLast4,
  };

  const [provider, setProvider] = useState<AiProviderName>(
    profile.ai.activeProvider ?? profile.ai.preferredProvider ?? "openai",
  );
  const [models, setModels] = useState<Record<AiProviderName, string>>({
    openai: profile.ai.openaiModel,
    gemini: profile.ai.geminiModel,
  });

  useEffect(() => {
    setProvider(profile.ai.activeProvider ?? profile.ai.preferredProvider ?? "openai");
    setModels({ openai: profile.ai.openaiModel, gemini: profile.ai.geminiModel });
  }, [profile.ai.activeProvider, profile.ai.preferredProvider, profile.ai.openaiModel, profile.ai.geminiModel]);

  const modelsQuery = useAiModelsQuery(provider, hasKey[provider]);
  const options = modelsQuery.data?.models ?? [];
  const selectedModel = models[provider];
  // Keep the saved model selectable even if the provider no longer lists it.
  const withCurrent = options.some((m) => m.id === selectedModel)
    ? options
    : [{ id: selectedModel, label: selectedModel, recommended: false }, ...options];
  const recommended = withCurrent.filter((m) => m.recommended);
  const others = withCurrent.filter((m) => !m.recommended);
  const selectedNote = withCurrent.find((m) => m.id === selectedModel)?.note;

  const noKeys = !hasKey.openai && !hasKey.gemini;
  const savedProvider = profile.ai.activeProvider;
  const isDirty =
    provider !== savedProvider ||
    models.openai !== profile.ai.openaiModel ||
    models.gemini !== profile.ai.geminiModel;

  const handleSave = async () => {
    try {
      await updateAiSettings.mutateAsync({
        aiProvider: provider,
        ...(hasKey.openai ? { openaiModel: models.openai } : {}),
        ...(hasKey.gemini ? { geminiModel: models.gemini } : {}),
      });
      toast({ title: "AI settings saved", status: "success", duration: 3000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 4000 });
    }
  };

  return (
    <Box p={6} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
      <VStack spacing={5} align="stretch">
        <Box>
          <Heading size="md" mb={1}>
            AI assistant
          </Heading>
          <Text color={muted} fontSize="sm">
            Powers local guides, place ideas, trip summaries and the AI plan comparison — for every trip you own.
          </Text>
        </Box>

        {noKeys && (
          <Alert status="info" borderRadius="md" fontSize="sm">
            <AlertIcon />
            Add an OpenAI or Gemini key in API Keys below to turn AI features on.
          </Alert>
        )}

        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.id}
              name={p.name}
              vendor={p.vendor}
              keyLast4={keyLast4[p.id]}
              hasKey={hasKey[p.id]}
              isSelected={provider === p.id && hasKey[p.id]}
              isActive={savedProvider === p.id}
              onSelect={() => setProvider(p.id)}
            />
          ))}
        </SimpleGrid>

        {hasKey[provider] && (
          <FormControl>
            <FormLabel fontSize="sm">
              <HStack spacing={2}>
                <Text>{provider === "openai" ? "OpenAI" : "Gemini"} model</Text>
                {modelsQuery.isFetching && <Spinner size="xs" />}
              </HStack>
            </FormLabel>
            <Select
              value={selectedModel}
              onChange={(e) => setModels((prev) => ({ ...prev, [provider]: e.target.value }))}
            >
              {recommended.length > 0 && (
                <optgroup label="Recommended">
                  {recommended.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </optgroup>
              )}
              {others.length > 0 && (
                <optgroup label="All models on your key">
                  {others.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label === m.id ? m.id : `${m.label} (${m.id})`}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
            <FormHelperText fontSize="xs">
              {selectedNote ??
                "Bigger models write better guides but are slower and cost more on your key."}
              {modelsQuery.data && !modelsQuery.data.live && " · Couldn't reach the provider to list models — check the key."}
            </FormHelperText>
          </FormControl>
        )}

        <Button
          colorScheme="brand"
          alignSelf="flex-start"
          onClick={handleSave}
          isLoading={updateAiSettings.isPending}
          isDisabled={noKeys || !hasKey[provider] || !isDirty}
        >
          Save AI settings
        </Button>
      </VStack>
    </Box>
  );
}
