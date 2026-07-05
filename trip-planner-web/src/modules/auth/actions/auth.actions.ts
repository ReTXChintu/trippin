"use server";

import { UserRepository } from "@/repositories/user.repository";
import {
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileSchema,
  apiKeysSchema,
} from "@/modules/auth/validators/auth.validator";
import {
  hashPassword,
  generateResetToken,
  hashResetToken,
} from "@/utils/password";
import { auth } from "@/lib/auth";
import { getAuthUserId } from "@/lib/api/request-context";
import { revalidatePath } from "next/cache";
import { encryptApiKey, maskApiKeyLast4 } from "@/lib/crypto/api-key-crypto";

export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

export async function registerAction(
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, email, password } = parsed.data;

  const existing = await UserRepository.findByEmail(email);
  if (existing) {
    return { success: false, error: "An account with this email already exists" };
  }

  const passwordHash = await hashPassword(password);
  await UserRepository.create({ name, email, passwordHash });

  return { success: true, message: "Account created successfully" };
}

export async function forgotPasswordAction(
  formData: FormData,
): Promise<ActionResult<{ resetUrl?: string }>> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  const { email } = parsed.data;
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

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  // Email integration deferred — log in development for testing
  if (process.env.NODE_ENV === "development") {
    console.info("[Password Reset]", resetUrl);
  }

  return {
    success: true,
    message: "If an account exists, a reset link has been sent.",
    data: process.env.NODE_ENV === "development" ? { resetUrl } : undefined,
  };
}

export async function resetPasswordAction(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { token, password } = parsed.data;
  const tokenHash = hashResetToken(token);
  const user = await UserRepository.findByResetToken(tokenHash);

  if (!user) {
    return { success: false, error: "Invalid or expired reset link" };
  }

  const passwordHash = await hashPassword(password);
  await UserRepository.updatePassword(user._id.toString(), passwordHash);

  return { success: true, message: "Password updated successfully" };
}

export async function updateProfileAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await auth();
  const userId = (await getAuthUserId()) ?? session?.user?.id;
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    avatar: formData.get("avatar") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, avatar } = parsed.data;
  await UserRepository.updateProfile(userId, {
    name,
    avatar: avatar || undefined,
  });

  revalidatePath("/profile");
  return { success: true, message: "Profile updated successfully" };
}

export async function getProfileAction() {
  const userId = await getAuthUserId();
  if (!userId) {
    return null;
  }

  const user = await UserRepository.findById(userId);
  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    preferences: user.preferences,
    hasOpenaiKey: !!user.openaiApiKeyEncrypted,
    hasGoogleMapsKey: !!user.googleMapsApiKeyEncrypted,
    openaiApiKeyLast4: user.openaiApiKeyLast4,
    googleMapsApiKeyLast4: user.googleMapsApiKeyLast4,
  };
}

export async function updateApiKeysAction(
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  const userId = (await getAuthUserId()) ?? session?.user?.id;
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = apiKeysSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { openaiApiKey, googleMapsApiKey, clearOpenai, clearGoogleMaps } = parsed.data;

  try {
    if (clearOpenai) {
      await UserRepository.clearOpenAiKey(userId);
    } else if (openaiApiKey?.trim()) {
      await UserRepository.updateApiKeys(userId, {
        openaiApiKeyEncrypted: encryptApiKey(openaiApiKey.trim()),
        openaiApiKeyLast4: maskApiKeyLast4(openaiApiKey),
      });
    }

    if (clearGoogleMaps) {
      await UserRepository.clearGoogleMapsKey(userId);
    } else if (googleMapsApiKey?.trim()) {
      await UserRepository.updateApiKeys(userId, {
        googleMapsApiKeyEncrypted: encryptApiKey(googleMapsApiKey.trim()),
        googleMapsApiKeyLast4: maskApiKeyLast4(googleMapsApiKey),
      });
    }

    revalidatePath("/profile");
    return { success: true, message: "API keys updated successfully" };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update API keys",
    };
  }
}
