import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { invokeAsUser } from "@/lib/api/invoke-action";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getProfileAction, updateApiKeysAction } from "@/modules/auth/actions/auth.actions";
import { apiKeysSchema } from "@/modules/auth/validators/auth.validator";

export const PUT = withAuth(async (request, auth, _context) => {
  const body = await request.json();
  const parsed = apiKeysSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const result = await invokeAsUser(auth, () => updateApiKeysAction(parsed.data));
  if (!result.success) {
    return jsonError(result.error, 400);
  }

  const profile = await invokeAsUser(auth, () => getProfileAction());
  return jsonOk({ profile, message: result.message });
});
