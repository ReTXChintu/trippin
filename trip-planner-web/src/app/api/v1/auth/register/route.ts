import { NextRequest } from "next/server";
import { UserRepository } from "@/repositories/user.repository";
import { registerSchema } from "@/modules/auth/validators/auth.validator";
import { hashPassword } from "@/utils/password";
import { signAccessToken } from "@/lib/api/jwt";
import { jsonError, jsonOk } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { name, email, password } = parsed.data;
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      return jsonError("An account with this email already exists", 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await UserRepository.create({ name, email, passwordHash });
    const userId = user._id.toString();

    const accessToken = await signAccessToken({
      sub: userId,
      email: user.email,
      name: user.name,
    });

    return jsonOk(
      {
        accessToken,
        user: {
          id: userId,
          name: user.name,
          email: user.email,
        },
      },
      201,
    );
  } catch {
    return jsonError("Registration failed", 500);
  }
}
