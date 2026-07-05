import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { invokeAsUser } from "@/lib/api/invoke-action";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  searchPlacesAction,
  searchHotelsAction,
  getPlaceDetailRichAction,
} from "@/modules/places/actions/places.actions";

export const GET = withAuth(async (request, auth, _context) => {
  const params = request.nextUrl.searchParams;
  const type = params.get("type") ?? "places";

  const input = {
    query: params.get("query") ?? "",
    city: params.get("city") ?? undefined,
    country: params.get("country") ?? undefined,
    sessionToken: params.get("sessionToken") ?? undefined,
    lat: params.get("lat") ? Number(params.get("lat")) : undefined,
    lng: params.get("lng") ? Number(params.get("lng")) : undefined,
  };

  const result = await invokeAsUser(auth, () =>
    type === "hotels" ? searchHotelsAction(input) : searchPlacesAction(input),
  );
  if (!result.success) return jsonError(result.error, 400);
  return jsonOk(result.data);
});

export const POST = withAuth(async (request, auth, _context) => {
  const body = await request.json();
  const result = await invokeAsUser(auth, () => getPlaceDetailRichAction(body));
  if (!result.success) return jsonError(result.error, 400);
  return jsonOk(result.data);
});
