import {
  Box,
  Button,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Tag,
  Text,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { FiZap } from "react-icons/fi";
import { getApiErrorMessage } from "@/lib/api";
import { useAiEditPlan } from "@/modules/itinerary/hooks/useItinerary";

const EXAMPLES = ["Make the busiest day lighter", "Spread the museums out", "Keep mornings for the big sights"];

/** "Tell the AI what to change" — it proposes moves/removals/re-orders and the planner applies and
 * re-times them. Every change is one Undo away. */
export function AskAiBar({ tripId, hasAiKey }: { tripId: string; hasAiKey: boolean }) {
  const toast = useToast();
  const edit = useAiEditPlan(tripId);
  const [text, setText] = useState("");
  const bg = "accent.soft";
  const border = "accent.soft";
  const muted = "fg.muted";

  const submit = async (instruction = text) => {
    if (!instruction.trim() || edit.isPending) return;
    try {
      const result = await edit.mutateAsync(instruction.trim());
      toast({
        title: result.applied > 0 ? "Plan updated" : "No changes made",
        description: result.applied > 0 ? `${result.summary} Use Undo to go back.` : result.summary,
        status: result.applied > 0 ? "success" : "info",
        duration: 7000,
        isClosable: true,
      });
      if (result.applied > 0) setText("");
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 6000 });
    }
  };

  return (
    <Box bg={bg} borderWidth="1px" borderColor={border} borderRadius="xl" px={3} py={2.5}>
      <Tooltip label="Add an OpenAI or Gemini key in Profile to use this" isDisabled={hasAiKey} hasArrow>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <InputGroup size="md">
            <InputLeftElement pointerEvents="none">
              <Icon as={FiZap} color="purple.400" />
            </InputLeftElement>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask AI to change the plan — e.g. “move the fort to day 3 and make day 2 lighter”"
              bg={"bg.surface"}
              borderRadius="lg"
              pr="6.5rem"
              isDisabled={!hasAiKey || edit.isPending}
              aria-label="Ask AI to change the plan"
            />
            <InputRightElement width="6rem" pr={1}>
              <Button type="submit" size="sm" colorScheme="brand" isLoading={edit.isPending} loadingText="Thinking" isDisabled={!hasAiKey || !text.trim()}>
                Change
              </Button>
            </InputRightElement>
          </InputGroup>
        </form>
      </Tooltip>
      {hasAiKey && (
        <HStack spacing={2} mt={2} flexWrap="wrap">
          <Text fontSize="xs" color={muted}>
            Try:
          </Text>
          {EXAMPLES.map((ex) => (
            <Tag key={ex} size="sm" variant="subtle" colorScheme="brand" cursor="pointer" onClick={() => void submit(ex)} opacity={edit.isPending ? 0.5 : 1}>
              {ex}
            </Tag>
          ))}
        </HStack>
      )}
    </Box>
  );
}
