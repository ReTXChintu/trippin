import { auth } from "@/lib/auth";
import { getTripsAction } from "@/modules/trips/actions/trip.actions";
import { TripsPageContent } from "@/modules/trips/components/TripsPageContent";

export default async function TripsPage() {
  await auth();
  const trips = await getTripsAction();

  return <TripsPageContent trips={trips} />;
}
