import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { invokeAsUser } from "@/lib/api/invoke-action";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  getTripDiscoveryPoolAction,
  getTripSelectedPlacesAction,
  addPlaceToTripAction,
  removePlaceFromTripAction,
  bulkAddPlacesToTripAction,
  bulkRemovePlacesFromTripAction,
} from "@/modules/places/actions/places.actions";

export const GET = withAuth(async (request, auth, context) => {
  const { id } = await context.params;
  const view = request.nextUrl.searchParams.get("view") ?? "selected";

  if (view === "pool") {
    const result = await invokeAsUser(auth, () => getTripDiscoveryPoolAction(id));
    if (!result.success) return jsonError(result.error, 404);
    return jsonOk(result.data);
  }

  const result = await invokeAsUser(auth, () => getTripSelectedPlacesAction(id));
  if (!result.success) return jsonError(result.error, 404);
  return jsonOk(result.data);
});

export const POST = withAuth(async (request, auth, context) => {
  const { id } = await context.params;
  const body = await request.json();

  if (body.action === "bulkAdd" && Array.isArray(body.placeIds)) {
    const result = await invokeAsUser(auth, () =>
      bulkAddPlacesToTripAction({ tripId: id, placeIds: body.placeIds }),
    );
    if (!result.success) return jsonError(result.error, 400);
    return jsonOk(result.data);
  }

  if (body.placeId) {
    const result = await invokeAsUser(auth, () =>
      addPlaceToTripAction({ tripId: id, placeId: body.placeId }),
    );
    if (!result.success) return jsonError(result.error, 400);
    return jsonOk(result.data);
  }

  return jsonError("placeId or bulkAdd action required", 400);
});

export const DELETE = withAuth(async (request, auth, context) => {
  const { id } = await context.params;
  const placeId = request.nextUrl.searchParams.get("placeId");
  const placeIdsParam = request.nextUrl.searchParams.get("placeIds");

  if (placeIdsParam) {
    const placeIds = placeIdsParam.split(",").filter(Boolean);
    const result = await invokeAsUser(auth, () =>
      bulkRemovePlacesFromTripAction({ tripId: id, placeIds }),
    );
    if (!result.success) return jsonError(result.error, 400);
    return jsonOk(result.data);
  }

  if (!placeId) {
    return jsonError("placeId query param is required", 400);
  }

  const result = await invokeAsUser(auth, () =>
    removePlaceFromTripAction({ tripId: id, placeId }),
  );
  if (!result.success) return jsonError(result.error, 400);
  return jsonOk(result.data);
});
