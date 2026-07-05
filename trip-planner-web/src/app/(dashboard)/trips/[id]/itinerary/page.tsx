import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getItineraryForTripAction } from "@/modules/itinerary/actions/itinerary.actions";
import { ItineraryPageContent } from "@/modules/itinerary/components/ItineraryPageContent";
import { getTripByIdAction } from "@/modules/trips/actions/trip.actions";

interface ItineraryPageProps {
  params: Promise<{ id: string }>;
}

export default async function ItineraryPage({ params }: ItineraryPageProps) {
  await auth();
  const { id } = await params;

  const trip = await getTripByIdAction(id);
  if (!trip) {
    notFound();
  }

  const itineraryResult = await getItineraryForTripAction(id);
  const itinerary = itineraryResult.success ? itineraryResult.data?.itinerary ?? null : null;

  return <ItineraryPageContent trip={trip} itinerary={itinerary} />;
}
