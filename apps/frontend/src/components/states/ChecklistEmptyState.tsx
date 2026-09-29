import { Box, type BoxProps, Flex, Icon, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiCheck } from "react-icons/fi";

export interface ChecklistStep {
  label: string;
  done?: boolean;
}

/** First-use empty state: icon, Fraunces title, numbered steps (done ones ticked) and one action. */
export function ChecklistEmptyState({
  icon,
  title,
  text,
  steps,
  action,
  ...rest
}: { icon?: IconType; title: string; text?: ReactNode; steps: ChecklistStep[]; action?: ReactNode } & BoxProps) {
  return (
    <Box bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl" p="22px" {...rest}>
      <Stack spacing="10px">
        {icon && <Icon as={icon} boxSize="22px" color="accent" />}
        <Text as="h3" fontFamily="heading" fontWeight={600} fontSize="20px" letterSpacing="-0.01em">
          {title}
        </Text>
        {text && (
          <Text fontSize="13px" color="fg.muted">
            {text}
          </Text>
        )}
        <Stack as="ol" spacing="10px" listStyleType="none" m={0}>
          {steps.map((s, i) => (
            <Flex as="li" key={s.label} align="center" gap="10px">
              {s.done ? (
                <Flex w="24px" h="24px" borderRadius="full" bg="accent" color="accent.fg" align="center" justify="center" flexShrink={0}>
                  <Icon as={FiCheck} boxSize="13px" aria-label="Done" />
                </Flex>
              ) : (
                <Flex
                  w="24px"
                  h="24px"
                  borderRadius="full"
                  borderWidth="1.5px"
                  borderColor="border.line"
                  color="fg.muted"
                  fontSize="12px"
                  fontWeight={700}
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  {i + 1}
                </Flex>
              )}
              <Text color={s.done ? "fg.muted" : "fg.default"} fontWeight={s.done ? 400 : 600}>
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
