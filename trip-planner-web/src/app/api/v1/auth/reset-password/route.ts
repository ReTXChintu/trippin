import { NextRequest } from "next/server";
import { resetPasswordAction } from "@/modules/auth/actions/auth.actions";
import { resetPasswordSchema } from "@/modules/auth/validators/auth.validator";
import { jsonError, jsonOk } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const formData = new FormData();
    formData.append("token", parsed.data.token);
    formData.append("password", parsed.data.password);
    formData.append("confirmPassword", parsed.data.confirmPassword);

    const result = await resetPasswordAction(formData);
    if (!result.success) {
      return jsonError(result.error, 400);
    }

    return jsonOk({ message: result.message });
  } catch {
    return jsonError("Request failed", 500);
  }
}
