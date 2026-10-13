import { Box, Flex, HStack, Icon, Text, Textarea } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { LuSparkles } from "react-icons/lu";
import { ChoiceChip } from "@/components/ui";

/**
 * "Special instructions" for the AI plan: free text the AI follows first ("keep these on day 1").
 * Places the instructions pin to a day are locked in the result, so timing doesn't move them.
 */
export function AiInstructions({
  value,
  onChange,
  examples,
  disabled,
  action,
}: {
  value: string;
  onChange: (v: string) => void;
  examples: string[];
  disabled?: boolean;
  action?: ReactNode;
}) {
  const append = (ex: string) => onChange(value.trim() ? `${value.trim().replace(/[.;,]?$/, ".")} ${ex}` : ex);
  return (
    <Box textAlign="left">
      <HStack spacing={1.5} mb={1.5}>
        <Icon as={LuSparkles} boxSize="14px" color="accent.text" />
        <Text as="label" htmlFor="ai-instructions" fontSize="13px" fontWeight={600}>
          Special instructions for AI
        </Text>
        <Text fontSize="12px" color="fg.muted">
          optional
        </Text>
      </HStack>
      <Textarea
        id="ai-instructions"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Keep Amber Fort and Hawa Mahal on day 1. No early starts."
        rows={2}
        maxLength={1000}
        isDisabled={disabled}
        resize="vertical"
        fontSize="14px"
      />
      <Flex mt={2} gap={2} wrap="wrap" align="center" justify="space-between">
        <Flex gap="6px" wrap="wrap" align="center" minW={0}>
          <Text fontSize="12px" color="fg.muted">
            Try
          </Text>
          {examples.map((ex) => (
            <ChoiceChip key={ex} onClick={() => !disabled && append(ex)} maxW="full" title={ex}>
              <Text as="span" noOfLines={1}>
                {ex}
              </Text>
            </ChoiceChip>
          ))}
        </Flex>
        {action}
      </Flex>
      <Text fontSize="12px" color="fg.muted" mt={2}>
        AI follows these first. Places you tie to a day are locked there.
      </Text>
    </Box>
  );
}
