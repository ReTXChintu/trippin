"use client";

import dynamic from "next/dynamic";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { FiArrowLeft, FiBookOpen, FiFileText, FiRefreshCw, FiZap } from "react-icons/fi";
import {
  enrichItineraryAction,
  generateItineraryAction,
  generateItinerarySummaryAction,
  optimizeItineraryAction,
  reorderItineraryStopsAction,
} from "@/modules/itinerary/actions/itinerary.actions";
import { DayTimeline } from "@/modules/itinerary/components/DayTimeline";
import { DestinationGuidePanel } from "@/modules/itinerary/components/DestinationGuidePanel";
import {
  ItineraryExportMenu,
  ItineraryPrintContent,
} from "@/modules/itinerary/components/ItineraryExportMenu";
import type { Itinerary } from "@/modules/itinerary/types";
import type { Trip } from "@/modules/trips/types/trip.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import { format, parseISO } from "date-fns";

const MapView = dynamic(
  () => import("@/modules/itinerary/components/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <Box h="100%" bg="gray.100" borderRadius="xl" display="flex" alignItems="center" justifyContent="center">
        <Text color="gray.500" fontSize="sm">
          Loading map...
        </Text>
      </Box>
    ),
  },
);

interface ItineraryPageContentProps {
  trip: Trip;
  itinerary: Itinerary | null;
}

function formatDate(date: string) {
  try {
    return format(parseISO(date), "MMM d, yyyy");
  } catch {
    return date;
  }
}

export function ItineraryPageContent({ trip: initialTrip, itinerary: initialItinerary }: ItineraryPageContentProps) {
  const router = useRouter();
  const toast = useToast();
  const [trip, setTrip] = useState(initialTrip);
  const [itinerary, setItinerary] = useState(initialItinerary);
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<"schedule" | "eat-shop" | "guide">("schedule");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const summaryBg = useColorModeValue("brand.50", "gray.700");

  const activeDay = itinerary?.days[activeTab] ?? null;
  const hasStops = Boolean(itinerary?.days.some((d) => d.stops.length > 0));
  const legs = getEffectiveLegs(trip);
  const hasGuide = legs.some((l) => l.destinationBrief) || Boolean(trip.destinationBrief);
  const eatShopDays =
    itinerary?.days.filter((d) => d.stops.some((s) => s.stopType === "food" || s.stopType === "market")) ?? [];

  const handleEnrich = async () => {
    setIsEnriching(true);
    const result = await enrichItineraryAction({ tripId: trip.id });
    setIsEnriching(false);

    if (!result.success) {
      toast({ title: result.error, status: "error", duration: 5000 });
      return;
    }

    setItinerary(result.data!.itinerary);
    setTrip(result.data!.trip);
    toast({ title: result.message ?? "Travel guide generated", status: "success" });
    router.refresh();
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const result = await generateItineraryAction({ tripId: trip.id });
    setIsGenerating(false);

    if (!result.success) {
      toast({ title: result.error, status: "error", duration: 5000 });
      return;
    }

    setItinerary(result.data!.itinerary);
    toast({ title: result.message ?? "Itinerary generated", status: "success" });
    router.refresh();
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    const result = await generateItinerarySummaryAction({ tripId: trip.id });
    setIsSummarizing(false);

    if (!result.success) {
      toast({ title: result.error, status: "error", duration: 5000 });
      return;
    }

    setItinerary(result.data!.itinerary);
    toast({ title: result.message ?? "Summary generated", status: "success" });
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    const result = await optimizeItineraryAction({ tripId: trip.id });
    setIsOptimizing(false);

    if (!result.success) {
      toast({ title: result.error, status: "error", duration: 5000 });
      return;
    }

    setItinerary(result.data!.itinerary);
    toast({ title: result.message ?? "Itinerary optimized", status: "success" });
    router.refresh();
  };

  const handleReorder = useCallback(
    async (dayNumber: number, stopIds: string[]) => {
      setIsReordering(true);
      const result = await reorderItineraryStopsAction({ tripId: trip.id, dayNumber, stopIds });
      setIsReordering(false);

      if (!result.success) {
        toast({ title: result.error, status: "error" });
        return;
      }

      setItinerary(result.data!.itinerary);
    },
    [trip.id, toast],
  );

  return (
    <Box>
      <Flex justify="space-between" align="start" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Button
            as={Link}
            href={`/trips/${trip.id}`}
            leftIcon={<FiArrowLeft />}
            variant="ghost"
            size="sm"
            mb={2}
          >
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
            isLoading={isGenerating}
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
                isLoading={isOptimizing}
                loadingText="Optimizing..."
              >
                AI Optimize
              </Button>
              <Button
                leftIcon={<FiBookOpen />}
                size="sm"
                variant="outline"
                onClick={handleEnrich}
                isLoading={isEnriching}
                loadingText="Enriching..."
              >
                {hasGuide ? "Refresh Travel Guide" : "AI Travel Guide"}
              </Button>
              <Button
                leftIcon={<FiFileText />}
                size="sm"
                variant="outline"
                onClick={handleSummarize}
                isLoading={isSummarizing}
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
        <Box
          p={8}
          bg={bg}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="xl"
          textAlign="center"
        >
          <Heading size="md" mb={2}>
            No itinerary yet
          </Heading>
          <Text color="gray.500" mb={4} fontSize="sm">
            Discover places on the trip page, then generate a day-by-day schedule with optimized routes.
          </Text>
          <Button colorScheme="brand" onClick={handleGenerate} isLoading={isGenerating}>
            Generate Itinerary
          </Button>
        </Box>
      ) : (
        <>
          {itinerary.summary && (
            <Box
              mb={6}
              p={5}
              bg={summaryBg}
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="xl"
            >
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
                            <DayTimeline
                              day={day}
                              onReorder={handleReorder}
                              isReordering={isReordering}
                            />
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
                              stops: day.stops.filter(
                                (s) => s.stopType === "food" || s.stopType === "market",
                              ),
                            }}
                            readOnly
                          />
                        ))}
                      </Stack>
                    )}
                  </TabPanel>
                  <TabPanel p={0}>
                    <DestinationGuidePanel
                      legs={legs.map((leg) => ({
                        leg,
                        brief: leg.destinationBrief,
                      }))}
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
              <MapView
                day={activeDay}
                hotelCoordinates={trip.hotelCoordinates}
                height="100%"
              />
            </Box>
          </SimpleGrid>

          <ItineraryPrintContent trip={trip} itinerary={itinerary} />
        </>
      )}
    </Box>
  );
}
