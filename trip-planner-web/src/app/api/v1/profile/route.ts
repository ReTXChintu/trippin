import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { invokeAsUser } from "@/lib/api/invoke-action";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getProfileAction, updateProfileAction } from "@/modules/auth/actions/auth.actions";
import { profileSchema } from "@/modules/auth/validators/auth.validator";

export const GET = withAuth(async (_request, auth, _context) => {
  const profile = await invokeAsUser(auth, () => getProfileAction());
  if (!profile) {
    return jsonError("Profile not found", 404);
  }
  return jsonOk({ profile });
});

export const PATCH = withAuth(async (request, auth, _context) => {
  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const formData = new FormData();
  formData.append("name", parsed.data.name);
  formData.append("avatar", parsed.data.avatar ?? "");

  const result = await invokeAsUser(auth, () => updateProfileAction(formData));
  if (!result.success) {
    return jsonError(result.error, 400);
  }

  const profile = await invokeAsUser(auth, () => getProfileAction());
  return jsonOk({ profile, message: result.message });
});
