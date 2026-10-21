import { Flex, Icon, Text } from "@chakra-ui/react";
import { FiWifiOff } from "react-icons/fi";
import { useOnlineStatus } from "@/components/states/useOnlineStatus";

/** Shown while the device is offline: the app keeps working from the last copy it saw. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <Flex
      role="status"
      align="center"
      justify="center"
      gap={2}
      minH="34px"
      px={4}
      py={1.5}
      bg="warnSoft"
      color="warn"
      fontSize="13px"
      fontWeight={600}
      textAlign="center"
      position="sticky"
      top={0}
      zIndex={1500}
    >
      <Icon as={FiWifiOff} boxSize="16px" flexShrink={0} />
      <Text>You're offline — showing saved data. Changes need a connection, so editing is paused.</Text>
    </Flex>
  );
}
