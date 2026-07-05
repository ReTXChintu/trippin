"use client";

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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiZap } from "react-icons/fi";
import { generateTripFromPromptAction } from "@/modules/trips/actions/trip.actions";

export function TripGeneratorCard() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

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

    setIsGenerating(true);
    const result = await generateTripFromPromptAction(prompt.trim());
    setIsGenerating(false);

    if (!result.success) {
      toast({ title: result.error, status: "error", duration: 5000 });
      return;
    }

    toast({
      title: result.message ?? "Trip created",
      description: "Review and refine your trip details.",
      status: "success",
      duration: 4000,
    });

    router.push(`/trips/${result.data!.trip.id}`);
  };

  return (
    <Box
      p={6}
      bg={bg}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="xl"
    >
      <VStack align="stretch" spacing={4}>
        <Box>
          <Heading size="md" mb={1}>
            Describe your trip
          </Heading>
          <Text color="gray.500" fontSize="sm">
            Tell us where you&apos;re going, how long, and what you enjoy — we&apos;ll draft a trip.
          </Text>
        </Box>

        <FormControl>
          <FormLabel srOnly>Trip description</FormLabel>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="I am staying near Ajmer Railway Station for 2 days. I like temples and photography."
            rows={4}
            resize="vertical"
          />
        </FormControl>

        <Button
          leftIcon={<FiZap />}
          colorScheme="brand"
          onClick={handleGenerate}
          isLoading={isGenerating}
          loadingText="Generating..."
          alignSelf="flex-start"
        >
          Generate Trip
        </Button>
      </VStack>
    </Box>
  );
}
