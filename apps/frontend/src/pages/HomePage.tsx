import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { LoadingState } from "@/components/ui/LoadingState";
import { Center } from "@chakra-ui/react";

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

  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}
