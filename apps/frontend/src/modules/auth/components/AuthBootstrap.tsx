import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { getProfile } from "@/modules/auth/api/auth.api";

interface AuthBootstrapProps {
  children: React.ReactNode;
}

export function AuthBootstrap({ children }: AuthBootstrapProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    let cancelled = false;

    getProfile()
      .then((user) => {
        if (!cancelled) setUser(user);
      })
      .catch(() => {
        if (!cancelled) clearAuth();
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
