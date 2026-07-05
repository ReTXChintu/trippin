import { NextRequest } from "next/server";
import { UserRepository } from "@/repositories/user.repository";
import { loginSchema } from "@/modules/auth/validators/auth.validator";
import { verifyPassword } from "@/utils/password";
import { signAccessToken } from "@/lib/api/jwt";
import { jsonError, jsonOk } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { email, password } = parsed.data;
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return jsonError("Invalid email or password", 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return jsonError("Invalid email or password", 401);
    }

    const userId = user._id.toString();
    const accessToken = await signAccessToken({
      sub: userId,
      email: user.email,
      name: user.name,
    });

    return jsonOk({
      accessToken,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch {
    return jsonError("Login failed", 500);
  }
}
