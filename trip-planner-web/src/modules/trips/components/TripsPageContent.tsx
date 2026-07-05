"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  Tab,
  TabList,
  Tabs,
  Text,
} from "@chakra-ui/react";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { useMemo, useState } from "react";
import { TripCard } from "@/components/trips/TripCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripStatus } from "@/types";

interface TripsPageContentProps {
  trips: Trip[];
}

const TABS: { label: string; value: TripStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
];

export function TripsPageContent({ trips }: TripsPageContentProps) {
  const [activeTab, setActiveTab] = useState(0);

  const filteredTrips = useMemo(() => {
    const tab = TABS[activeTab];
    if (tab.value === "all") return trips;
    return trips.filter((t) => t.status === tab.value);
  }, [trips, activeTab]);

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
        <Button as={Link} href="/trips/new" leftIcon={<FiPlus />} colorScheme="brand">
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
