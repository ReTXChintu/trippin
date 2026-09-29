import { Box, Button, Flex, Heading, HStack, Radio, RadioGroup, Spinner, Text, useToast } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FiInfo } from "react-icons/fi";
import { Banner, Pill, Segmented, SurfaceCard } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api";
import type { AiProviderName, ProfileDTO } from "@/modules/profile/api/profile.api";
import { useAiModelsQuery, useUpdateAiSettings } from "@/modules/profile/hooks/useProfile";

const PROVIDER_NAME: Record<AiProviderName, string> = { openai: "OpenAI", gemini: "Gemini" };
const COLLAPSED_COUNT = 6;

/** Pick which AI provider runs the app's AI features, and which of its models (listed live). */
export function AiSettingsCard({ profile, id }: { profile: ProfileDTO; id?: string }) {
  const toast = useToast();
  const updateAiSettings = useUpdateAiSettings();

  const hasKey: Record<AiProviderName, boolean> = {
    openai: profile.hasOpenaiKey || !!profile.serverKeys?.openai,
    gemini: profile.hasGeminiKey || !!profile.serverKeys?.gemini,
  };

  const [provider, setProvider] = useState<AiProviderName>(profile.ai.activeProvider ?? profile.ai.preferredProvider ?? "openai");
  const [models, setModels] = useState<Record<AiProviderName, string>>({
    openai: profile.ai.openaiModel,
    gemini: profile.ai.geminiModel,
  });
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setProvider(profile.ai.activeProvider ?? profile.ai.preferredProvider ?? "openai");
    setModels({ openai: profile.ai.openaiModel, gemini: profile.ai.geminiModel });
  }, [profile.ai.activeProvider, profile.ai.preferredProvider, profile.ai.openaiModel, profile.ai.geminiModel]);

  const modelsQuery = useAiModelsQuery(provider, hasKey[provider]);
  const options = modelsQuery.data?.models ?? [];
  const selectedModel = models[provider];
  // Keep the saved model selectable even if the provider no longer lists it.
  const withCurrent = options.some((m) => m.id === selectedModel) ? options : [{ id: selectedModel, label: selectedModel, recommended: false }, ...options];
  const ordered = [...withCurrent.filter((m) => m.recommended), ...withCurrent.filter((m) => !m.recommended)];
  const visible = showAll ? ordered : ordered.filter((m, i) => i < COLLAPSED_COUNT || m.id === selectedModel);
  const hiddenCount = ordered.length - visible.length;
  const selectedNote = withCurrent.find((m) => m.id === selectedModel)?.note;

  const noKeys = !hasKey.openai && !hasKey.gemini;
  const savedProvider = profile.ai.activeProvider;
  const isDirty = provider !== savedProvider || models.openai !== profile.ai.openaiModel || models.gemini !== profile.ai.geminiModel;

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

  const listStatus = !hasKey[provider] ? null : modelsQuery.isFetching ? (
    <HStack spacing="6px">
      <Spinner size="xs" />
      <span>Loading models…</span>
    </HStack>
  ) : modelsQuery.data && !modelsQuery.data.live ? (
    "Couldn't reach the provider — check the key"
  ) : (
    "Model list is fetched live"
  );

  return (
    <SurfaceCard as="section" id={id} aria-labelledby="ai-settings-title" p="18px" display="flex" flexDirection="column" gap="12px" scrollMarginTop="80px">
      <Flex justify="space-between" align="center" gap="8px" wrap="wrap">
        <Heading as="h2" id="ai-settings-title" fontSize="18px">
          AI settings
        </Heading>
        <Text fontSize="12px" color="fg.muted">
          {listStatus}
        </Text>
      </Flex>

      {noKeys && (
        <Banner tone="accent" icon={FiInfo}>
          Add an OpenAI or Gemini key above to turn AI features on.
        </Banner>
      )}

      <Box>
        <Text fontSize="12px" fontWeight={600} color="fg.muted" mb="6px">
          Provider
        </Text>
        <HStack spacing="12px" flexWrap="wrap">
          <Segmented<AiProviderName>
            value={provider}
            onChange={(p) => {
              setProvider(p);
              setShowAll(false);
            }}
            aria-label="AI provider"
            options={[
              { value: "openai", label: "OpenAI" },
              { value: "gemini", label: "Gemini" },
            ]}
          />
          {savedProvider && (
            <Pill tone="success">In use: {PROVIDER_NAME[savedProvider]}</Pill>
          )}
        </HStack>
      </Box>

      {!hasKey[provider] ? (
        <Text fontSize="13px" color="fg.muted">
          No {PROVIDER_NAME[provider]} key yet — add one above to use it.
        </Text>
      ) : (
        <Box>
          <Text fontSize="12px" fontWeight={600} color="fg.muted" mb="6px" id="ai-model-label">
            Model
          </Text>
          <RadioGroup value={selectedModel} onChange={(v) => setModels((prev) => ({ ...prev, [provider]: v }))} aria-labelledby="ai-model-label">
            <SurfaceCard>
              {visible.map((m, i) => (
                <Flex
                  as="label"
                  key={m.id}
                  align="center"
                  gap="10px"
                  px="14px"
                  py="10px"
                  borderTopWidth={i === 0 ? 0 : "1px"}
                  borderColor="border.line"
                  cursor="pointer"
                  _hover={{ bg: "bg.subtle" }}
                >
                  <Radio value={m.id} />
                  <Box flex={1} minW={0}>
                    <Text fontWeight={600} noOfLines={1}>
                      {m.label === m.id ? m.id : `${m.label} (${m.id})`}
                    </Text>
                    {m.note && (
                      <Text fontSize="12px" color="fg.muted" noOfLines={1}>
                        {m.note}
                      </Text>
                    )}
                  </Box>
                  {m.recommended && <Pill tone="accent">Recommended</Pill>}
                </Flex>
              ))}
            </SurfaceCard>
          </RadioGroup>
          {(hiddenCount > 0 || showAll) && ordered.length > COLLAPSED_COUNT && (
            <Button variant="ghost" size="sm" mt="6px" onClick={() => setShowAll((s) => !s)}>
              {showAll ? "Show fewer models" : `Show all ${ordered.length} models`}
            </Button>
          )}
          <Text fontSize="12px" color="fg.muted" mt="6px">
            {selectedNote ?? "Bigger models write better guides but are slower and cost more on your key."}
          </Text>
        </Box>
      )}

      <Button alignSelf="flex-start" onClick={handleSave} isLoading={updateAiSettings.isPending} isDisabled={noKeys || !hasKey[provider] || !isDirty}>
        Save AI settings
      </Button>
    </SurfaceCard>
  );
}
