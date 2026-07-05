import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1",
  withCredentials: true,
});

export interface ApiErrorBody {
  success: false;
  error: string;
}

export function getApiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiErrorBody | undefined;
    if (data?.error) return data.error;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
