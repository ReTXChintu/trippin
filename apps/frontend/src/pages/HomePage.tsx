import { Navigate } from "react-router-dom";
import { Center } from "@chakra-ui/react";
import { useAuthStore } from "@/store/authStore";
import { LoadingState } from "@/components/ui/LoadingState";
import { LandingPage } from "@/modules/landing/components/LandingPage";

/** Public home: the landing page for visitors, straight to the dashboard when signed in. */
export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <Center minH="100vh">
        <LoadingState />
      </Center>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}
