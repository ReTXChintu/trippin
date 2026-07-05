import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { invokeAsUser } from "@/lib/api/invoke-action";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  generateItineraryAction,
  getItineraryForTripAction,
  generateItinerarySummaryAction,
  optimizeItineraryAction,
  enrichItineraryAction,
  reorderItineraryStopsAction,
} from "@/modules/itinerary/actions/itinerary.actions";

export const GET = withAuth(async (_request, auth, context) => {
  const { id } = await context.params;
  const result = await invokeAsUser(auth, () => getItineraryForTripAction(id));
  if (!result.success) return jsonError(result.error, 404);
  return jsonOk(result.data);
});

export const POST = withAuth(async (request, auth, context) => {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const action = body.action ?? "generate";

  if (action === "generate") {
    const result = await invokeAsUser(auth, () => generateItineraryAction({ tripId: id }));
    if (!result.success) return jsonError(result.error, 400);
    return jsonOk(result.data);
  }

  if (action === "summarize") {
    const result = await invokeAsUser(auth, () => generateItinerarySummaryAction({ tripId: id }));
    if (!result.success) return jsonError(result.error, 400);
    return jsonOk(result.data);
  }

  if (action === "optimize") {
    const result = await invokeAsUser(auth, () => optimizeItineraryAction({ tripId: id }));
    if (!result.success) return jsonError(result.error, 400);
    return jsonOk(result.data);
  }

  if (action === "enrich") {
    const result = await invokeAsUser(auth, () => enrichItineraryAction({ tripId: id }));
    if (!result.success) return jsonError(result.error, 400);
    return jsonOk(result.data);
  }

  if (action === "reorder") {
    const result = await invokeAsUser(auth, () =>
      reorderItineraryStopsAction({
        tripId: id,
        dayNumber: body.dayNumber,
        stopIds: body.stopIds,
      }),
    );
    if (!result.success) return jsonError(result.error, 400);
    return jsonOk(result.data);
  }

  return jsonError("Unknown action", 400);
});
