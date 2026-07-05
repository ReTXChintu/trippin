import { Box } from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShareHeader } from "@/components/layout/ShareHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { PublicTripView } from "@/modules/trips/components/PublicTripView";
import { getSharedTrip } from "@/modules/share/api/share.api";

export function SharePageContent() {
  const { slug = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["share", slug],
    queryFn: () => getSharedTrip(slug),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) return <LoadingState />;
  if (!data) return <EmptyState title="Shared trip not found" />;

  return (
    <Box minH="100vh">
      <ShareHeader />
      <PublicTripView trip={data.trip} itinerary={data.itinerary} />
    </Box>
  );
}
