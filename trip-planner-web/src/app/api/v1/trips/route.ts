import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { invokeAsUser } from "@/lib/api/invoke-action";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  createTripFromRaw,
  getTripsAction,
} from "@/modules/trips/actions/trip.actions";
import type { TripStatus } from "@/types";

export const GET = withAuth(async (request, auth, _context) => {
  const status = request.nextUrl.searchParams.get("status") as TripStatus | null;
  const trips = await invokeAsUser(auth, () => getTripsAction(status ?? undefined));
  return jsonOk({ trips });
});

export const POST = withAuth(async (request, auth, _context) => {
  const body = await request.json();
  const result = await invokeAsUser(auth, () => createTripFromRaw(auth.sub, body));
  if (!result.success) {
    return jsonError(result.error, 400);
  }
  return jsonOk(result.data, 201);
});
