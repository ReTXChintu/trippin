import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export function RedirectIfAuthed() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
