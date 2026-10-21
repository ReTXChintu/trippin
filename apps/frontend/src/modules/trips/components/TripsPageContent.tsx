import { Box, Button, Flex, Grid, Heading, HStack, Skeleton, Stack } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { FiBriefcase, FiGrid, FiList, FiPlus, FiSearch } from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import { ChoiceChip, EmptyState, Segmented, SurfaceCard } from "@/components/ui";
import { IconInput } from "@/components/ui/app";
import { tripRouteLabel, tripStatusInfo } from "@/components/ui/app-format";
import { TripCard } from "@/components/trips/TripCard";
import { useTripsQuery } from "@/modules/trips/hooks/useTrips";
import { useAuthStore } from "@/store/authStore";
import type { TripStatus } from "@/types";

type Filter = TripStatus | "all";
type View = "grid" | "list";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
];

const VIEW_KEY = "trippin.tripsView";

function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

export function TripsPageContent() {
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [view, setViewState] = useState<View>(readView);
  const { data: trips = [], isLoading } = useTripsQuery();

  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* remembered for this visit only */
    }
  };

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: trips.length, draft: 0, active: 0, completed: 0, archived: 0 };
    trips.forEach((t) => {
      c[t.status] += 1;
    });
    return c;
  }, [trips]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trips
      .filter((t) => filter === "all" || t.status === filter)
      .filter((t) => !q || [t.title, t.destinationCity, t.destinationCountry, tripRouteLabel(t)].some((s) => s?.toLowerCase().includes(q)))
      .sort((a, b) => {
        const oa = tripStatusInfo(a).order;
        const ob = tripStatusInfo(b).order;
        if (oa !== ob) return oa - ob;
        // Finished trips newest first, everything else soonest first.
        return oa >= 3 ? b.startDate.localeCompare(a.startDate) : a.startDate.localeCompare(b.startDate);
      });
  }, [trips, filter, query]);

  const filterLabel = FILTERS.find((f) => f.value === filter)?.label.toLowerCase();

  return (
    <Stack spacing={5}>
      <Flex justify="space-between" align="center" gap={4}>
        <Heading as="h1" fontSize="22px" lineHeight="28px">
          My trips
        </Heading>
        <Button as={RouterLink} to="/trips/new" leftIcon={<FiPlus size={18} />} flexShrink={0}>
          New trip
        </Button>
      </Flex>

      <Flex justify="space-between" align={{ base: "stretch", lg: "center" }} gap="12px" direction={{ base: "column", lg: "row" }}>
        <HStack spacing="8px" overflowX="auto" mx={{ base: "-16px", md: 0 }} px={{ base: "16px", md: 0 }} pb={{ base: "2px", md: 0 }} role="group" aria-label="Filter by status" sx={{ scrollbarWidth: "none" }}>
          {FILTERS.map((f) => (
            <ChoiceChip key={f.value} selected={filter === f.value} onClick={() => setFilter(f.value)} flexShrink={0}>
              {f.label} · {counts[f.value]}
            </ChoiceChip>
          ))}
        </HStack>
        <HStack spacing="8px">
          <Box flex={{ base: 1, lg: "none" }} w={{ lg: "260px" }}>
            <IconInput icon={FiSearch} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search trips" aria-label="Search trips" type="search" />
          </Box>
          <Segmented<View>
            value={view}
            onChange={setView}
            options={[
              { value: "grid", label: "Grid", icon: FiGrid },
              { value: "list", label: "List", icon: FiList },
            ]}
            flexShrink={0}
            aria-label="Layout"
          />
        </HStack>
      </Flex>

      {isLoading ? (
        <Grid templateColumns={{ base: "1fr", md: "repeat(auto-fill, minmax(300px, 1fr))" }} gap={5}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} h="254px" borderRadius="xl" />
          ))}
        </Grid>
      ) : shown.length === 0 ? (
        <SurfaceCard borderStyle="dashed" borderColor="ln2" bg="transparent">
          <EmptyState
            icon={FiBriefcase}
            title={trips.length === 0 ? "No trips yet" : query ? "No trips match your search" : `No ${filterLabel} trips`}
            text={trips.length === 0 ? "Describe a trip in a sentence or set one up step by step." : "Try another filter or search."}
            action={
              trips.length === 0 ? (
                <Button as={RouterLink} to="/trips/new" leftIcon={<FiPlus />}>
                  New trip
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilter("all");
                    setQuery("");
                  }}
                >
                  Show all trips
                </Button>
              )
            }
          />
        </SurfaceCard>
      ) : view === "grid" ? (
        <Grid templateColumns={{ base: "1fr", md: "repeat(auto-fill, minmax(300px, 1fr))" }} gap={5}>
          {shown.map((trip) => (
            <TripCard key={trip.id} trip={trip} isOwner={trip.userId === user?.id} />
          ))}
        </Grid>
      ) : (
        <SurfaceCard>
          {shown.map((trip, i) => (
            <Box key={trip.id} borderTopWidth={i === 0 ? 0 : "1px"} borderColor="ln">
              <TripCard trip={trip} isOwner={trip.userId === user?.id} variant="row" />
            </Box>
          ))}
        </SurfaceCard>
      )}
    </Stack>
  );
}
