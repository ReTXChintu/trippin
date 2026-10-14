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

export function useGoogleUsageQuery() {
  return useQuery({
    queryKey: ["profile", "google-usage"],
    queryFn: profileApi.getGoogleUsage,
    staleTime: 60_000,
  });
}

export function useUpdateApiKeys() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileApi.updateApiKeys,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useUpdateAiSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileApi.updateAiSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}

/** Models the saved key can use (live from the provider, recommended first). */
export function useAiModelsQuery(provider: profileApi.AiProviderName, enabled: boolean) {
  return useQuery({
    queryKey: ["profile", "ai-models", provider],
    queryFn: () => profileApi.listAiModels(provider),
    enabled,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });
}
