import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useCallbackUrl } from "@/modules/auth/components/auth-callback";

export function RedirectIfAuthed() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const callbackUrl = useCallbackUrl();

  if (!isLoading && user) {
    return <Navigate to={callbackUrl ?? "/dashboard"} replace />;
  }

  return <Outlet />;
}
