import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { invokeAsUser } from "@/lib/api/invoke-action";
import { jsonError, jsonOk } from "@/lib/api/response";
import { shareTripAction, unshareTripAction } from "@/modules/trips/actions/trip.actions";

export const POST = withAuth(async (_request, auth, context) => {
  const { id } = await context.params;
  const result = await invokeAsUser(auth, () => shareTripAction(id));
  if (!result.success) return jsonError(result.error, 404);
  return jsonOk(result.data);
});

export const DELETE = withAuth(async (_request, auth, context) => {
  const { id } = await context.params;
  const result = await invokeAsUser(auth, () => unshareTripAction(id));
  if (!result.success) return jsonError(result.error, 404);
  return jsonOk(result.data);
});
