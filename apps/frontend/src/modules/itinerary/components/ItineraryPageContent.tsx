import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { FiArrowLeft, FiBookOpen, FiFileText, FiRefreshCw, FiZap } from "react-icons/fi";
import {
  useEnrichItinerary,
  useGenerateItinerary,
  useItineraryQuery,
  useOptimizeItinerary,
  useReorderItineraryStops,
  useSummarizeItinerary,
} from "@/modules/itinerary/hooks/useItinerary";
import { useTripQuery } from "@/modules/trips/hooks/useTrips";
import { getApiErrorMessage } from "@/lib/api";
import { DayTimeline } from "@/modules/itinerary/components/DayTimeline";
import { DestinationGuidePanel } from "@/modules/itinerary/components/DestinationGuidePanel";
import { ItineraryExportMenu, ItineraryPrintContent } from "@/modules/itinerary/components/ItineraryExportMenu";
import { MapView } from "@/modules/itinerary/components/MapView";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import { format, parseISO } from "date-fns";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

function formatDate(date: string) {
  try {
    return format(parseISO(date), "MMM d, yyyy");
  } catch {
    return date;
  }
}

export function ItineraryPageContent() {
  const { id = "" } = useParams();
  const toast = useToast();
  const { data: trip, isLoading: isTripLoading } = useTripQuery(id);
  const { data: itineraryData, isLoading: isItineraryLoading } = useItineraryQuery(id);
  const itinerary = itineraryData?.itinerary ?? null;

  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<"schedule" | "eat-shop" | "guide">("schedule");

  const generateItinerary = useGenerateItinerary(id);
  const summarizeItinerary = useSummarizeItinerary(id);
  const optimizeItinerary = useOptimizeItinerary(id);
  const enrichItinerary = useEnrichItinerary(id);
  const reorderStops = useReorderItineraryStops(id);

  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const summaryBg = useColorModeValue("brand.50", "gray.700");

  if (isTripLoading || isItineraryLoading) return <LoadingState />;
  if (!trip) return <EmptyState title="Trip not found" />;

  const activeDay = itinerary?.days[activeTab] ?? null;
  const hasStops = Boolean(itinerary?.days.some((d) => d.stops.length > 0));
  const legs = getEffectiveLegs(trip);
  const hasGuide = legs.some((l) => l.destinationBrief) || Boolean(trip.destinationBrief);
  const eatShopDays =
    itinerary?.days.filter((d) => d.stops.some((s) => s.stopType === "food" || s.stopType === "market")) ?? [];

  const handleEnrich = async () => {
    try {
      await enrichItinerary.mutateAsync();
      toast({ title: "Travel guide generated", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const handleGenerate = async () => {
    try {
      await generateItinerary.mutateAsync();
      toast({ title: "Itinerary generated", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const handleSummarize = async () => {
    try {
      await summarizeItinerary.mutateAsync();
      toast({ title: "Summary generated", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const handleOptimize = async () => {
    try {
      await optimizeItinerary.mutateAsync();
      toast({ title: "Itinerary optimized", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const handleReorder = async (dayNumber: number, stopIds: string[]) => {
    try {
      await reorderStops.mutateAsync({ dayNumber, stopIds });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Box>
      <Flex justify="space-between" align="start" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Button as={Link} to={`/trips/${trip.id}`} leftIcon={<FiArrowLeft />} variant="ghost" size="sm" mb={2}>
            Back to trip
          </Button>
          <Heading size="lg">{trip.title} — Itinerary</Heading>
          <Text color="gray.500" fontSize="sm" mt={1}>
            {trip.destinationCity} · {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          </Text>
        </Box>

        <HStack flexWrap="wrap">
          <Button
            leftIcon={<FiRefreshCw />}
            colorScheme="brand"
            size="sm"
            onClick={handleGenerate}
            isLoading={generateItinerary.isPending}
            loadingText="Generating..."
          >
            {itinerary ? "Regenerate" : "Generate Itinerary"}
          </Button>
          {hasStops && (
            <>
              <Button
                leftIcon={<FiZap />}
                size="sm"
                variant="outline"
                onClick={handleOptimize}
                isLoading={optimizeItinerary.isPending}
                loadingText="Optimizing..."
              >
                AI Optimize
              </Button>
              <Button
                leftIcon={<FiBookOpen />}
                size="sm"
                variant="outline"
                onClick={handleEnrich}
                isLoading={enrichItinerary.isPending}
                loadingText="Enriching..."
              >
                {hasGuide ? "Refresh Travel Guide" : "AI Travel Guide"}
              </Button>
              <Button
                leftIcon={<FiFileText />}
                size="sm"
                variant="outline"
                onClick={handleSummarize}
                isLoading={summarizeItinerary.isPending}
                loadingText="Writing..."
              >
                {itinerary?.summary ? "Refresh Summary" : "AI Summary"}
              </Button>
              {itinerary && <ItineraryExportMenu trip={trip} itinerary={itinerary} />}
            </>
          )}
        </HStack>
      </Flex>

      {!itinerary || itinerary.days.length === 0 ? (
        <Box p={8} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl" textAlign="center">
          <Heading size="md" mb={2}>
            No itinerary yet
          </Heading>
          <Text color="gray.500" mb={4} fontSize="sm">
            Discover places on the trip page, then generate a day-by-day schedule with optimized routes.
          </Text>
          <Button colorScheme="brand" onClick={handleGenerate} isLoading={generateItinerary.isPending}>
            Generate Itinerary
          </Button>
        </Box>
      ) : (
        <>
          {itinerary.summary && (
            <Box mb={6} p={5} bg={summaryBg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
              <Heading size="sm" mb={2}>
                Trip Summary
              </Heading>
              <Text fontSize="sm" whiteSpace="pre-wrap" lineHeight="tall">
                {itinerary.summary}
              </Text>
            </Box>
          )}

          <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6} minH="600px">
            <Stack spacing={4}>
              <Tabs
                index={viewMode === "schedule" ? 0 : viewMode === "eat-shop" ? 1 : 2}
                onChange={(i) => setViewMode(i === 0 ? "schedule" : i === 1 ? "eat-shop" : "guide")}
                variant="enclosed"
                colorScheme="brand"
              >
                <TabList>
                  <Tab fontSize="sm">Schedule</Tab>
                  <Tab fontSize="sm">Eat & Shop</Tab>
                  <Tab fontSize="sm">Local Guide</Tab>
                </TabList>
                <TabPanels mt={4}>
                  <TabPanel p={0}>
                    <Tabs index={activeTab} onChange={setActiveTab} variant="soft-rounded" colorScheme="brand">
                      <TabList flexWrap="wrap" gap={1}>
                        {itinerary.days.map((day) => (
                          <Tab key={day.dayNumber} fontSize="sm">
                            Day {day.dayNumber}
                          </Tab>
                        ))}
                      </TabList>
                      <TabPanels mt={4}>
                        {itinerary.days.map((day) => (
                          <TabPanel key={day.dayNumber} p={0}>
                            <DayTimeline day={day} onReorder={handleReorder} isReordering={reorderStops.isPending} />
                          </TabPanel>
                        ))}
                      </TabPanels>
                    </Tabs>
                    <Text fontSize="xs" color="gray.500" mt={2}>
                      Drag stops to reorder. Times recalculate automatically.
                    </Text>
                  </TabPanel>
                  <TabPanel p={0}>
                    {eatShopDays.length === 0 ? (
                      <Text fontSize="sm" color="gray.500">
                        No food or market stops yet. Discover places and regenerate the itinerary.
                      </Text>
                    ) : (
                      <Stack spacing={4}>
                        {eatShopDays.map((day) => (
                          <DayTimeline
                            key={day.dayNumber}
                            day={{
                              ...day,
                              stops: day.stops.filter((s) => s.stopType === "food" || s.stopType === "market"),
                            }}
                            readOnly
                          />
                        ))}
                      </Stack>
                    )}
                  </TabPanel>
                  <TabPanel p={0}>
                    <DestinationGuidePanel
                      legs={legs.map((leg) => ({ leg, brief: leg.destinationBrief }))}
                      singleBrief={trip.destinationBrief}
                    />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Stack>

            <Box
              h={{ base: "400px", xl: "100%" }}
              minH="400px"
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="xl"
              overflow="hidden"
            >
              <MapView day={activeDay} hotelCoordinates={trip.hotelCoordinates} height="100%" />
            </Box>
          </SimpleGrid>

          <ItineraryPrintContent trip={trip} itinerary={itinerary} />
        </>
      )}
    </Box>
  );
}
