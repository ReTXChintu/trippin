import { useParams } from "react-router-dom";
import { TodayView } from "@/modules/itinerary/components/TodayView";
import { TripPhoneNav } from "@/modules/trips/components/workspace/TripPhoneNav";

export function TodayPage() {
  const { id = "" } = useParams();
  return (
    <>
      <TodayView />
      <TripPhoneNav tripId={id} />
    </>
  );
}
