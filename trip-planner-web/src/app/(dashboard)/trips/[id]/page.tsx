import { auth } from "@/lib/auth";
import { isTripOwner } from "@/lib/trip-access";
import { notFound } from "next/navigation";
import { getItineraryForTripAction } from "@/modules/itinerary/actions/itinerary.actions";
import {
  getTripDiscoveryPoolAction,
  getTripSelectedPlacesAction,
} from "@/modules/places/actions/places.actions";
import { getTripMembersAction } from "@/modules/trips/actions/trip-members.actions";
import { getTripByIdAction } from "@/modules/trips/actions/trip.actions";
import { TripDetailContent } from "@/modules/trips/components/TripDetailContent";
import { UserRepository } from "@/repositories/user.repository";

interface TripDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const session = await auth();
  const { id } = await params;
  const trip = await getTripByIdAction(id);

  if (!trip || !session?.user?.id) {
    notFound();
  }

  const currentUserId = session.user.id;
  const isOwner = isTripOwner(trip, currentUserId);

  const [poolResult, selectedResult, itineraryResult, membersResult] = await Promise.all([
    getTripDiscoveryPoolAction(id),
    getTripSelectedPlacesAction(id),
    getItineraryForTripAction(id),
    getTripMembersAction({ tripId: id }),
  ]);
  const poolPlaces = poolResult.success ? poolResult.data?.places ?? [] : [];
  const selectedPlaces = selectedResult.success ? selectedResult.data?.places ?? [] : [];
  const hasItinerary = Boolean(
    itineraryResult.success && itineraryResult.data?.itinerary?.days?.some((d) => d.stops.length > 0),
  );
  const members = membersResult.success ? membersResult.data?.members ?? [] : [];

  const owner = await UserRepository.findById(trip.userId);
  const ownerApiKeys = {
    hasOpenaiKey: !!owner?.openaiApiKeyEncrypted,
    hasGoogleMapsKey: !!owner?.googleMapsApiKeyEncrypted,
  };

  return (
    <TripDetailContent
      trip={trip}
      poolPlaces={poolPlaces}
      selectedPlaces={selectedPlaces}
      hasItinerary={hasItinerary}
      currentUserId={currentUserId}
      isOwner={isOwner}
      members={members}
      ownerApiKeys={ownerApiKeys}
    />
  );
}
