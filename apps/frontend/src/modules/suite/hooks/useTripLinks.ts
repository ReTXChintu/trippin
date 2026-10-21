import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as suiteApi from "@/modules/suite/api/suite.api";
import type { LinkToggles, TripLinksView } from "@/modules/suite/types/suite.types";

export function useTripLinksQuery(tripId: string, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["trips", tripId, "links"],
    queryFn: () => suiteApi.getTripLinks(tripId),
    enabled: !!tripId && (opts.enabled ?? true),
    // The server caches summaries for a minute; no point asking more often.
    staleTime: 60_000,
    retry: 1,
    // While a link is being set up, look again shortly.
    refetchInterval: (query) => {
      const data = query.state.data as TripLinksView | undefined;
      return data && Object.values(data.apps).some((a) => a.enabled && a.status === "pending") ? 5_000 : false;
    },
  });
}

export function useSetTripLinks(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toggles: LinkToggles) => suiteApi.setTripLinks(tripId, toggles),
    onSuccess: (view) => {
      queryClient.setQueryData(["trips", tripId, "links"], view);
      queryClient.invalidateQueries({ queryKey: ["trips", tripId], exact: true });
    },
  });
}
