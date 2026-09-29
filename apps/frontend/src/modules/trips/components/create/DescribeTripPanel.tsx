import { Box, Button, Flex, HStack, Stack, Text, Textarea, useToast } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { LuSparkles } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { ChoiceChip } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api";
import { clearPendingTripPrompt, peekPendingTripPrompt } from "@/modules/landing/pending-prompt";
import { useGenerateTripFromPrompt } from "@/modules/trips/hooks/useTrips";

const PLACEHOLDER = "10 days in Japan in April — Tokyo, Kyoto, Osaka; we love food and temples";

const EXAMPLES = [
  { chip: "Long weekend in Lisbon, mostly food", short: "Long weekend in Lisbon", text: "Long weekend in Lisbon, mostly food — cafés, markets and a day in Sintra." },
  { chip: "2 weeks Rajasthan, forts and lakes, with kids", short: "2 weeks Rajasthan", text: "2 weeks in Rajasthan with kids — Jaipur, Jodhpur and Udaipur, forts and lakes." },
  { chip: "5 days Cape Town, relaxed", short: "5 days Cape Town", text: "5 relaxed days in Cape Town — beaches, the winelands and Table Mountain." },
];

const NOTE = "AI drafts cities, days, dates, pace and budget. Without a key, a simple parser handles “3 days in Jaipur”.";

/** One sentence in, a drafted trip out (cities, dates, interests). Shared by the dashboard card and
 * the "New trip" page. Picks up a sentence typed on the landing page before signing up. */
export function DescribeTripPanel({ rows = 2, variant = "card" }: { rows?: number; variant?: "card" | "page" }) {
  const toast = useToast();
  const navigate = useNavigate();
  const generate = useGenerateTripFromPrompt();
  const [prompt, setPrompt] = useState(peekPendingTripPrompt);
  // The landing-page sentence is used once.
  useEffect(() => clearPendingTripPrompt(), []);

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

  const textarea = (
    <Textarea
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      placeholder={PLACEHOLDER}
      rows={rows}
      minH={variant === "card" ? { base: "84px", md: "76px" } : undefined}
      p="12px"
      fontSize={{ base: "14px", md: "16px" }}
      borderRadius="md"
      resize="vertical"
      aria-label="Describe your trip"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
      }}
    />
  );

  const chips = (
    <HStack spacing="8px" flexWrap="wrap" rowGap="8px" minW={0}>
      <Text fontSize="12px" color="fg.muted" letterSpacing="0.02em" display={{ base: "none", md: "block" }}>
        Try
      </Text>
      {EXAMPLES.map((ex, i) => (
        <ChoiceChip
          key={ex.chip}
          onClick={() => setPrompt(ex.text)}
          maxW="full"
          display={{ base: i === 1 ? "none" : "inline-flex", md: "inline-flex" }}
          title={ex.text}
        >
          <Text as="span" noOfLines={1} display={{ base: "none", md: "block" }}>
            {ex.chip}
          </Text>
          <Text as="span" noOfLines={1} display={{ base: "block", md: "none" }}>
            {ex.short}
          </Text>
        </ChoiceChip>
      ))}
    </HStack>
  );

  const button = (
    <Button
      size="lg"
      leftIcon={<LuSparkles />}
      onClick={submit}
      isLoading={generate.isPending}
      loadingText="Drafting your trip…"
      w={{ base: "full", md: "auto" }}
      flexShrink={0}
    >
      Draft my trip
    </Button>
  );

  if (variant === "page") {
    return (
      <Stack spacing="12px">
        {textarea}
        {chips}
        <Flex justify="space-between" align={{ base: "stretch", md: "center" }} gap="12px" direction={{ base: "column-reverse", md: "row" }}>
          <Text fontSize="12px" color="fg.muted" maxW="420px">
            {NOTE}
          </Text>
          {button}
        </Flex>
      </Stack>
    );
  }

  return (
    <Stack spacing={{ base: "10px", md: "12px" }}>
      {textarea}
      <Flex justify="space-between" align={{ base: "stretch", md: "center" }} gap="12px" direction={{ base: "column", md: "row" }}>
        {chips}
        <Flex align="center" gap="12px" direction={{ base: "column-reverse", md: "row" }} flexShrink={0}>
          <Box
            fontSize="12px"
            color="fg.muted"
            maxW={{ md: "340px" }}
            textAlign={{ base: "left", md: "right" }}
            alignSelf={{ base: "flex-start", md: "center" }}
          >
            <Text as="span" display={{ base: "none", md: "inline" }}>
              {NOTE}
            </Text>
            <Text as="span" display={{ base: "inline", md: "none" }}>
              No AI key? A simple parser handles &ldquo;3 days in Jaipur&rdquo;.
            </Text>
          </Box>
          {button}
        </Flex>
      </Flex>
    </Stack>
  );
}
