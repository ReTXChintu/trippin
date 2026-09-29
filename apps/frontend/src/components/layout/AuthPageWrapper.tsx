import { Box, Flex } from "@chakra-ui/react";
import { MobileAppDownloadButton } from "@/components/layout/MobileAppDownloadButton";

interface AuthPageWrapperProps {
  children: React.ReactNode;
}

export function AuthPageWrapper({ children }: AuthPageWrapperProps) {
  const bg = "bg.canvas";

  return (
    <Flex minH="100vh" align="center" justify="center" bg={bg} p={4} position="relative">
      <Box position="absolute" top={4} right={4}>
        <MobileAppDownloadButton />
      </Box>
      {children}
    </Flex>
  );
}
