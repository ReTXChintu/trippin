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
    <SurfaceCard px={{ base: "14px", md: "18px" }} py={{ base: "12px", md: "16px" }} display="flex" flexDirection="column" gap="4px">
      <HStack spacing="6px" fontSize="12px" color="fg.muted">
        <Icon as={icon} boxSize="14px" display={{ base: "none", md: "block" }} />
        <Text>{label}</Text>
      </HStack>
      {value === undefined ? (
        <Skeleton h={{ base: "29px", md: "37px" }} w="40px" />
      ) : (
        <Text fontFamily="heading" fontWeight={600} fontSize={{ base: "26px", md: "34px" }} lineHeight={1.1}>
          {value}
        </Text>
      )}
    </SurfaceCard>
  );
}

function DashedNote({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Flex align="center" gap="12px" px="16px" py="14px" borderWidth="1px" borderStyle="dashed" borderColor="border.line" borderRadius="xl" wrap="wrap">
      <Icon as={FiInfo} color="fg.muted" boxSize="16px" />
      <Text fontSize="12px" color="fg.muted" flex={1} minW="180px">
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
    <Stack spacing={{ base: "16px", md: "24px" }}>
      <Flex justify="space-between" align="center" gap="16px">
        <Box minW={0}>
          <Overline>{format(now, "EEEE d MMMM")}</Overline>
          <Heading as="h1" fontSize={{ base: "28px", md: "34px" }} lineHeight={1.15} mt="4px">
            {greeting(now)}, {firstName}
          </Heading>
        </Box>
        <Button as={RouterLink} to="/trips/new" size="lg" leftIcon={<FiPlus />} display={{ base: "none", md: "inline-flex" }} flexShrink={0}>
          New trip
        </Button>
      </Flex>

      <TripGeneratorCard />

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: "10px", md: "16px" }} aria-label="Trip counts">
        <Stat icon={FiBriefcase} label="Total trips" value={stats?.totalTrips} />
        <Stat icon={FiCalendar} label="Upcoming" value={stats?.upcomingTrips} />
        <Stat icon={FiCompass} label="Active" value={activeCount} />
        <Stat icon={FiCheck} label="Completed" value={stats?.completedTrips} />
      </SimpleGrid>

      <Grid templateColumns={{ base: "minmax(0, 1fr)", xl: "minmax(0, 1fr) 400px" }} gap="24px" alignItems="start">
        <Stack as="section" spacing={{ base: "10px", md: "12px" }} aria-labelledby="upcoming-title" minW={0}>
          <Flex justify="space-between" align="center">
            <Heading as="h2" id="upcoming-title" fontSize={{ base: "16px", md: "22px" }} fontFamily={{ base: "body", md: "heading" }}>
              Upcoming
            </Heading>
            <Link as={RouterLink} to="/trips" fontSize="12px" fontWeight={600} color="accent.text" textDecoration="underline">
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
                <Button as={RouterLink} to="/trips/new" size="sm" variant="outline" leftIcon={<FiPlus />}>
                  New trip
                </Button>
              }
            >
              No upcoming trips — describe one above, or set one up step by step.
            </DashedNote>
          ) : (
            <>
              <Grid templateColumns="repeat(auto-fill, minmax(260px, 1fr))" gap="16px" display={{ base: "none", md: "grid" }}>
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
          <Heading as="h2" id="recent-title" fontSize={{ base: "16px", md: "22px" }} fontFamily={{ base: "body", md: "heading" }} lineHeight="30px">
            Recent
          </Heading>
          {isLoading ? (
            <Skeleton h="206px" borderRadius="xl" />
          ) : recent.length === 0 ? (
            <DashedNote>No recent trips yet — describe one above.</DashedNote>
          ) : (
            <SurfaceCard overflow="hidden">
              {recent.map((trip, i) => (
                <Box key={trip.id} borderTopWidth={i === 0 ? 0 : "1px"} borderColor="border.line">
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
