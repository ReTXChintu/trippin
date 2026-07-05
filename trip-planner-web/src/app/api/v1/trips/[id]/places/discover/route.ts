import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { invokeAsUser } from "@/lib/api/invoke-action";
import { jsonError, jsonOk } from "@/lib/api/response";
import { discoverPlacesForTripAction } from "@/modules/places/actions/places.actions";

export const POST = withAuth(async (request, auth, context) => {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const result = await invokeAsUser(auth, () =>
    discoverPlacesForTripAction({
      tripId: id,
      forceRefresh: body.forceRefresh ?? false,
      legId: body.legId,
    }),
  );
  if (!result.success) return jsonError(result.error, 400);
  return jsonOk(result.data);
});
