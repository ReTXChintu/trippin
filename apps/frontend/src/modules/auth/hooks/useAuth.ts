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

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (data: { email: string; password: string }) => authApi.login(data.email, data.password),
    onSuccess: (session) => setUser(session.user),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: authApi.register,
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: authApi.resetPassword,
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
    },
  });
}
