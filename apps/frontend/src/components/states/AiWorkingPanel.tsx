import { Box, type BoxProps, Button, Flex, HStack, Icon, Stack, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { FiCheck, FiClock, FiX } from "react-icons/fi";
import { LuSparkles } from "react-icons/lu";

const slide = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
`;

export interface AiStep {
  label: string;
  done?: boolean;
}

/**
 * "AI is working" panel: title, progress bar, optional step list, optional Cancel and a note.
 * Without `progress` (0–100) the bar is indeterminate — use that when real progress isn't known.
 */
export function AiWorkingPanel({
  title,
  progress,
  steps,
  onCancel,
  note = "Your plan doesn't change until AI finishes.",
  ...rest
}: {
  title: string;
  progress?: number;
  steps?: AiStep[];
  onCancel?: () => void;
  note?: string;
} & BoxProps) {
  return (
    <Box role="status" aria-live="polite" bg="sf" borderWidth="1px" borderColor="ln" borderRadius="xl" p={4} {...rest}>
      <Stack spacing="10px">
        <HStack spacing={2} fontWeight={600} fontSize="15px" lineHeight="20px">
          <Icon as={LuSparkles} color="ac" boxSize="18px" />
          <Text>{title}</Text>
        </HStack>
        <Box h="6px" borderRadius="full" bg="sunk" overflow="hidden" position="relative">
          {progress === undefined ? (
            <Box
              position="absolute"
              insetY={0}
              w="40%"
              bg="ac"
              borderRadius="full"
              animation={`${slide} 1.3s ease-in-out infinite`}
              sx={{ "@media (prefers-reduced-motion: reduce)": { animation: "none", left: "30%" } }}
            />
          ) : (
            <Box h="100%" w={`${Math.max(0, Math.min(100, progress))}%`} bg="ac" borderRadius="full" transition="width .3s" />
          )}
        </Box>
        {steps && steps.length > 0 && (
          <Stack spacing="6px" fontSize="13px">
            {steps.map((s) => (
              <HStack key={s.label} spacing={2} color={s.done ? "tx" : "tx3"}>
                <Icon as={s.done ? FiCheck : FiClock} boxSize="14px" />
                <Text>{s.label}</Text>
              </HStack>
            ))}
          </Stack>
        )}
        {(onCancel || note) && (
          <Flex gap={2} align="center">
            {onCancel && (
              <Button variant="outline" leftIcon={<FiX />} onClick={onCancel} flexShrink={0}>
                Cancel
              </Button>
            )}
            {note && (
              <Text fontSize="12px" color="tx3">
                {note}
              </Text>
            )}
          </Flex>
        )}
      </Stack>
    </Box>
  );
}
