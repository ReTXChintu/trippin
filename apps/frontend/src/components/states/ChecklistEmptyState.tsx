import { Box, type BoxProps, Flex, Icon, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiCheck } from "react-icons/fi";

export interface ChecklistStep {
  label: string;
  done?: boolean;
}

/** First-use empty state: icon tile, 17/24 title, numbered steps (done ones ticked) and one action. */
export function ChecklistEmptyState({
  icon,
  title,
  text,
  steps,
  action,
  ...rest
}: { icon?: IconType; title: string; text?: ReactNode; steps: ChecklistStep[]; action?: ReactNode } & BoxProps) {
  return (
    <Box bg="sf" borderWidth="1px" borderColor="ln" borderRadius="xl" p={5} {...rest}>
      <Stack spacing="10px">
        {icon && (
          <Flex w="40px" h="40px" borderRadius="md" bg="acSoft" color="ac" align="center" justify="center">
            <Icon as={icon} boxSize="20px" />
          </Flex>
        )}
        <Text as="h3" fontWeight={600} fontSize="17px" lineHeight="24px">
          {title}
        </Text>
        {text && (
          <Text fontSize="14px" lineHeight="20px" color="tx2">
            {text}
          </Text>
        )}
        <Stack as="ol" spacing="10px" listStyleType="none" m={0}>
          {steps.map((s, i) => (
            <Flex as="li" key={s.label} align="center" gap="10px">
              {s.done ? (
                <Flex w="24px" h="24px" borderRadius="full" bg="ac" color="acTx" align="center" justify="center" flexShrink={0}>
                  <Icon as={FiCheck} boxSize="13px" aria-label="Done" />
                </Flex>
              ) : (
                <Flex
                  w="24px"
                  h="24px"
                  borderRadius="full"
                  borderWidth="1.5px"
                  borderColor="ln2"
                  color="tx3"
                  fontSize="12px"
                  fontWeight={700}
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  {i + 1}
                </Flex>
              )}
              <Text color={s.done ? "tx3" : "tx"} fontWeight={s.done ? 400 : 600}>
                {s.label}
              </Text>
            </Flex>
          ))}
        </Stack>
        {action}
      </Stack>
    </Box>
  );
}
