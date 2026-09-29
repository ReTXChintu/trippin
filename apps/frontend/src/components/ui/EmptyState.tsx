import {
  Box,
  Button,
  Heading,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { FiInbox } from "react-icons/fi";

interface EmptyStateProps {
  icon?: IconType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export function EmptyState({
  icon = FiInbox,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Box
      py={12}
      px={6}
      textAlign="center"
      borderWidth="1px"
      borderRadius="xl"
      borderStyle="dashed"
      borderColor="border.line"
      _dark={{ borderColor: "gray.600", bg: "gray.800" }}
      bg="bg.surface"
    >
      <VStack spacing={4}>
        <Icon as={icon} boxSize={10} color="brand.500" />
        <Heading size="md">{title}</Heading>
        {description && (
          <Text color="fg.muted" maxW="md">
            {description}
          </Text>
        )}
        {actionLabel && onAction && (
          <Button colorScheme="brand" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </VStack>
    </Box>
  );
}
