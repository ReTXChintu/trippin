import { Box, Button, Center, Flex, HStack } from "@chakra-ui/react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiEye, FiLink, FiPlus, FiPrinter } from "react-icons/fi";
import { BRAND_NAME, BrandLogo } from "@/components/brand/BrandLogo";
import { EmptyState, Pill } from "@/components/ui";
import { LoadingState } from "@/components/ui/LoadingState";
import { PublicTripView } from "@/modules/trips/components/PublicTripView";
import { getSharedTrip } from "@/modules/share/api/share.api";
import { useAuthStore } from "@/store/authStore";

function ShareBar() {
  const user = useAuthStore((s) => s.user);
  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      gap={3}
      h="72px"
      px={{ base: 4, md: 6, lg: 8 }}
      bg="bg"
      borderBottomWidth="1px"
      borderColor="ln"
      position="sticky"
      top={0}
      zIndex="sticky"
    >
      <HStack spacing={4} minW={0}>
        <RouterLink to="/" aria-label={`${BRAND_NAME} home`}>
          <BrandLogo />
        </RouterLink>
        <Pill tone="accent" icon={FiEye} display={{ base: "none", sm: "inline-flex" }}>
          View only
        </Pill>
      </HStack>
      <HStack spacing={2} className="no-print">
        <Button variant="outline" leftIcon={<FiPrinter size={18} />} onClick={() => window.print()} display={{ base: "none", md: "inline-flex" }}>
          Print / PDF
        </Button>
        <Button as={RouterLink} to={user ? "/trips/new" : `/login?callbackUrl=${encodeURIComponent("/trips/new")}`} leftIcon={<FiPlus size={18} />}>
          Plan your own trip
        </Button>
      </HStack>
    </Flex>
  );
}

export function SharePageContent() {
  const { slug = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["share", slug],
    queryFn: () => getSharedTrip(slug),
    enabled: !!slug,
    retry: false,
  });

  return (
    <Box minH="100vh" bg="bg" sx={{ "@media print": { ".no-print": { display: "none !important" } } }}>
      <ShareBar />
      {isLoading ? (
        <LoadingState />
      ) : !data ? (
        <Center py={16} px={4}>
          <EmptyState icon={FiLink} title="Shared trip not found" text="The link may be wrong, or the owner stopped sharing this trip." />
        </Center>
      ) : (
        <PublicTripView trip={data.trip} itinerary={data.itinerary} />
      )}
    </Box>
  );
}
