import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiZap } from "react-icons/fi";
import { useGenerateTripFromPrompt } from "@/modules/trips/hooks/useTrips";
import { getApiErrorMessage } from "@/lib/api";

export function TripGeneratorCard() {
  const [prompt, setPrompt] = useState("");
  const toast = useToast();
  const navigate = useNavigate();
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const generate = useGenerateTripFromPrompt();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Describe your trip",
        description: "Enter a few details about your destination, duration, and interests.",
        status: "warning",
        duration: 4000,
      });
      return;
    }

    try {
      const result = await generate.mutateAsync(prompt.trim());
      toast({
        title: "Trip draft created",
        description: result.usedAi
          ? "Cities and dates are set — pick places next, then generate the plan."
          : "Drafted without AI (no OpenAI/Gemini key) — check the cities and dates.",
        status: "success",
        duration: 4000,
      });
      navigate(`/trips/${result.trip.id}`);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  return (
    <Box p={6} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
      <VStack align="stretch" spacing={4}>
        <Box>
          <Heading size="md" mb={1}>
            Describe your trip
          </Heading>
          <Text color="gray.500" fontSize="sm">
            Where, how long, when and what you enjoy — any country, one city or several. We&apos;ll set up the
            cities, dates and interests for you.
          </Text>
        </Box>

        <FormControl>
          <FormLabel srOnly>Trip description</FormLabel>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="10 days in Japan in April — Tokyo, Kyoto and Osaka. We love food, temples and gardens."
            rows={4}
            resize="vertical"
          />
        </FormControl>

        <Button
          leftIcon={<FiZap />}
          colorScheme="brand"
          onClick={handleGenerate}
          isLoading={generate.isPending}
          loadingText="Generating..."
          alignSelf="flex-start"
        >
          Generate Trip
        </Button>
      </VStack>
    </Box>
  );
}
