import { Button, Flex, Icon, Text } from "@chakra-ui/react";
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

/** Full empty state (§7.11): dashed box, 48 neutral icon tile, title, one line, one primary action. */
export function EmptyState({ icon = FiInbox, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Flex
      direction="column"
      align="center"
      textAlign="center"
      gap={3}
      py={12}
      px={6}
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="ln2"
      borderRadius="xl"
    >
      <Flex w="48px" h="48px" borderRadius="md" bg="sunk" color="tx3" align="center" justify="center">
        <Icon as={icon} boxSize="24px" />
      </Flex>
      <Text as="h2" fontWeight={600} fontSize="17px" lineHeight="24px">
        {title}
      </Text>
      {description && (
        <Text color="tx2" fontSize="15px" lineHeight="22px" maxW="440px">
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button size="lg" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Flex>
  );
}
