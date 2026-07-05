import { withAuth } from "@/lib/api/with-auth";
import { invokeAsUser } from "@/lib/api/invoke-action";
import { jsonError, jsonOk } from "@/lib/api/response";
import { leaveTripAction } from "@/modules/trips/actions/trip-members.actions";

export const POST = withAuth(async (_request, auth, context) => {
  const { id } = await context.params;
  const result = await invokeAsUser(auth, () => leaveTripAction({ tripId: id }));
  if (!result.success) return jsonError(result.error, 400);
  return jsonOk({ message: result.message });
});
