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
    <Flex role="note" align="center" gap={3} px={4} py={3} bg="acSoft" color="tx" borderRadius="lg" {...rest}>
      <Icon as={FiEye} boxSize="20px" flexShrink={0} color="ac" />
      <Text flex={1} fontSize="14px" lineHeight="20px" fontWeight={500} minW={0}>
        {children}
      </Text>
      {action}
    </Flex>
  );
}
