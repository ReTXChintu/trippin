import { Button, Tooltip } from "@chakra-ui/react";
import { LuHeart } from "react-icons/lu";
import { useAuthStore } from "@/store/authStore";
import { useTripMembersQuery, useVotePlace } from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";

/** ♥ with a count — "who in the group wants this". Everyone on the trip can vote, viewers included. */
export function VoteButton({ trip, placeId, size = "xs" }: { trip: Trip; placeId: string; size?: "xs" | "sm" }) {
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const vote = useVotePlace(trip.id);
  const { data } = useTripMembersQuery(trip.id);
  const voters = trip.placeVotes?.[placeId] ?? [];
  const mine = voters.includes(userId);
  const names = voters.map((id) => data?.members.find((m) => m.id === id)?.name ?? "Someone");

  return (
    <Tooltip label={voters.length ? `Wanted by ${names.join(", ")}` : "Vote for this place"} hasArrow openDelay={300}>
      <Button
        size="sm"
        h={size === "xs" ? "32px" : "36px"}
        variant="ghost"
        color={voters.length > 0 || mine ? "crit" : "tx3"}
        leftIcon={<LuHeart size={16} fill={mine ? "currentColor" : "none"} />}
        iconSpacing={voters.length > 0 ? "4px" : 0}
        minW="auto"
        px={2}
        fontSize="12px"
        fontWeight={600}
        isLoading={vote.isPending}
        onClick={(e) => {
          e.stopPropagation();
          vote.mutate({ placeId, voted: !mine });
        }}
        aria-pressed={mine}
        aria-label={`${mine ? "Remove your vote" : "Vote for this place"}${voters.length ? `, ${voters.length} vote${voters.length === 1 ? "" : "s"}` : ""}`}
      >
        {voters.length > 0 ? voters.length : ""}
      </Button>
    </Tooltip>
  );
}
