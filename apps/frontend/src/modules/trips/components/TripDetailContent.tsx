import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Circle,
  HStack,
  Icon,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { FiBookOpen, FiCalendar, FiCheckSquare, FiDollarSign, FiMapPin } from "react-icons/fi";
import { MdConfirmationNumber, MdHotel, MdRestaurant } from "react-icons/md";
import type { IconType } from "react-icons";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTripQuery } from "@/modules/trips/hooks/useTrips";
import { useAuthStore } from "@/store/authStore";
import { isTripOwner } from "@/lib/trip-access";
import { TripHeader } from "@/modules/trips/components/TripHeader";
import { CitySwitcher } from "@/modules/trips/components/CitySwitcher";
import { LegExplorePanel } from "@/modules/trips/components/LegExplorePanel";
import { StaysView } from "@/modules/trips/components/stays/StaysView";
import { TripPlacesPanel } from "@/modules/places/components/TripPlacesPanel";
import { PlanView, type TripTab } from "@/modules/itinerary/components/plan/PlanView";
import { FoodView } from "@/modules/itinerary/components/FoodView";
import { BookingsView } from "@/modules/trips/components/bookings/BookingsView";
import { BudgetView } from "@/modules/trips/components/budget/BudgetView";
import { ChecklistView } from "@/modules/trips/components/ChecklistView";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import { getUncoveredNights } from "@/modules/trips/utils/stay.utils";

const TABS: { key: TripTab; label: string; icon: IconType }[] = [
  { key: "plan", label: "Plan", icon: FiCalendar },
  { key: "places", label: "Places", icon: FiMapPin },
  { key: "stays", label: "Stays", icon: MdHotel },
  { key: "food", label: "Food", icon: MdRestaurant },
  { key: "bookings", label: "Bookings", icon: MdConfirmationNumber },
  { key: "budget", label: "Budget", icon: FiDollarSign },
  { key: "checklist", label: "Checklist", icon: FiCheckSquare },
  { key: "guide", label: "Guide", icon: FiBookOpen },
];

export function TripDetailContent() {
  const { id = "" } = useParams();
  const currentUserId = useAuthStore((s) => s.user?.id ?? "");
  const [params, setParams] = useSearchParams();
  const { data: trip, isLoading } = useTripQuery(id);
  const tabBorder = useColorModeValue("gray.200", "gray.700");
  const settings = useDisclosure();

  if (isLoading) return <LoadingState />;
  if (!trip) return <EmptyState title="Trip not found" />;

  const isOwner = isTripOwner(trip, currentUserId);
  const legs = getEffectiveLegs(trip);
  const requestedTab = params.get("tab") as TripTab | null;
  const tab: TripTab = TABS.some((t) => t.key === requestedTab) ? requestedTab! : "plan";
  const requestedCity = params.get("city");
  const cityId = legs.some((l) => l.id === requestedCity) ? requestedCity : null;
  /** Per-city tabs always need a city; default to the first. */
  const focusedCityId = cityId ?? legs[0]?.id ?? "";

  const go = (nextTab: TripTab, legId?: string | null) => {
    const next = new URLSearchParams(params);
    next.set("tab", nextTab);
    if (legId) next.set("city", legId);
    else if (legId === null) next.delete("city");
    setParams(next, { replace: nextTab === tab });
  };
  const setCity = (legId: string | null) => go(tab, legId);

  const missingGoogleKey = trip.ownerApiKeys && !trip.ownerApiKeys.hasGoogleMapsKey;
  const missingAiKey = trip.ownerApiKeys && !trip.ownerApiKeys.hasAiKey;
  const selectedCount = legs.reduce((sum, l) => sum + l.selectedPlaceIds.length, 0);
  const missingNights = legs.reduce((sum, l) => sum + getUncoveredNights(l).length, 0);
  const focusedLeg = legs.find((l) => l.id === focusedCityId);

  return (
    <Stack spacing={6} maxW="1600px" mx="auto">
      {(missingGoogleKey || missingAiKey) && (
        <Alert status="warning" borderRadius="md" fontSize="sm" py={2}>
          <AlertIcon />
          <AlertDescription>
            {isOwner ? (
              <>
                Add your {missingGoogleKey ? "Google Maps" : ""}
                {missingGoogleKey && missingAiKey ? " and " : ""}
                {missingAiKey ? "OpenAI or Gemini" : ""} key in{" "}
                <Link to="/profile" style={{ textDecoration: "underline" }}>
                  Profile
                </Link>{" "}
                to unlock {missingGoogleKey ? "place search, hotels, restaurants and real travel times" : "AI features"}.
              </>
            ) : (
              <>The trip owner needs to add {missingGoogleKey ? "a Google Maps" : "an OpenAI or Gemini"} key before those features work.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      <TripHeader
        trip={trip}
        currentUserId={currentUserId}
        isOwner={isOwner}
        onCityAdded={(legId) => go("places", legId)}
        settings={settings}
      />

      <Tabs
        index={TABS.findIndex((t) => t.key === tab)}
        onChange={(i) => go(TABS[i].key)}
        colorScheme="brand"
        isLazy
        lazyBehavior="keepMounted"
      >
        <TabList borderColor={tabBorder} overflowX="auto" overflowY="hidden">
          {TABS.map((t) => (
            <Tab key={t.key} fontWeight="semibold" fontSize="sm" px={{ base: 3, md: 5 }} flexShrink={0}>
              <HStack spacing={2}>
                <Icon as={t.icon} />
                <Text>{t.label}</Text>
                {t.key === "places" && selectedCount > 0 && (
                  <Text as="span" fontSize="xs" color="gray.500" fontWeight="normal">
                    {selectedCount}
                  </Text>
                )}
                {t.key === "stays" && missingNights > 0 && <Circle size="7px" bg="orange.400" />}
                {t.key === "checklist" && trip.checklist.length > 0 && (
                  <Text as="span" fontSize="xs" color="gray.500" fontWeight="normal">
                    {trip.checklist.filter((c) => c.done).length}/{trip.checklist.length}
                  </Text>
                )}
              </HStack>
            </Tab>
          ))}
        </TabList>

        <TabPanels>
          <TabPanel px={0} pt={6}>
            <PlanView
              trip={trip}
              hasMapsKey={!missingGoogleKey}
              cityId={cityId}
              onCityChange={setCity}
              onGoTo={(t, legId) => go(t, legId)}
            />
          </TabPanel>
          <TabPanel px={0} pt={6}>
            <Stack spacing={5}>
              <CitySwitcher legs={legs} value={focusedCityId} onChange={setCity} />
              {focusedLeg && (
                <TripPlacesPanel
                  key={focusedLeg.id}
                  trip={trip}
                  leg={focusedLeg}
                  onPlanDays={() => go("plan", focusedLeg.id)}
                />
              )}
            </Stack>
          </TabPanel>
          <TabPanel px={0} pt={6}>
            <StaysView trip={trip} cityId={focusedCityId} onCityChange={setCity} />
          </TabPanel>
          <TabPanel px={0} pt={6}>
            <FoodView trip={trip} cityId={focusedCityId} onCityChange={setCity} onGoToGuide={() => go("guide")} />
          </TabPanel>
          <TabPanel px={0} pt={6}>
            <BookingsView trip={trip} />
          </TabPanel>
          <TabPanel px={0} pt={6}>
            <BudgetView trip={trip} currentUserId={currentUserId} onOpenSettings={settings.onOpen} />
          </TabPanel>
          <TabPanel px={0} pt={6}>
            <ChecklistView trip={trip} />
          </TabPanel>
          <TabPanel px={0} pt={6}>
            <Stack spacing={5}>
              <CitySwitcher legs={legs} value={focusedCityId} onChange={setCity} />
              {focusedLeg && trip.legs.some((l) => l.id === focusedLeg.id) ? (
                <LegExplorePanel key={focusedLeg.id} trip={trip} leg={focusedLeg} />
              ) : (
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Add a city to this trip to get a local guide.
                  </Text>
                </Box>
              )}
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Stack>
  );
}
