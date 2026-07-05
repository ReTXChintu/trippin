import { Box, Button, Flex, Heading, Tab, TabList, Tabs, Text } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FiPlus } from "react-icons/fi";
import { useMemo, useState } from "react";
import { TripCard } from "@/components/trips/TripCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useTripsQuery } from "@/modules/trips/hooks/useTrips";
import type { TripStatus } from "@/types";

const TABS: { label: string; value: TripStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
];

export function TripsPageContent() {
  const [activeTab, setActiveTab] = useState(0);
  const { data: trips = [], isLoading } = useTripsQuery();

  const filteredTrips = useMemo(() => {
    const tab = TABS[activeTab];
    if (tab.value === "all") return trips;
    return trips.filter((t) => t.status === tab.value);
  }, [trips, activeTab]);

  if (isLoading) return <LoadingState />;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg" mb={1}>
            My Trips
          </Heading>
          <Text color="gray.500">
            {trips.length} trip{trips.length !== 1 ? "s" : ""} total
          </Text>
        </Box>
        <Button as={Link} to="/trips/new" leftIcon={<FiPlus />} colorScheme="brand">
          New Trip
        </Button>
      </Flex>

      <Tabs index={activeTab} onChange={setActiveTab} mb={6} variant="enclosed">
        <TabList flexWrap="wrap">
          {TABS.map((tab) => (
            <Tab key={tab.value}>{tab.label}</Tab>
          ))}
        </TabList>
      </Tabs>

      {filteredTrips.length === 0 ? (
        <EmptyState
          title="No trips found"
          description={
            activeTab === 0
              ? "Create your first trip to start planning."
              : `No ${TABS[activeTab].label.toLowerCase()} trips yet.`
          }
          actionLabel="Create Trip"
          onAction={() => {
            window.location.href = "/trips/new";
          }}
        />
      ) : (
        <Box
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }}
          gap={4}
        >
          {filteredTrips.map((trip) => (
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
        </Box>
      )}
    </Box>
  );
}
