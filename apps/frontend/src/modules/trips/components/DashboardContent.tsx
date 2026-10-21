import { Box, Button, Flex, Grid, Heading, HStack, Icon, Link, SimpleGrid, Skeleton, Stack, Text } from "@chakra-ui/react";
import { format } from "date-fns";
import type { IconType } from "react-icons";
import { FiBriefcase, FiCalendar, FiCheck, FiCompass, FiInfo, FiPlus } from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import { Overline, SurfaceCard } from "@/components/ui";
import { TripCard } from "@/components/trips/TripCard";
import { TripGeneratorCard } from "@/components/trips/TripGeneratorCard";
import { useAuthStore } from "@/store/authStore";
import { useDashboardQuery, useTripsQuery } from "@/modules/trips/hooks/useTrips";

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Stat({ icon, label, value }: { icon: IconType; label: string; value: number | undefined }) {
  return (
    <SurfaceCard p={4} display="flex" flexDirection="column" gap="6px">
      <HStack spacing={2} fontSize="12px" lineHeight="16px" fontWeight={600} letterSpacing="0.02em" color="tx2">
        <Icon as={icon} boxSize="16px" display={{ base: "none", md: "block" }} />
        <Text>{label}</Text>
      </HStack>
      {value === undefined ? (
        <Skeleton h="28px" w="40px" />
      ) : (
        <Text fontWeight={600} fontSize="22px" lineHeight="28px" className="num">
          {value}
        </Text>
      )}
    </SurfaceCard>
  );
}

function DashedNote({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Flex align="center" gap={3} px={4} py="14px" borderWidth="1px" borderStyle="dashed" borderColor="ln2" borderRadius="lg" wrap="wrap">
      <Flex w="40px" h="40px" borderRadius="md" bg="sunk" color="tx3" align="center" justify="center" flexShrink={0}>
        <Icon as={FiInfo} boxSize="20px" />
      </Flex>
      <Text fontSize="13px" lineHeight="18px" color="tx2" flex={1} minW="180px">
        {children}
      </Text>
      {action}
    </Flex>
  );
}

export function DashboardContent() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useDashboardQuery();
  const { data: trips } = useTripsQuery();

  const firstName = user?.name?.split(" ")[0] ?? "traveller";
  const now = new Date();
  const isOwner = (userId: string) => userId === user?.id;

  const stats = data?.stats;
  const activeCount = stats?.activeTrips ?? trips?.filter((t) => t.status === "active").length;
  const upcoming = data?.upcomingTrips ?? [];
  const recent = data?.recentTrips ?? [];

  return (
    <Stack spacing={{ base: 4, md: 5 }}>
      <Flex justify="space-between" align="center" gap="16px">
        <Box minW={0}>
          <Overline>{format(now, "EEEE d MMMM")}</Overline>
          <Heading as="h1" fontSize="22px" lineHeight="28px" mt={1}>
            {greeting(now)}, {firstName}
          </Heading>
        </Box>
        <Button as={RouterLink} to="/trips/new" leftIcon={<FiPlus size={18} />} display={{ base: "none", md: "inline-flex" }} flexShrink={0}>
          New trip
        </Button>
      </Flex>

      <TripGeneratorCard />

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 3, md: 4 }} aria-label="Trip counts">
        <Stat icon={FiBriefcase} label="Total trips" value={stats?.totalTrips} />
        <Stat icon={FiCalendar} label="Upcoming" value={stats?.upcomingTrips} />
        <Stat icon={FiCompass} label="Active" value={activeCount} />
        <Stat icon={FiCheck} label="Completed" value={stats?.completedTrips} />
      </SimpleGrid>

      <Grid templateColumns={{ base: "minmax(0, 1fr)", xl: "minmax(0, 2fr) minmax(360px, 1fr)" }} gap={5} alignItems="start">
        <Stack as="section" spacing={{ base: "10px", md: "12px" }} aria-labelledby="upcoming-title" minW={0}>
          <Flex justify="space-between" align="center">
            <Heading as="h2" id="upcoming-title" fontSize="17px" lineHeight="24px">
              Upcoming
            </Heading>
            <Link as={RouterLink} to="/trips" fontSize="14px" fontWeight={600}>
              See all trips
            </Link>
          </Flex>
          {isLoading ? (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing="16px">
              <Skeleton h="250px" borderRadius="xl" />
              <Skeleton h="250px" borderRadius="xl" display={{ base: "none", md: "block" }} />
            </SimpleGrid>
          ) : upcoming.length === 0 ? (
            <DashedNote
              action={
                <Button as={RouterLink} to="/trips/new" size="sm" variant="outline" leftIcon={<FiPlus size={16} />}>
                  New trip
                </Button>
              }
            >
              No upcoming trips — describe one above, or set one up step by step.
            </DashedNote>
          ) : (
            <>
              <Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={4} display={{ base: "none", md: "grid" }}>
                {upcoming.map((trip) => (
                  <TripCard key={trip.id} trip={trip} isOwner={isOwner(trip.userId)} footer="next" />
                ))}
              </Grid>
              <Stack spacing="10px" display={{ base: "flex", md: "none" }}>
                {upcoming.map((trip) => (
                  <TripCard key={trip.id} trip={trip} isOwner={isOwner(trip.userId)} variant="compact" footer="next" />
                ))}
              </Stack>
            </>
          )}
        </Stack>

        <Stack as="section" spacing="12px" aria-labelledby="recent-title" minW={0}>
          <Heading as="h2" id="recent-title" fontSize="17px" lineHeight="24px">
            Recent
          </Heading>
          {isLoading ? (
            <Skeleton h="206px" borderRadius="xl" />
          ) : recent.length === 0 ? (
            <DashedNote>No recent trips yet — describe one above.</DashedNote>
          ) : (
            <SurfaceCard overflow="hidden">
              {recent.map((trip, i) => (
                <Box key={trip.id} borderTopWidth={i === 0 ? 0 : "1px"} borderColor="ln">
                  <TripCard trip={trip} isOwner={isOwner(trip.userId)} variant="row" hideActions />
                </Box>
              ))}
            </SurfaceCard>
          )}
        </Stack>
      </Grid>
    </Stack>
  );
}
