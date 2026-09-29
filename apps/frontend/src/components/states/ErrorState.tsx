import { Box, type BoxProps, Button, Flex, Icon, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";

/** "Couldn't load …" block: danger icon, Fraunces title, one reassuring line, Try again (+ optional second action). */
export function ErrorState({
  title = "Couldn't load this",
  text = "Your changes are safe. Check your connection and try again.",
  onRetry,
  retrying,
  secondaryAction,
  ...rest
}: {
  title?: string;
  text?: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  secondaryAction?: ReactNode;
} & BoxProps) {
  return (
    <Box role="alert" p={6} bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl" {...rest}>
      <Flex direction="column" align="flex-start" gap="10px">
        <Icon as={FiAlertTriangle} boxSize="24px" color="danger" />
        <Text as="h3" fontFamily="heading" fontWeight={600} fontSize="20px" letterSpacing="-0.01em">
          {title}
        </Text>
        {text && (
          <Text fontSize="13px" color="fg.muted">
            {text}
          </Text>
        )}
        {(onRetry || secondaryAction) && (
          <Flex gap={2} wrap="wrap">
            {onRetry && (
              <Button leftIcon={<FiRefreshCw />} onClick={onRetry} isLoading={retrying}>
                Try again
              </Button>
            )}
            {secondaryAction}
          </Flex>
        )}
      </Flex>
    </Box>
  );
}
