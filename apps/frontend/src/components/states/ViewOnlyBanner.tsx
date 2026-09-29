import { Flex, type FlexProps, Icon, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { FiEye } from "react-icons/fi";

/** Soft-accent strip for view-only members. `action` is an optional link/button on the right. */
export function ViewOnlyBanner({
  children = "You can view this trip, vote and comment.",
  action,
  ...rest
}: { children?: ReactNode; action?: ReactNode } & FlexProps) {
  return (
    <Flex role="note" align="center" gap="10px" px="14px" py="10px" bg="accent.soft" color="accent.text" borderRadius="md" {...rest}>
      <Icon as={FiEye} boxSize="16px" flexShrink={0} />
      <Text flex={1} fontSize="12px" fontWeight={600} minW={0}>
        {children}
      </Text>
      {action}
    </Flex>
  );
}
