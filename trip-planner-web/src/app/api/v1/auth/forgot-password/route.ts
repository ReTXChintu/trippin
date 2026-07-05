import { NextRequest } from "next/server";
import { forgotPasswordAction } from "@/modules/auth/actions/auth.actions";
import { forgotPasswordSchema } from "@/modules/auth/validators/auth.validator";
import { jsonError, jsonOk } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid email", 400);
    }

    const formData = new FormData();
    formData.append("email", parsed.data.email);
    const result = await forgotPasswordAction(formData);

    if (!result.success) {
      return jsonError(result.error, 400);
    }

    return jsonOk({
      message: result.message,
      ...(result.data?.resetUrl ? { resetUrl: result.data.resetUrl } : {}),
    });
  } catch {
    return jsonError("Request failed", 500);
  }
}
