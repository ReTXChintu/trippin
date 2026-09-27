import { Navigate, useParams } from "react-router-dom";

/** The itinerary now lives on the trip page's Plan tab; keep old links working. */
export function ItineraryPageContent() {
  const { id = "" } = useParams();
  return <Navigate to={`/trips/${id}?tab=plan`} replace />;
}
