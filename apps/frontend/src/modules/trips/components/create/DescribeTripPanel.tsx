import { Button, HStack, Stack, Tag, Text, Textarea, useToast } from "@chakra-ui/react";
import { useState } from "react";
import { FiZap } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "@/lib/api";
import { useGenerateTripFromPrompt } from "@/modules/trips/hooks/useTrips";

const EXAMPLES = [
  "10 days in Japan in April — Tokyo, Kyoto and Osaka. We love food, temples and gardens.",
  "A relaxed week in Rajasthan with my parents: Jaipur and Udaipur, forts and lakes.",
  "Long weekend in Lisbon in May, cafés, viewpoints and a day in Sintra.",
];

/** One sentence in, a drafted trip out (cities, dates, interests). Shared by the dashboard card and
 * the "New trip" page. */
export function DescribeTripPanel({ rows = 4 }: { rows?: number }) {
  const toast = useToast();
  const navigate = useNavigate();
  const generate = useGenerateTripFromPrompt();
  const [prompt, setPrompt] = useState("");
  const muted = "fg.muted";

  const submit = async () => {
    if (prompt.trim().length < 10) {
      toast({ title: "Tell us a bit more", description: "Where, how long, and what you enjoy.", status: "warning", duration: 4000 });
      return;
    }
    try {
      const result = await generate.mutateAsync(prompt.trim());
      toast({
        title: "Trip drafted",
        description: result.usedAi
          ? "Cities and dates are set — pick places next, then generate the plan."
          : "Drafted without AI (no OpenAI/Gemini key) — check the cities and dates.",
        status: "success",
        duration: 5000,
      });
      navigate(`/trips/${result.trip.id}`);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 6000 });
    }
  };

  return (
    <Stack spacing={3}>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={EXAMPLES[0]}
        rows={rows}
        resize="vertical"
        aria-label="Describe your trip"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
        }}
      />
      <HStack spacing={2} flexWrap="wrap">
        <Text fontSize="xs" color={muted}>
          Examples:
        </Text>
        {EXAMPLES.slice(1).map((ex) => (
          <Tag key={ex} size="sm" variant="subtle" cursor="pointer" onClick={() => setPrompt(ex)} maxW="full">
            <Text noOfLines={1}>{ex}</Text>
          </Tag>
        ))}
      </HStack>
      <Button leftIcon={<FiZap />} colorScheme="brand" onClick={submit} isLoading={generate.isPending} loadingText="Drafting your trip…" alignSelf="flex-start">
        Draft my trip
      </Button>
    </Stack>
  );
}
