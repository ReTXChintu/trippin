import type { Request, Response } from "express";
import { UserRepository } from "@/repositories/user.repository";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/modules/auth/validators/auth.validator";
import { verifyPassword } from "@/utils/password";
import { signAccessToken } from "@/lib/jwt";
import { sendError, sendOk, sendResult } from "@/lib/response";
import { registerUser, forgotPassword, resetPassword } from "@/modules/auth/services/auth.service";

const ACCESS_TOKEN_COOKIE = "access_token";
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function setAccessTokenCookie(res: Response, token: string) {
  res.cookie(ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const { email, password } = parsed.data;
  const user = await UserRepository.findByEmail(email);
  if (!user) {
    return sendError(res, "Invalid email or password", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return sendError(res, "Invalid email or password", 401);
  }

  const userId = user._id.toString();
  const accessToken = await signAccessToken({
    sub: userId,
    email: user.email,
    name: user.name,
  });

  setAccessTokenCookie(res, accessToken);

  return sendOk(res, {
    accessToken,
    user: { id: userId, name: user.name, email: user.email, avatar: user.avatar },
  });
}

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const result = await registerUser(parsed.data);
  if (!result.success) {
    return sendError(res, result.error, 409);
  }

  const { id, name, email } = result.data!;
  const accessToken = await signAccessToken({ sub: id, email, name });

  setAccessTokenCookie(res, accessToken);

  return sendOk(res, { accessToken, user: { id, name, email } }, 201);
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.issues[0]?.message ?? "Invalid email", 400);
  }

  const result = await forgotPassword(parsed.data.email);
  if (!result.success) {
    return sendError(res, result.error, 400);
  }

  return sendOk(res, {
    message: result.message,
    ...(result.data?.resetUrl ? { resetUrl: result.data.resetUrl } : {}),
  });
}

export async function resetPasswordHandler(req: Request, res: Response) {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const result = await resetPassword(parsed.data.token, parsed.data.password);
  return sendResult(res, result);
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: "/" });
  return sendOk(res, { message: "Logged out" });
}
