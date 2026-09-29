import {
  Box,
  Center,
  Flex,
  Heading,
  SimpleGrid,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Text,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FiMap, FiPlus } from "react-icons/fi";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { TripCard } from "@/components/trips/TripCard";
import { TripGeneratorCard } from "@/components/trips/TripGeneratorCard";
import { useAuthStore } from "@/store/authStore";
import { useDashboardQuery } from "@/modules/trips/hooks/useTrips";

export function DashboardContent() {
  const user = useAuthStore((s) => s.user);
  const statBg = "bg.surface";
  const borderColor = "border.line";
  const { data, isLoading } = useDashboardQuery();

  const firstName = user?.name?.split(" ")[0] ?? "Traveler";

  if (isLoading || !data) return <LoadingState />;

  const { stats, upcomingTrips, recentTrips } = data;

  return (
    <Box>
      <Box mb={8}>
        <Heading size="lg" mb={1}>
          Welcome back, {firstName}
        </Heading>
        <Text color="fg.muted">Plan smarter trips with AI-powered itineraries</Text>
      </Box>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={8}>
        {[
          { label: "Total Trips", value: stats.totalTrips, help: "All time" },
          { label: "Upcoming", value: stats.upcomingTrips, help: "Active & draft" },
          { label: "Completed", value: stats.completedTrips, help: "Past adventures" },
          { label: "Archived", value: stats.archivedTrips, help: "Saved for later" },
        ].map((stat) => (
          <Box key={stat.label} p={4} bg={statBg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
            <Stat>
              <StatLabel color="fg.muted">{stat.label}</StatLabel>
              <StatNumber>{stat.value}</StatNumber>
              <StatHelpText mb={0}>{stat.help}</StatHelpText>
            </Stat>
          </Box>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6} mb={8}>
        <TripGeneratorCard />

        <Box p={6} bg={statBg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
          <Heading size="md" mb={4}>
            Quick Actions
          </Heading>
          <Flex gap={3} flexWrap="wrap">
            <Box
              as={Link}
              to="/trips/new"
              p={4}
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="lg"
              flex="1"
              minW="140px"
              _hover={{ borderColor: "brand.300", bg: "brand.50", _dark: { bg: "brand.900" } }}
              transition="all 0.2s"
            >
              <Center flexDirection="column" gap={2}>
                <FiPlus size={24} />
                <Text fontWeight="medium" fontSize="sm">
                  Create Trip
                </Text>
              </Center>
            </Box>
            <Box
              as={Link}
              to="/trips"
              p={4}
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="lg"
              flex="1"
              minW="140px"
              _hover={{ borderColor: "brand.300", bg: "brand.50", _dark: { bg: "brand.900" } }}
              transition="all 0.2s"
            >
              <Center flexDirection="column" gap={2}>
                <FiMap size={24} />
                <Text fontWeight="medium" fontSize="sm">
                  View All Trips
                </Text>
              </Center>
            </Box>
          </Flex>
        </Box>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Box>
          <Heading size="md" mb={4}>
            Upcoming Trips
          </Heading>
          {upcomingTrips.length === 0 ? (
            <EmptyState
              icon={FiMap}
              title="No upcoming trips"
              description="Create a trip or use the trip generator to get started."
              actionLabel="Create Trip"
              onAction={() => {
                window.location.href = "/trips/new";
              }}
            />
          ) : (
            <SimpleGrid columns={1} spacing={3}>
              {upcomingTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  id={trip.id}
                  title={trip.title}
                  destinationCity={trip.destinationCity}
                  destinationCountry={trip.destinationCountry}
                  startDate={trip.startDate}
                  endDate={trip.endDate}
                  status={trip.status}
                />
              ))}
            </SimpleGrid>
          )}
        </Box>

        <Box>
          <Heading size="md" mb={4}>
            Recent Trips
          </Heading>
          {recentTrips.length === 0 ? (
            <EmptyState
              icon={FiMap}
              title="No recent trips"
              description="Your recently viewed and edited trips will appear here."
            />
          ) : (
            <SimpleGrid columns={1} spacing={3}>
              {recentTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  id={trip.id}
                  title={trip.title}
                  destinationCity={trip.destinationCity}
                  destinationCountry={trip.destinationCountry}
                  startDate={trip.startDate}
                  endDate={trip.endDate}
                  status={trip.status}
                />
              ))}
            </SimpleGrid>
          )}
        </Box>
      </SimpleGrid>
    </Box>
  );
}
