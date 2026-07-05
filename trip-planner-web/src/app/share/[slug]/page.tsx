import { Box } from "@chakra-ui/react";
import { notFound } from "next/navigation";
import { ShareHeader } from "@/components/layout/ShareHeader";
import { getPublicItineraryAction } from "@/modules/itinerary/actions/itinerary.actions";
import { getPublicTripAction } from "@/modules/trips/actions/trip.actions";
import { PublicTripView } from "@/modules/trips/components/PublicTripView";

interface SharePageProps {
  params: Promise<{ slug: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { slug } = await params;
  const trip = await getPublicTripAction(slug);

  if (!trip) {
    notFound();
  }

  const itineraryResult = await getPublicItineraryAction(slug);
  const itinerary = itineraryResult.success ? itineraryResult.data?.itinerary ?? null : null;

  return (
    <Box minH="100vh">
      <ShareHeader />
      <PublicTripView trip={trip} itinerary={itinerary} />
    </Box>
  );
}
