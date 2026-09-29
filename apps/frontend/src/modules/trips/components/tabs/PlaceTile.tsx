import { Box, Button, Checkbox, Flex, Icon, IconButton, Text, Tooltip } from "@chakra-ui/react";
import { FiCheck, FiHeart, FiPlus, FiStar } from "react-icons/fi";
import { LuSparkles } from "react-icons/lu";
import { PhotoFallback, Pill } from "@/components/ui";
import { useAuthStore } from "@/store/authStore";
import { useTripMembersQuery, useVotePlace } from "@/modules/trips/hooks/useTrips";
import type { Place } from "@/modules/places/types/place.types";
import type { Trip } from "@/modules/trips/types/trip.types";
import { categoryIcon } from "./placeMeta";

/**
 * Round ♥ on a place photo — the same vote as `VoteButton` (everyone on the trip can vote,
 * viewers included), shaped for the card overlay.
 */
export function PlaceVoteHeart({ trip, placeId, placeName }: { trip: Trip; placeId: string; placeName: string }) {
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const vote = useVotePlace(trip.id);
  const { data } = useTripMembersQuery(trip.id);
  const voters = trip.placeVotes?.[placeId] ?? [];
  const mine = voters.includes(userId);
  const names = voters.map((id) => data?.members.find((m) => m.id === id)?.name ?? "Someone");

  return (
    <Tooltip label={voters.length ? `Wanted by ${names.join(", ")}` : "Vote for this place"} hasArrow openDelay={300}>
      <IconButton
        aria-label={mine ? `Remove your vote for ${placeName}` : `Vote heart for ${placeName}`}
        aria-pressed={mine}
        icon={<Icon as={FiHeart} boxSize="15px" fill={mine ? "currentColor" : "none"} />}
        variant="outline"
        w="32px"
        h="32px"
        minW="32px"
        borderRadius="full"
        color={mine || voters.length > 0 ? "danger" : "fg.muted"}
        isLoading={vote.isPending}
        onClick={(e) => {
          e.stopPropagation();
          vote.mutate({ placeId, voted: !mine });
        }}
      />
    </Tooltip>
  );
}

interface PlaceTileProps {
  trip: Trip;
  place: Place;
  inTrip: boolean;
  aiMatch?: boolean;
  busy?: boolean;
  onToggle?: () => void;
  onOpen?: () => void;
  /** Multi-select mode (bulk add / remove). */
  selectable?: boolean;
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
}

/** Place card from the design: photo (or fallback), AI match badge, ♥ vote, name, meta, add/added. */
export function PlaceTile({ trip, place, inTrip, aiMatch, busy, onToggle, onOpen, selectable, checked, onCheck }: PlaceTileProps) {
  const id = place.googlePlaceId ?? place.name;
  const CatIcon = categoryIcon(place.category);
  const votes = trip.placeVotes?.[id]?.length ?? 0;

  return (
    <Flex
      direction="column"
      bg="bg.surface"
      borderWidth="1px"
      borderColor={selectable && checked ? "accent" : "border.line"}
      boxShadow={selectable && checked ? "0 0 0 1px var(--chakra-colors-accent)" : undefined}
      borderRadius="xl"
      overflow="hidden"
      minW={0}
    >
      <Box position="relative">
        <Box as="button" type="button" display="block" w="100%" onClick={onOpen} aria-label={`Details for ${place.name}`} tabIndex={-1}>
          {place.imageUrl ? (
            <Box h="108px" bg="bg.subtle">
              <img src={place.imageUrl} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </Box>
          ) : (
            <PhotoFallback seed={id} icon={CatIcon} iconSize={26} h="108px" w="100%">
              <Text position="absolute" bottom="4px" left="8px" fontSize="12px" fontWeight={600} opacity={0.85}>
                No photo
              </Text>
            </PhotoFallback>
          )}
        </Box>
        {selectable ? (
          <Flex position="absolute" left="8px" top="8px" bg="bg.surface" borderRadius="md" p="6px" boxShadow="raised">
            <Checkbox isChecked={checked} onChange={(e) => onCheck?.(e.target.checked)} aria-label={`Select ${place.name}`} />
          </Flex>
        ) : (
          aiMatch && (
            <Pill tone="accent" icon={LuSparkles} bg="bg.surface" position="absolute" left="8px" top="8px">
              AI match
            </Pill>
          )
        )}
        {place.googlePlaceId && (
          <Box position="absolute" right="8px" top="8px">
            <PlaceVoteHeart trip={trip} placeId={place.googlePlaceId} placeName={place.name} />
          </Box>
        )}
      </Box>
      <Flex direction="column" gap="4px" p="10px 12px 12px" flex={1}>
        <Text
          as="button"
          type="button"
          onClick={onOpen}
          fontWeight={600}
          textAlign="left"
          noOfLines={2}
          _hover={{ textDecoration: "underline" }}
          _focusVisible={{ outline: "2px solid", outlineColor: "accent", outlineOffset: "2px", borderRadius: "4px" }}
        >
          {place.name}
        </Text>
        <Flex align="center" gap={2} fontSize="12px" color="fg.muted" flexWrap="wrap">
          <Flex align="center" gap={1} minW={0}>
            <Icon as={CatIcon} boxSize="13px" flexShrink={0} />
            <Text noOfLines={1}>{place.category}</Text>
          </Flex>
          {place.rating !== undefined && (
            <>
              <Text as="span" aria-hidden>
                ·
              </Text>
              <Flex align="center" gap={1}>
                <Icon as={FiStar} boxSize="12px" color="warn" />
                <Text>{place.rating.toFixed(1)}</Text>
              </Flex>
            </>
          )}
          {votes > 0 && (
            <Flex align="center" gap={1} color="danger" aria-label={`${votes} vote${votes === 1 ? "" : "s"}`}>
              <Icon as={FiHeart} boxSize="12px" />
              <Text>{votes}</Text>
            </Flex>
          )}
        </Flex>
        {onToggle && (
          <Box mt="6px">
            {inTrip ? (
              <Tooltip label="In your trip — click to remove" hasArrow openDelay={300}>
                <Button variant="ai" leftIcon={<FiCheck size={16} />} onClick={onToggle} isLoading={busy} aria-pressed>
                  Added
                </Button>
              </Tooltip>
            ) : (
              <Button variant="outline" leftIcon={<FiPlus size={16} />} onClick={onToggle} isLoading={busy}>
                Add to trip
              </Button>
            )}
          </Box>
        )}
      </Flex>
    </Flex>
  );
}
