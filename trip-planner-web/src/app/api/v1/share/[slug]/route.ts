import { getPublicItineraryAction } from "@/modules/itinerary/actions/itinerary.actions";
import { getPublicTripAction } from "@/modules/trips/actions/trip.actions";
import { jsonError, jsonNotFound, jsonOk } from "@/lib/api/response";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const trip = await getPublicTripAction(slug);
  if (!trip) {
    return jsonNotFound("Shared trip not found");
  }

  const itineraryResult = await getPublicItineraryAction(slug);
  const itinerary = itineraryResult.success ? itineraryResult.data?.itinerary ?? null : null;

  return jsonOk({ trip, itinerary });
}
