"use client";

import {
  generateItineraryAction,
} from "@/modules/itinerary/actions/itinerary.actions";
import {
  discoverPlacesForTripAction,
} from "@/modules/places/actions/places.actions";
import { DiscoveryPlacesPanel } from "@/modules/places/components/DiscoveryPlacesPanel";
import { TripSelectedPlacesPanel } from "@/modules/places/components/TripSelectedPlacesPanel";
import { TripLegTimeline } from "@/modules/trips/components/TripLegTimeline";
import { VehicleRentalPanel } from "@/modules/trips/components/VehicleRentalPanel";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import type { Place } from "@/modules/places/types/place.types";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Tag,
  Text,
  useClipboard,
  useColorModeValue,
  useDisclosure,
  useToast,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  FiArchive,
  FiCalendar,
  FiCompass,
  FiCopy,
  FiEdit,
  FiExternalLink,
  FiShare2,
  FiTrash2,
  FiLogOut,
} from "react-icons/fi";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  archiveTripAction,
  deleteTripAction,
  duplicateTripAction,
  shareTripAction,
  unshareTripAction,
} from "@/modules/trips/actions/trip.actions";
import { leaveTripAction } from "@/modules/trips/actions/trip-members.actions";
import { TripMembersPanel } from "@/modules/trips/components/TripMembersPanel";
import type { TripMember } from "@/modules/trips/types/trip-member.types";
import type { Trip } from "@/modules/trips/types/trip.types";

interface TripDetailContentProps {
  trip: Trip;
  poolPlaces?: Place[];
  selectedPlaces?: Place[];
  hasItinerary?: boolean;
  currentUserId: string;
  isOwner: boolean;
  members: TripMember[];
  ownerApiKeys?: { hasOpenaiKey: boolean; hasGoogleMapsKey: boolean };
}

const statusColors = {
  draft: "gray",
  active: "green",
  archived: "orange",
  completed: "blue",
} as const;

function formatDate(date: string) {
  try {
    return format(parseISO(date), "MMM d, yyyy");
  } catch {
    return date;
  }
}

export function TripDetailContent({
  trip,
  poolPlaces: initialPool = [],
  selectedPlaces: initialSelected = [],
  hasItinerary = false,
  currentUserId,
  isOwner,
  members,
  ownerApiKeys,
}: TripDetailContentProps) {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isLeaveOpen,
    onOpen: onLeaveOpen,
    onClose: onLeaveClose,
  } = useDisclosure();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
  const [poolPlaces, setPoolPlaces] = useState<Place[]>(initialPool);
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>(initialSelected);
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const selectedPlaceIds = useMemo(
    () => new Set(selectedPlaces.map((p) => p.googlePlaceId).filter(Boolean) as string[]),
    [selectedPlaces],
  );

  const syncSelectedFromIds = (ids: string[]) => {
    const catalog = new Map<string, Place>();
    for (const p of [...poolPlaces, ...selectedPlaces]) {
      if (p.googlePlaceId) catalog.set(p.googlePlaceId, p);
    }
    const next = ids
      .map((id) => catalog.get(id))
      .filter((p): p is Place => Boolean(p));
    setSelectedPlaces(next);
    router.refresh();
  };

  const shareUrl = trip.publicSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${trip.publicSlug}`
    : "";
  const { hasCopied, onCopy } = useClipboard(shareUrl);

  const hasDiscoveryPool =
    trip.legs.length > 0
      ? trip.legs.some((leg) => leg.discoveryPoolIds.length > 0)
      : poolPlaces.length > 0 || (trip.discoveryPoolIds?.length ?? 0) > 0;

  const tripLegs = getEffectiveLegs(trip);

  const handleDiscover = async () => {
    setIsDiscovering(true);
    const result = await discoverPlacesForTripAction({
      tripId: trip.id,
      forceRefresh: hasDiscoveryPool,
    });
    setIsDiscovering(false);

    if (!result.success) {
      toast({ title: result.error, status: "error", duration: 5000 });
      return;
    }

    setPoolPlaces(result.data?.places ?? []);
    toast({
      title: result.message ?? "Places discovered",
      status: "success",
      duration: 4000,
    });
    router.refresh();
  };

  const handleGenerateItinerary = async () => {
    setIsGeneratingItinerary(true);
    const result = await generateItineraryAction({ tripId: trip.id });
    setIsGeneratingItinerary(false);

    if (!result.success) {
      toast({ title: result.error, status: "error", duration: 5000 });
      return;
    }

    toast({ title: result.message ?? "Itinerary generated", status: "success" });
    router.push(`/trips/${trip.id}/itinerary`);
  };

  const handleDuplicate = async () => {
    const result = await duplicateTripAction(trip.id);
    if (!result.success) {
      toast({ title: result.error, status: "error" });
      return;
    }
    toast({ title: "Trip duplicated", status: "success" });
    router.push(`/trips/${result.data!.trip.id}`);
  };

  const handleArchive = async () => {
    const result = await archiveTripAction(trip.id);
    if (!result.success) {
      toast({ title: result.error, status: "error" });
      return;
    }
    toast({ title: "Trip archived", status: "success" });
    router.refresh();
  };

  const handleShare = async () => {
    const result = await shareTripAction(trip.id);
    if (!result.success) {
      toast({ title: result.error, status: "error" });
      return;
    }
    toast({ title: "Share link created", status: "success" });
    router.refresh();
  };

  const handleUnshare = async () => {
    const result = await unshareTripAction(trip.id);
    if (!result.success) {
      toast({ title: result.error, status: "error" });
      return;
    }
    toast({ title: "Sharing disabled", status: "success" });
    router.refresh();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteTripAction(trip.id);
    setIsDeleting(false);
    onClose();
    if (!result.success) {
      toast({ title: result.error, status: "error" });
      return;
    }
    toast({ title: "Trip deleted", status: "success" });
    router.push("/trips");
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    const result = await leaveTripAction({ tripId: trip.id });
    setIsLeaving(false);
    onLeaveClose();
    if (!result.success) {
      toast({ title: result.error, status: "error" });
      return;
    }
    toast({ title: result.message ?? "You left the trip", status: "success" });
    router.push("/trips");
  };

  const missingGoogleKey = ownerApiKeys && !ownerApiKeys.hasGoogleMapsKey;
  const missingOpenAiKey = ownerApiKeys && !ownerApiKeys.hasOpenaiKey;
  const showKeyBanner = missingGoogleKey || missingOpenAiKey;

  return (
    <Box>
      {showKeyBanner && (
        <Alert status="warning" mb={4} borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>API keys required</AlertTitle>
            <AlertDescription fontSize="sm">
              {isOwner ? (
                <>
                  Add your API keys in{" "}
                  <Link href="/profile" style={{ textDecoration: "underline" }}>
                    Profile
                  </Link>{" "}
                  to enable place discovery
                  {missingOpenAiKey ? " and AI features" : ""}.
                </>
              ) : (
                <>
                  The trip owner must add
                  {missingGoogleKey ? " a Google Maps API key" : ""}
                  {missingGoogleKey && missingOpenAiKey ? " and" : ""}
                  {missingOpenAiKey ? " an OpenAI API key" : ""} in Profile before
                  {missingGoogleKey ? " discovery" : " AI features"} can be used.
                </>
              )}
            </AlertDescription>
          </Box>
        </Alert>
      )}
      <Flex justify="space-between" align="start" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <HStack mb={2} spacing={3}>
            <Heading size="lg">{trip.title}</Heading>
            <Badge colorScheme={statusColors[trip.status]} textTransform="capitalize">
              {trip.status}
            </Badge>
          </HStack>
          <Text color="gray.500">
            {trip.destinationCity}
            {trip.destinationState ? `, ${trip.destinationState}` : ""}, {trip.destinationCountry}
          </Text>
          <Text color="gray.500" fontSize="sm" mt={1}>
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          </Text>
        </Box>

        <HStack flexWrap="wrap">
          <Button
            leftIcon={<FiCompass />}
            size="sm"
            colorScheme="brand"
            onClick={handleDiscover}
            isLoading={isDiscovering}
            loadingText={hasDiscoveryPool ? "Refreshing..." : "Discovering..."}
          >
            {hasDiscoveryPool ? "Refresh discovery" : "Discover Places"}
          </Button>
          {hasItinerary ? (
            <Button
              as={Link}
              href={`/trips/${trip.id}/itinerary`}
              leftIcon={<FiCalendar />}
              size="sm"
              colorScheme="teal"
            >
              View Itinerary
            </Button>
          ) : (
            <Button
              leftIcon={<FiCalendar />}
              size="sm"
              colorScheme="teal"
              variant="outline"
              onClick={handleGenerateItinerary}
              isLoading={isGeneratingItinerary}
              loadingText="Generating..."
              isDisabled={selectedPlaces.length === 0 && trip.selectedPlaceIds.length === 0}
            >
              Generate Itinerary
            </Button>
          )}
          <Button as={Link} href={`/trips/${trip.id}/edit`} leftIcon={<FiEdit />} size="sm">
            Edit
          </Button>
          <Button leftIcon={<FiCopy />} size="sm" variant="outline" onClick={handleDuplicate}>
            Duplicate
          </Button>
          {trip.status !== "archived" && (
            <Button leftIcon={<FiArchive />} size="sm" variant="outline" onClick={handleArchive}>
              Archive
            </Button>
          )}
          {trip.isPublic ? (
            <>
              <Button size="sm" variant="outline" onClick={onCopy}>
                {hasCopied ? "Copied!" : "Copy Link"}
              </Button>
              <Button as="a" href={shareUrl} target="_blank" leftIcon={<FiExternalLink />} size="sm" variant="outline">
                View Public
              </Button>
              <Button size="sm" variant="ghost" onClick={handleUnshare}>
                Unshare
              </Button>
            </>
          ) : (
            <Button leftIcon={<FiShare2 />} size="sm" variant="outline" onClick={handleShare}>
              Share
            </Button>
          )}
          {!isOwner && (
            <Button
              leftIcon={<FiLogOut />}
              size="sm"
              variant="outline"
              colorScheme="orange"
              onClick={onLeaveOpen}
            >
              Leave trip
            </Button>
          )}
          {isOwner && (
            <Button leftIcon={<FiTrash2 />} size="sm" colorScheme="red" variant="outline" onClick={onOpen}>
              Delete
            </Button>
          )}
        </HStack>
      </Flex>

      <Stack spacing={6} mb={6}>
        <TripMembersPanel trip={trip} currentUserId={currentUserId} initialMembers={members} />
      </Stack>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Box p={5} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
          <Heading size="sm" mb={4}>
            Schedule
          </Heading>
          <Stack spacing={2} fontSize="sm">
            <Text>
              Daily hours: {trip.dailyStartTime} – {trip.dailyEndTime}
              {trip.useFlexibleSchedule ? " (flexible — best-time scheduling)" : ""}
            </Text>
            {trip.legs.length === 0 && (trip.arrivalTime || trip.departureTime) && (
              <Text>
                {trip.arrivalTime ? `Arrive ${trip.arrivalTime}` : ""}
                {trip.arrivalTime && trip.departureTime ? " · " : ""}
                {trip.departureTime ? `Leave ${trip.departureTime}` : ""}
              </Text>
            )}
            <Text>Transport: {trip.transportationMode}</Text>
            <Text>Style: {trip.travelStyle}</Text>
            {trip.budgetLevel && <Text>Budget: {trip.budgetLevel}</Text>}
          </Stack>
        </Box>

        <Box p={5} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
          <Heading size="sm" mb={4}>
            Accommodation
          </Heading>
          <Stack spacing={2} fontSize="sm">
            <Text>{trip.hotelName ?? "Not specified"}</Text>
            <Text color="gray.500">{trip.hotelAddress ?? "—"}</Text>
            {trip.hotelCoordinates && (
              <Text color="gray.500">
                {trip.hotelCoordinates.lat.toFixed(4)}, {trip.hotelCoordinates.lng.toFixed(4)}
              </Text>
            )}
          </Stack>
        </Box>

        {trip.interests.length > 0 && (
          <Box p={5} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl" gridColumn={{ lg: "span 2" }}>
            <Heading size="sm" mb={3}>
              Interests
            </Heading>
            <Wrap>
              {trip.interests.map((interest) => (
                <WrapItem key={interest}>
                  <Tag colorScheme="brand">{interest}</Tag>
                </WrapItem>
              ))}
            </Wrap>
          </Box>
        )}

        {(trip.mustVisitPlaces.length > 0 || trip.excludedPlaces.length > 0) && (
          <Box p={5} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl" gridColumn={{ lg: "span 2" }}>
            {trip.mustVisitPlaces.length > 0 && (
              <Box mb={trip.excludedPlaces.length > 0 ? 4 : 0}>
                <Heading size="sm" mb={2}>
                  Must Visit
                </Heading>
                <Wrap>
                  {trip.mustVisitPlaces.map((place) => (
                    <WrapItem key={place}>
                      <Tag>{place}</Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              </Box>
            )}
            {trip.excludedPlaces.length > 0 && (
              <Box>
                <Heading size="sm" mb={2}>
                  Excluded
                </Heading>
                <Wrap>
                  {trip.excludedPlaces.map((place) => (
                    <WrapItem key={place}>
                      <Tag colorScheme="red" variant="subtle">{place}</Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              </Box>
            )}
          </Box>
        )}

        {trip.notes && (
          <Box p={5} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl" gridColumn={{ lg: "span 2" }}>
            <Heading size="sm" mb={2}>
              Notes
            </Heading>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {trip.notes}
            </Text>
          </Box>
        )}
      </SimpleGrid>

      <Stack spacing={6} mt={6}>
        <TripLegTimeline trip={trip} />
        <VehicleRentalPanel trip={trip} />

        {trip.legs.length > 0 ? (
          tripLegs.map((leg) => (
            <DiscoveryPlacesPanel
              key={leg.id}
              trip={trip}
              leg={leg}
              poolPlaces={poolPlaces}
              selectedPlaceIds={selectedPlaceIds}
              onSelectedChange={syncSelectedFromIds}
            />
          ))
        ) : (
          <DiscoveryPlacesPanel
            trip={trip}
            poolPlaces={poolPlaces}
            selectedPlaceIds={selectedPlaceIds}
            onSelectedChange={syncSelectedFromIds}
          />
        )}
        <TripSelectedPlacesPanel
          trip={trip}
          selectedPlaces={selectedPlaces}
          onSelectedChange={(places) => {
            setSelectedPlaces(places);
            router.refresh();
          }}
        />
      </Stack>

      <ConfirmDialog
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={handleDelete}
        title="Delete trip"
        description="This action cannot be undone. All trip data will be permanently removed."
        confirmLabel="Delete"
        isLoading={isDeleting}
        isDestructive
      />

      <ConfirmDialog
        isOpen={isLeaveOpen}
        onClose={onLeaveClose}
        onConfirm={handleLeave}
        title="Leave trip"
        description="You will lose access to this trip. The owner will be notified."
        confirmLabel="Leave trip"
        isLoading={isLeaving}
        isDestructive
      />
    </Box>
  );
}
