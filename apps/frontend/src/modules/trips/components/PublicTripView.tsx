import {
  Badge,
  Box,
  Heading,
  SimpleGrid,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Text,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { DayTimeline } from "@/modules/itinerary/components/DayTimeline";
import { MapView } from "@/modules/itinerary/components/MapView";
import type { Itinerary } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";

interface PublicTripViewProps {
  trip: Trip;
  itinerary?: Itinerary | null;
}

function formatDate(date: string) {
  try {
    return format(parseISO(date), "MMM d, yyyy");
  } catch {
    return date;
  }
}

export function PublicTripView({ trip, itinerary = null }: PublicTripViewProps) {
  const [activeTab, setActiveTab] = useState(0);
  const bg = "bg.surface";
  const borderColor = "border.line";
  const summaryBg = "accent.soft";

  const hasItinerary = Boolean(itinerary?.days.some((d) => d.stops.length > 0));
  const activeDay = itinerary?.days[activeTab] ?? null;

  return (
    <Box maxW="5xl" mx="auto" py={10} px={4}>
      <Box textAlign="center" mb={8}>
        <Badge colorScheme="brand" mb={3}>
          Shared Trip
        </Badge>
        <Heading size="xl" mb={2}>
          {trip.title}
        </Heading>
        <Text color="fg.muted" fontSize="lg">
          {trip.destinationCity}
          {trip.destinationState ? `, ${trip.destinationState}` : ""}, {trip.destinationCountry}
        </Text>
        <Text color="fg.muted" mt={1}>
          {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
        </Text>
      </Box>

      {itinerary?.summary && (
        <Box mb={6} p={5} bg={summaryBg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
          <Heading size="sm" mb={2}>
            Trip Summary
          </Heading>
          <Text fontSize="sm" whiteSpace="pre-wrap" lineHeight="tall">
            {itinerary.summary}
          </Text>
        </Box>
      )}

      {hasItinerary && itinerary ? (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={8}>
          <Box>
            <Heading size="md" mb={4}>
              Itinerary
            </Heading>
            <Tabs index={activeTab} onChange={setActiveTab} variant="soft-rounded" colorScheme="brand">
              <TabList flexWrap="wrap" gap={1} mb={4}>
                {itinerary.days.map((day) => (
                  <Tab key={day.dayNumber} fontSize="sm">
                    Day {day.dayNumber}
                  </Tab>
                ))}
              </TabList>
              <TabPanels>
                {itinerary.days.map((day) => (
                  <TabPanel key={day.dayNumber} p={0}>
                    <DayTimeline day={day} readOnly />
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </Box>

          <Box h="400px" borderWidth="1px" borderColor={borderColor} borderRadius="xl" overflow="hidden">
            <MapView day={activeDay} hotelCoordinates={trip.hotelCoordinates} height="100%" />
          </Box>
        </SimpleGrid>
      ) : (
        <Box
          mb={8}
          p={5}
          bg={bg}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="xl"
          borderStyle="dashed"
          textAlign="center"
        >
          <Text color="fg.muted" fontSize="sm">
            The itinerary has not been shared yet.
          </Text>
        </Box>
      )}

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        <Box p={5} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
          <Heading size="sm" mb={3}>
            Trip Details
          </Heading>
          <Stack spacing={2} fontSize="sm">
            <Text>Style: {trip.travelStyle}</Text>
            <Text>Transport: {trip.transportationMode}</Text>
            <Text>
              Hours: {trip.dailyStartTime} – {trip.dailyEndTime}
            </Text>
            {trip.hotelName && <Text>Stay: {trip.hotelName}</Text>}
          </Stack>
        </Box>

        {trip.interests.length > 0 && (
          <Box p={5} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
            <Heading size="sm" mb={3}>
              Interests
            </Heading>
            <Wrap>
              {trip.interests.map((interest) => (
                <WrapItem key={interest}>
                  <Tag colorScheme="brand">{interest}</Tag>
                </WrapItem>
              ))}
            </Wrap>
          </Box>
        )}
      </SimpleGrid>

      {trip.notes && (
        <Box mt={6} p={5} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
          <Heading size="sm" mb={2}>
            Notes
          </Heading>
          <Text fontSize="sm" whiteSpace="pre-wrap">
            {trip.notes}
          </Text>
        </Box>
      )}
    </Box>
  );
}
