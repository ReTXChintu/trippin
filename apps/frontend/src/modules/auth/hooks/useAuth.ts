import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import * as authApi from "@/modules/auth/api/auth.api";

export function useProfileQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["profile"],
    queryFn: authApi.getProfile,
    enabled,
    retry: false,
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      // Drop the offline copy of this user's trips (see public/sw.js).
      navigator.serviceWorker?.controller?.postMessage("clear-user-data");
    },
  });
}
