import { withAuth } from "@/lib/api/with-auth";
import { invokeAsUser } from "@/lib/api/invoke-action";
import { jsonError, jsonOk } from "@/lib/api/response";
import { duplicateTripAction } from "@/modules/trips/actions/trip.actions";

export const POST = withAuth(async (_request, auth, context) => {
  const { id } = await context.params;
  const result = await invokeAsUser(auth, () => duplicateTripAction(id));
  if (!result.success) return jsonError(result.error, 404);
  return jsonOk(result.data, 201);
});
