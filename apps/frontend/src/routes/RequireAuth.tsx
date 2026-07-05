import { Center } from "@chakra-ui/react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { LoadingState } from "@/components/ui/LoadingState";

export function RequireAuth() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useLocation();

  if (isLoading) {
    return (
      <Center minH="100vh">
        <LoadingState />
      </Center>
    );
  }

  if (!user) {
    const callbackUrl = encodeURIComponent(location.pathname);
    return <Navigate to={`/login?callbackUrl=${callbackUrl}`} replace />;
  }

  return <Outlet />;
}
