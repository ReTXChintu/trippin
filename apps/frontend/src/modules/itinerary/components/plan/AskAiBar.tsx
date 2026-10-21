import { Button, Flex, Icon, IconButton, Input, Text, useToast } from "@chakra-ui/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { LuArrowRight, LuCheck, LuSparkles, LuUndo2 } from "react-icons/lu";
import { getApiErrorMessage } from "@/lib/api";
import { useAiEditPlan, useUndoItinerary } from "@/modules/itinerary/hooks/useItinerary";
import { Snackbar } from "@/components/ui/plan";
import { AiWorkingPanel } from "@/components/states";

interface AskAiBarProps {
  tripId: string;
  hasAiKey: boolean;
  /** The trip owner can add the key themselves; others are told who can. */
  isOwner?: boolean;
  /** Example prompts shown as "Try" chips. */
  examples?: string[];
  /** Phone: single-line input with a round send button. */
  compact?: boolean;
}

const DEFAULT_EXAMPLES = ["Make the busiest day lighter", "Keep mornings for the big sights", "Add a rooftop dinner", "Fewer walks"];

/** "Tell the AI what to change" — it proposes moves/removals/re-orders and the planner applies and
 * re-times them. Every change is one Undo away. */
export function AskAiBar({ tripId, hasAiKey, isOwner = true, examples = DEFAULT_EXAMPLES, compact }: AskAiBarProps) {
  const toast = useToast();
  const edit = useAiEditPlan(tripId);
  const undo = useUndoItinerary(tripId);
  const [text, setText] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  const submit = async (instruction = text) => {
    if (!instruction.trim() || edit.isPending) return;
    setWorking(instruction.trim());
    try {
      const result = await edit.mutateAsync(instruction.trim());
      if (result.applied > 0) {
        setText("");
        toast({
          duration: 8000,
          position: "bottom",
          render: ({ onClose }) => (
            <Snackbar
              icon={LuCheck}
              action={
                <Button
                  size="sm"
                  variant="unstyled"
                  display="inline-flex"
                  alignItems="center"
                  gap={1.5}
                  h="36px"
                  px={3}
                  color="bg"
                  fontSize="14px"
                  fontWeight={700}
                  textDecoration="underline"
                  textUnderlineOffset="3px"
                  _hover={{ opacity: 0.85 }}
                  leftIcon={<LuUndo2 size={16} />}
                  onClick={() => {
                    onClose();
                    undo.mutate(undefined, {
                      onError: (err) => toast({ title: getApiErrorMessage(err), status: "error" }),
                    });
                  }}
                >
                  Undo
                </Button>
              }
            >
              {result.summary}
            </Snackbar>
          ),
        });
      } else {
        toast({ title: "No changes made", description: result.summary, status: "info", duration: 7000, isClosable: true });
      }
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 6000 });
    } finally {
      setWorking(null);
    }
  };

  // ---------------- No AI key ----------------
  if (!hasAiKey) {
    return (
      <Flex align="center" gap={2} minH="44px">
        <Icon as={LuSparkles} boxSize="16px" color="ac" flexShrink={0} />
        <Text fontSize="13px" color="tx3" flex={1}>
          {isOwner ? "Ask AI needs an AI key." : "Ask AI is off — the owner needs an AI key."}
        </Text>
        {isOwner && (
          <Button as={Link} to="/profile" variant="ai" size="sm" rightIcon={<LuArrowRight size={14} />}>
            Set up AI
          </Button>
        )}
      </Flex>
    );
  }

  // ---------------- Working ----------------
  if (working) {
    return (
      <AiWorkingPanel
        title={`${working.replace(/[.…]+$/, "")}…`}
        note="Your plan doesn't change until AI finishes. One Undo will revert it."
        boxShadow="ds1"
        py={compact ? 3 : 4}
      />
    );
  }

  const form = (
    <Flex
      as="form"
      align="center"
      gap="10px"
      onSubmit={(e: React.FormEvent) => {
        e.preventDefault();
        void submit();
      }}
    >
      {compact ? (
        <>
          <Flex flex={1} align="center" gap={2} h="44px" px={3} borderWidth="1px" borderColor="ln" borderRadius="md" bg="sf">
            <Icon as={LuSparkles} boxSize="16px" color="ac" />
            <Input
              variant="unstyled"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask AI: make day 2 lighter"
              aria-label="Ask AI to change the plan"
              fontSize="14px"
            />
          </Flex>
          <IconButton type="submit" aria-label="Send to AI" icon={<LuArrowRight size={18} />} size="lg" isDisabled={!text.trim()} />
        </>
      ) : (
        <>
          <Icon as={LuSparkles} boxSize="18px" color="ac" flexShrink={0} />
          <Input
            variant="unstyled"
            h="36px"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask AI to change the plan… e.g. “make day 2 lighter”"
            aria-label="Ask AI to change the plan"
            fontSize="14px"
          />
          <Button type="submit" leftIcon={<LuArrowRight size={16} />} isDisabled={!text.trim()}>
            Ask
          </Button>
        </>
      )}
    </Flex>
  );

  if (compact) return form;

  return (
    <Flex direction="column" gap={2} bg="sf" borderWidth="1px" borderColor="ln" borderRadius="xl" boxShadow="ds1" px="14px" py={3}>
      {form}
      <Flex gap="6px" flexWrap="wrap" align="center">
        <Text fontSize="12px" color="tx3" mr="2px">
          Try
        </Text>
        {examples.map((ex) => (
          <Flex
            key={ex}
            as="button"
            type="button"
            onClick={() => void submit(ex)}
            align="center"
            h="32px"
            px={3}
            borderRadius="full"
            borderWidth="1px"
            borderColor="ln"
            bg="sf"
            fontSize="13px"
            fontWeight={500}
            whiteSpace="nowrap"
            _hover={{ bg: "sunk" }}
          >
            {ex}
          </Flex>
        ))}
      </Flex>
      <Text fontSize="12px" color="tx3">
        AI edits are applied, re-timed and can be undone in one step.
      </Text>
    </Flex>
  );
}
