import { api } from "@/lib/api";
import type { IUser } from "@/types";

export interface AuthSession {
  accessToken: string;
  user: { id: string; name: string; email: string; avatar?: string };
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const res = await api.post("/auth/login", { email, password });
  return res.data.data;
}

export async function register(data: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthSession> {
  const res = await api.post("/auth/register", data);
  return res.data.data;
}

export async function forgotPassword(email: string): Promise<{ message: string; resetUrl?: string }> {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data.data;
}

export async function resetPassword(data: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<{ message: string }> {
  const res = await api.post("/auth/reset-password", data);
  return res.data.data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function getProfile(): Promise<IUser> {
  const res = await api.get("/profile");
  return res.data.data.profile;
}
