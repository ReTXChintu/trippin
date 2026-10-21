import { Box, type BoxProps, Button, Flex, Icon, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";

/** "Couldn't load …" block: critical icon tile, 17/24 title, one reassuring line, Try again (+ optional second action). */
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
    <Box role="alert" p={5} bg="sf" borderWidth="1px" borderColor="ln" borderRadius="xl" {...rest}>
      <Flex direction="column" align="flex-start" gap={3}>
        <Flex w="40px" h="40px" borderRadius="md" bg="critSoft" color="crit" align="center" justify="center">
          <Icon as={FiAlertTriangle} boxSize="20px" />
        </Flex>
        <Text as="h3" fontWeight={600} fontSize="17px" lineHeight="24px">
          {title}
        </Text>
        {text && (
          <Text fontSize="14px" lineHeight="20px" color="tx2">
            {text}
          </Text>
        )}
        {(onRetry || secondaryAction) && (
          <Flex gap={2} wrap="wrap">
            {onRetry && (
              <Button variant="outline" leftIcon={<FiRefreshCw />} onClick={onRetry} isLoading={retrying}>
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
