import { Button, Tooltip } from "@chakra-ui/react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
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
        size={size}
        variant="ghost"
        colorScheme={mine ? "pink" : "gray"}
        leftIcon={mine ? <FaHeart /> : <FaRegHeart />}
        minW="auto"
        px={1.5}
        isLoading={vote.isPending}
        onClick={(e) => {
          e.stopPropagation();
          vote.mutate({ placeId, voted: !mine });
        }}
        aria-pressed={mine}
        aria-label={mine ? "Remove your vote" : "Vote for this place"}
      >
        {voters.length > 0 ? voters.length : ""}
      </Button>
    </Tooltip>
  );
}
