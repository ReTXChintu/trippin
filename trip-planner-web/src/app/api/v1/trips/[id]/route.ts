import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { invokeAsUser } from "@/lib/api/invoke-action";
import { jsonError, jsonNotFound, jsonOk } from "@/lib/api/response";
import {
  deleteTripAction,
  getTripByIdAction,
  updateTripFromRaw,
} from "@/modules/trips/actions/trip.actions";
import { UserRepository } from "@/repositories/user.repository";

async function enrichTripWithOwnerKeys(trip: NonNullable<Awaited<ReturnType<typeof getTripByIdAction>>>) {
  const owner = await UserRepository.findById(trip.userId);
  return {
    ...trip,
    ownerApiKeys: {
      hasOpenaiKey: !!owner?.openaiApiKeyEncrypted,
      hasGoogleMapsKey: !!owner?.googleMapsApiKeyEncrypted,
    },
  };
}

export const GET = withAuth(async (_request, auth, context) => {
  const { id } = await context.params;
  const trip = await invokeAsUser(auth, () => getTripByIdAction(id));
  if (!trip) {
    return jsonNotFound("Trip not found");
  }
  return jsonOk({ trip: await enrichTripWithOwnerKeys(trip) });
});

export const PATCH = withAuth(async (request, auth, context) => {
  const { id } = await context.params;
  const body = await request.json();
  const result = await invokeAsUser(auth, () => updateTripFromRaw(id, auth.sub, body));
  if (!result.success) {
    return jsonError(result.error, result.error.includes("not found") ? 404 : 400);
  }
  return jsonOk(result.data);
});

export const DELETE = withAuth(async (_request, auth, context) => {
  const { id } = await context.params;
  const result = await invokeAsUser(auth, () => deleteTripAction(id));
  if (!result.success) {
    return jsonError(result.error, result.error.includes("owner") ? 403 : 404);
  }
  return jsonOk({ message: result.message });
});
