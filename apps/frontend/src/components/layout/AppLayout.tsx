import {
  Box,
  Drawer,
  DrawerContent,
  DrawerOverlay,
  Flex,
  useDisclosure,
} from "@chakra-ui/react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Flex direction="column" minH="100vh">
      <Navbar onToggleSidebar={onOpen} />

      <Flex flex={1}>
        <Box
          w="260px"
          flexShrink={0}
          display={{ base: "none", lg: "block" }}
          position="sticky"
          top="16"
          h="calc(100vh - 4rem)"
        >
          <Sidebar />
        </Box>

        <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
          <DrawerOverlay />
          <DrawerContent>
            <Sidebar onNavigate={onClose} />
          </DrawerContent>
        </Drawer>

        <Box flex={1} p={{ base: 4, md: 6, lg: 8 }} overflow="auto">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
