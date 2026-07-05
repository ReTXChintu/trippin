import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { invokeAsUser } from "@/lib/api/invoke-action";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  addTripMemberAction,
  getTripMembersAction,
  removeTripMemberAction,
} from "@/modules/trips/actions/trip-members.actions";

export const GET = withAuth(async (_request, auth, context) => {
  const { id } = await context.params;
  const result = await invokeAsUser(auth, () => getTripMembersAction({ tripId: id }));
  if (!result.success) return jsonError(result.error, 404);
  return jsonOk(result.data);
});

export const POST = withAuth(async (request, auth, context) => {
  const { id } = await context.params;
  const body = await request.json();
  const result = await invokeAsUser(auth, () =>
    addTripMemberAction({ tripId: id, email: body.email }),
  );
  if (!result.success) return jsonError(result.error, 400);
  return jsonOk(result.data);
});

export const DELETE = withAuth(async (request, auth, context) => {
  const { id } = await context.params;
  const memberUserId = request.nextUrl.searchParams.get("memberUserId");
  if (!memberUserId) {
    return jsonError("memberUserId query param is required", 400);
  }
  const result = await invokeAsUser(auth, () =>
    removeTripMemberAction({ tripId: id, memberUserId }),
  );
  if (!result.success) return jsonError(result.error, 400);
  return jsonOk(result.data);
});
