import { Box, HStack, Icon, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FiWifiOff } from "react-icons/fi";

/** Shown while the device is offline: the app keeps working from the last copy it saw. */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (online) return null;
  return (
    <Box bg="fg.default" color="bg.canvas" px={4} py={1.5} position="sticky" top={0} zIndex={1500}>
      <HStack justify="center" spacing={2} fontSize="sm">
        <Icon as={FiWifiOff} />
        <Text>You're offline — showing the last saved copy of your trips. Changes need a connection.</Text>
      </HStack>
    </Box>
  );
}
