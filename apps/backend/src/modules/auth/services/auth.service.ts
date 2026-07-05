import { UserRepository } from "@/repositories/user.repository";
import { hashPassword, generateResetToken, hashResetToken } from "@/utils/password";

export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}): Promise<ActionResult<{ id: string; name: string; email: string }>> {
  const existing = await UserRepository.findByEmail(data.email);
  if (existing) {
    return { success: false, error: "An account with this email already exists" };
  }

  const passwordHash = await hashPassword(data.password);
  const user = await UserRepository.create({
    name: data.name,
    email: data.email,
    passwordHash,
  });

  return {
    success: true,
    message: "Account created successfully",
    data: { id: user._id.toString(), name: user.name, email: user.email },
  };
}

export async function forgotPassword(
  email: string,
): Promise<ActionResult<{ resetUrl?: string }>> {
  const user = await UserRepository.findByEmail(email);

  // Always return success to prevent email enumeration
  if (!user) {
    return {
      success: true,
      message: "If an account exists, a reset link has been sent.",
    };
  }

  const resetToken = generateResetToken();
  const tokenHash = hashResetToken(resetToken);
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await UserRepository.setPasswordResetToken(email, tokenHash, expires);

  const baseUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  if (process.env.NODE_ENV === "development") {
    console.info("[Password Reset]", resetUrl);
  }

  return {
    success: true,
    message: "If an account exists, a reset link has been sent.",
    data: process.env.NODE_ENV === "development" ? { resetUrl } : undefined,
  };
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<ActionResult> {
  const tokenHash = hashResetToken(token);
  const user = await UserRepository.findByResetToken(tokenHash);

  if (!user) {
    return { success: false, error: "Invalid or expired reset link" };
  }

  const passwordHash = await hashPassword(password);
  await UserRepository.updatePassword(user._id.toString(), passwordHash);

  return { success: true, message: "Password updated successfully" };
}
