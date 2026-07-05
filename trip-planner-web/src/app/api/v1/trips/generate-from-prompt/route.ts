import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { invokeAsUser } from "@/lib/api/invoke-action";
import { jsonError, jsonOk } from "@/lib/api/response";
import { generateTripFromPromptAction } from "@/modules/trips/actions/trip.actions";
import { generateTripPromptSchema } from "@/modules/trips/validators/trip.validator";

export const POST = withAuth(async (request, auth, _context) => {
  const body = await request.json();
  const parsed = generateTripPromptSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid prompt", 400);
  }

  const result = await invokeAsUser(auth, () =>
    generateTripFromPromptAction(parsed.data.prompt),
  );
  if (!result.success) {
    return jsonError(result.error, 400);
  }

  return jsonOk(result.data, 201);
});
