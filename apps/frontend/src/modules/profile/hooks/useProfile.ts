import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as profileApi from "@/modules/profile/api/profile.api";
import { useAuthStore } from "@/store/authStore";

export function useProfileQuery() {
  return useQuery({
    queryKey: ["profile", "full"],
    queryFn: profileApi.getProfile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: profileApi.updateProfile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setUser({
        id: data.profile.id,
        name: data.profile.name,
        email: data.profile.email,
        avatar: data.profile.avatar,
        preferences: data.profile.preferences,
      });
    },
  });
}

export function useUpdateApiKeys() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileApi.updateApiKeys,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}
