import { Box, Drawer, DrawerContent, DrawerOverlay, Flex, useDisclosure } from "@chakra-ui/react";
import { useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Rail, Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";

interface AppLayoutProps {
  children: React.ReactNode;
}

const TRIP_WORKSPACE = /^\/trips\/(?!new(?:\/|$))[^/]+/;

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname === "/trips") return "My trips";
  if (pathname.startsWith("/trips/new")) return "New trip";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/invite")) return "Join a trip";
  if (/\/today$/.test(pathname)) return "Today";
  if (/\/itinerary\/compare/.test(pathname)) return "Compare with AI plan";
  if (TRIP_WORKSPACE.test(pathname)) return "Trip workspace";
  return "Trippin'";
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { pathname } = useLocation();
  const inTrip = TRIP_WORKSPACE.test(pathname);

  return (
    <Flex minH="100vh" bg="bg">
      {/* Desktop navigation: full sidebar on app pages, slim rail inside a trip. */}
      <Box flexShrink={0} display={{ base: "none", lg: "block" }} position="sticky" top={0} h="100vh">
        {inTrip ? <Rail /> : <Sidebar />}
      </Box>

      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="248px">
          <Sidebar onNavigate={onClose} />
        </DrawerContent>
      </Drawer>

      <Flex direction="column" flex={1} minW={0}>
        <OfflineBanner />
        <Navbar title={pageTitle(pathname)} onToggleSidebar={onOpen} />
        {/* overflow-x "clip" (not "auto") so the content box isn't a scroll container — that would
            silently break position: sticky for anything inside pages. */}
        <Box
          as="main"
          flex={1}
          minW={0}
          px={inTrip ? { base: 4, md: 6, lg: 8 } : { base: 4, md: 6, lg: 8 }}
          pt={inTrip ? { base: 4, md: 5 } : { base: 4, md: 6 }}
          pb={{ base: "96px", lg: 12 }}
          overflowX="clip"
        >
          {children}
        </Box>
      </Flex>

      {!inTrip && <BottomNav />}
    </Flex>
  );
}
