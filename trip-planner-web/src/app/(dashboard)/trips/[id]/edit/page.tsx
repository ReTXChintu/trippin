import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getTripByIdAction } from "@/modules/trips/actions/trip.actions";
import { TripEditPageContent } from "@/modules/trips/components/TripEditPageContent";

interface TripEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function TripEditPage({ params }: TripEditPageProps) {
  await auth();
  const { id } = await params;
  const trip = await getTripByIdAction(id);

  if (!trip) {
    notFound();
  }

  return <TripEditPageContent trip={trip} />;
}
