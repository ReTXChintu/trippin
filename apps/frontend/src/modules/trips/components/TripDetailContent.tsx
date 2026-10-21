import { Box, Button, Flex, Icon, Link, Stack, Text, useDisclosure } from "@chakra-ui/react";
import { useState } from "react";
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { LuBlocks, LuBookOpen, LuInfo, LuListChecks, LuTicket, LuUtensils, LuWallet } from "react-icons/lu";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ViewOnlyBanner } from "@/components/states";
import { useBudgetQuery, useTripQuery } from "@/modules/trips/hooks/useTrips";
import { useItineraryQuery } from "@/modules/itinerary/hooks/useItinerary";
import { useAuthStore } from "@/store/authStore";
import { canEditTrip, isTripOwner } from "@/lib/trip-access";
import { TripHeader } from "@/modules/trips/components/TripHeader";
import { LegExplorePanel } from "@/modules/trips/components/LegExplorePanel";
import { StaysView } from "@/modules/trips/components/stays/StaysView";
import { TripPlacesPanel } from "@/modules/places/components/TripPlacesPanel";
import { PlanView, type TripTab } from "@/modules/itinerary/components/plan/PlanView";
import { FoodView } from "@/modules/itinerary/components/FoodView";
import { BookingsView } from "@/modules/trips/components/bookings/BookingsView";
import { BudgetView } from "@/modules/trips/components/budget/BudgetView";
import { ChecklistView } from "@/modules/trips/components/ChecklistView";
import { useItineraryExport } from "@/modules/itinerary/components/useItineraryExport";
import { MoreSheet, TripBottomNav, TripTabBar, type TabBadges } from "@/modules/trips/components/workspace/TripTabs";
import { MORE_ICONS, TRIP_TABS } from "@/modules/trips/components/workspace/tabs";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import { getUncoveredNights } from "@/modules/trips/utils/stay.utils";
import { getTripStages } from "@/modules/trips/utils/trip-stage";
import { formatMoney } from "@/modules/trips/utils/money";
import { ConnectedAppsSection } from "@/modules/suite/components/ConnectedAppsSection";

export function TripDetailContent() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.user?.id ?? "");
  const [params, setParams] = useSearchParams();
  const { data: trip, isLoading } = useTripQuery(id);
  const { data: itineraryData } = useItineraryQuery(id);
  const { data: budget } = useBudgetQuery(id);
  const settings = useDisclosure();
  const discussion = useDisclosure();
  const more = useDisclosure();
  const itinerary = itineraryData?.itinerary ?? null;
  const exportActions = useItineraryExport(trip!, itinerary);

  const requestedTab = params.get("tab") as TripTab | null;
  const tab: TripTab = TRIP_TABS.some((t) => t.key === requestedTab) ? requestedTab! : "plan";
  // Tabs stay mounted once opened (keeps map position, scroll and drafts when switching back).
  const [visited, setVisited] = useState<Set<TripTab>>(() => new Set([tab]));
  if (!visited.has(tab)) setVisited(new Set(visited).add(tab));

  const keysNoteKey = `trippin.keysNote.${id}`;
  const [keysNoteDismissed, setKeysNoteDismissed] = useState(() => {
    try {
      return localStorage.getItem(keysNoteKey) === "1";
    } catch {
      return false;
    }
  });
  const dismissKeysNote = () => {
    setKeysNoteDismissed(true);
    try {
      localStorage.setItem(keysNoteKey, "1");
    } catch {
      // storage unavailable — it just shows again next time
    }
  };

  if (isLoading) return <LoadingState />;
  if (!trip) return <EmptyState title="Trip not found" />;

  const isOwner = isTripOwner(trip, currentUserId);
  const canEdit = canEditTrip(trip, currentUserId);
  const legs = getEffectiveLegs(trip);
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

  const missingGoogleKey = Boolean(trip.ownerApiKeys && !trip.ownerApiKeys.hasGoogleMapsKey);
  const missingAiKey = Boolean(trip.ownerApiKeys && !trip.ownerApiKeys.hasAiKey);
  const selectedCount = legs.reduce((sum, l) => sum + l.selectedPlaceIds.length, 0);
  const gapCities = legs.filter((l) => getUncoveredNights(l).length > 0).length;
  const savedFood = legs.reduce((sum, l) => sum + (l.foodPoolIds?.length ?? 0), 0);
  const checklistDone = trip.checklist.filter((c) => c.done).length;
  const bookedTransfers = new Set(trip.bookings.map((b) => b.transferId).filter(Boolean));
  const unbookedTransfers = (trip.transfers ?? []).filter((t) => !bookedTransfers.has(t.id)).length;
  const focusedLeg = legs.find((l) => l.id === focusedCityId);
  const hasPlan = Boolean(itinerary?.days.some((d) => d.stops.some((s) => s.stopType !== "meal")));
  const stages = getTripStages(trip, { hasPlan, edits: itinerary?.historyCount ?? 0 });

  const linkedApps = [trip.links?.spendlog?.enabled && "SpendLog", trip.links?.inframe?.enabled && "InFrame"].filter((x): x is string => Boolean(x));

  const badges: TabBadges = {
    places: selectedCount > 0 ? { text: String(selectedCount) } : undefined,
    stays: gapCities > 0 ? { text: `${gapCities} gap${gapCities === 1 ? "" : "s"}`, warn: true } : undefined,
    food: savedFood > 0 ? { text: String(savedFood) } : undefined,
    bookings: trip.bookings.length > 0 ? { text: String(trip.bookings.length) } : undefined,
    checklist: trip.checklist.length > 0 ? { text: `${checklistDone}/${trip.checklist.length}` } : undefined,
    apps: linkedApps.length > 0 ? { text: String(linkedApps.length) } : undefined,
  };

  const showKeysNote = (missingGoogleKey || missingAiKey) && !keysNoteDismissed;
  const banners = (showKeysNote || !canEdit) && (
    <Stack spacing={2} mb={3} mt={{ base: 3, lg: 0 }}>
      {showKeysNote && (
        <Flex align="center" gap={3} px={4} py={2} borderRadius="lg" bg="sunk" fontSize="13px" lineHeight="18px" color="tx2" flexWrap="wrap">
          <Icon as={LuInfo} boxSize="18px" flexShrink={0} />
          <Text flex={1} minW="200px">
            {[missingGoogleKey && "No Google Maps key — place search is limited and travel times are estimates", missingAiKey && "no AI key — AI plans and edits are off"]
              .filter(Boolean)
              .join("; ")
              .replace(/^n/, "N")}
            .{" "}
            {isOwner ? (
              <Link as={RouterLink} to="/profile" color="ac" fontWeight={600}>
                Add keys in Profile
              </Link>
            ) : (
              "The trip owner can add them."
            )}
          </Text>
          <Button size="xs" variant="outline" onClick={dismissKeysNote}>
            Dismiss
          </Button>
        </Flex>
      )}
      {!canEdit && (
        <ViewOnlyBanner
          action={
            <Button variant="link" size="sm" fontSize="14px" onClick={discussion.onOpen} flexShrink={0}>
              Ask owner for edit access
            </Button>
          }
        />
      )}
    </Stack>
  );

  const panel = (key: TripTab, content: React.ReactNode, padded = true) =>
    visited.has(key) ? (
      <Box
        key={key}
        role="tabpanel"
        id={`trip-panel-${key}`}
        aria-labelledby={`trip-tab-${key}`}
        display={tab === key ? "block" : "none"}
        px={padded ? { base: 4, md: 6, lg: 8 } : 0}
        pt={padded ? 6 : 0}
      >
        {content}
      </Box>
    ) : null;

  const moreItems = [
    { key: "food", icon: LuUtensils, label: "Food", value: savedFood > 0 ? `${savedFood} saved` : undefined, onClick: () => go("food") },
    {
      key: "bookings",
      icon: LuTicket,
      label: "Bookings",
      value: unbookedTransfers > 0 ? `${unbookedTransfers} need${unbookedTransfers === 1 ? "s" : ""} booking` : trip.bookings.length > 0 ? `${trip.bookings.length} booked` : undefined,
      onClick: () => go("bookings"),
    },
    {
      key: "budget",
      icon: LuWallet,
      label: "Budget",
      value: budget && budget.spent.total > 0 ? `${formatMoney(budget.spent.total, budget.currency)} spent` : undefined,
      onClick: () => go("budget"),
    },
    {
      key: "checklist",
      icon: LuListChecks,
      label: "Checklist",
      value: trip.checklist.length > 0 ? `${checklistDone} / ${trip.checklist.length}` : undefined,
      onClick: () => go("checklist"),
    },
    { key: "guide", icon: LuBookOpen, label: "Guide", value: "AI local guide", onClick: () => go("guide") },
    {
      key: "apps",
      icon: LuBlocks,
      label: "Connected apps",
      value: linkedApps.length > 0 ? linkedApps.join(" · ") : "SpendLog · InFrame",
      onClick: () => go("apps"),
    },
    ...(canEdit && hasPlan
      ? [{ key: "compare", icon: MORE_ICONS.compare, label: "Compare with AI plan", onClick: () => navigate(`/trips/${trip.id}/itinerary/compare${cityId ? `?legId=${cityId}` : ""}`) }]
      : []),
    ...(itinerary ? [{ key: "print", icon: MORE_ICONS.print, label: "Download PDF", onClick: () => void exportActions.print() }] : []),
    { key: "share", icon: MORE_ICONS.share, label: "Share & members", onClick: settings.onOpen },
  ];

  return (
    <Box mx={{ base: -4, md: -6, lg: -8 }} mt={{ base: -4, md: -5 }} mb={{ lg: -12 }}>
      <Box bg="bg" borderBottomWidth="1px" borderColor="ln" px={{ base: 4, md: 6, lg: 8 }} pt={{ base: 0, lg: 5 }}>
        <TripHeader
          trip={trip}
          currentUserId={currentUserId}
          isOwner={isOwner}
          canEdit={canEdit}
          cityId={cityId}
          stages={stages}
          exportActions={exportActions}
          onGo={go}
          onCity={setCity}
          onCityAdded={(legId) => go("places", legId)}
          settings={settings}
          discussion={discussion}
          banners={banners || undefined}
          tabs={<TripTabBar tab={tab} badges={badges} onChange={(t) => go(t)} />}
        />
      </Box>

      {panel(
        "plan",
        <PlanView
          trip={trip}
          canEdit={canEdit}
          hasMapsKey={!missingGoogleKey}
          hasAiKey={!missingAiKey}
          isOwner={isOwner}
          cityId={cityId}
          onCityChange={setCity}
          onGoTo={(t, legId) => go(t, legId)}
        />,
        false,
      )}
      {panel(
        "places",
        focusedLeg ? (
          <TripPlacesPanel key={focusedLeg.id} trip={trip} leg={focusedLeg} onPlanDays={() => go("plan", focusedLeg.id)} onCityChange={setCity} />
        ) : null,
      )}
      {panel("stays", <StaysView trip={trip} cityId={cityId} onCityChange={setCity} />)}
      {panel("food", <FoodView trip={trip} cityId={focusedCityId} onCityChange={setCity} onGoToGuide={() => go("guide")} />)}
      {panel("bookings", <BookingsView trip={trip} />)}
      {panel("budget", <BudgetView trip={trip} currentUserId={currentUserId} onOpenSettings={settings.onOpen} onOpenApps={() => go("apps")} />)}
      {panel("checklist", <ChecklistView trip={trip} />)}
      {panel("apps", <ConnectedAppsSection tripId={trip.id} />)}
      {panel(
        "guide",
        focusedLeg && trip.legs.some((l) => l.id === focusedLeg.id) ? (
          <LegExplorePanel key={focusedLeg.id} trip={trip} leg={focusedLeg} onCityChange={setCity} />
        ) : (
          <Text fontSize="sm" color="tx3">
            Add a city to this trip to get a local guide.
          </Text>
        ),
      )}


      <TripBottomNav
        tab={tab}
        todayHref={`/trips/${trip.id}/today`}
        moreOpen={more.isOpen}
        onTab={(t) => go(t)}
        onMore={more.onOpen}
      />
      <MoreSheet isOpen={more.isOpen} onClose={more.onClose} items={moreItems} />
    </Box>
  );
}
