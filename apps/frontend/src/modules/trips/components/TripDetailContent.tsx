import { DiscoveryPlacesPanel } from "@/modules/places/components/DiscoveryPlacesPanel";
import { TripSelectedPlacesPanel } from "@/modules/places/components/TripSelectedPlacesPanel";
import { TripLegTimeline } from "@/modules/trips/components/TripLegTimeline";
import { VehicleRentalPanel } from "@/modules/trips/components/VehicleRentalPanel";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import { isTripOwner } from "@/lib/trip-access";
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
import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
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
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  useArchiveTrip,
  useDeleteTrip,
  useDuplicateTrip,
  useLeaveTrip,
  useShareTrip,
  useTripQuery,
  useUnshareTrip,
} from "@/modules/trips/hooks/useTrips";
import { useGenerateItinerary, useItineraryQuery } from "@/modules/itinerary/hooks/useItinerary";
import { useDiscoverPlaces, useTripPlacesQuery } from "@/modules/places/hooks/usePlaces";
import { getApiErrorMessage } from "@/lib/api";
import { TripMembersPanel } from "@/modules/trips/components/TripMembersPanel";
import { useAuthStore } from "@/store/authStore";

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

export function TripDetailContent() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const currentUserId = useAuthStore((s) => s.user?.id ?? "");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isLeaveOpen, onOpen: onLeaveOpen, onClose: onLeaveClose } = useDisclosure();
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const { data: trip, isLoading: isTripLoading } = useTripQuery(id);
  const { data: poolData } = useTripPlacesQuery(id, "pool");
  const { data: selectedData } = useTripPlacesQuery(id, "selected");
  const { data: itineraryData } = useItineraryQuery(id);

  const deleteTrip = useDeleteTrip();
  const archiveTrip = useArchiveTrip();
  const duplicateTrip = useDuplicateTrip();
  const shareTrip = useShareTrip(id);
  const unshareTrip = useUnshareTrip(id);
  const leaveTrip = useLeaveTrip();
  const discoverPlaces = useDiscoverPlaces(id);
  const generateItinerary = useGenerateItinerary(id);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [localSelected, setLocalSelected] = useState<Place[] | null>(null);

  if (isTripLoading) return <LoadingState />;
  if (!trip) return <EmptyState title="Trip not found" />;

  const isOwner = isTripOwner(trip, currentUserId);
  const poolPlaces = poolData?.places ?? [];
  const selectedPlaces = localSelected ?? selectedData?.places ?? [];
  const hasItinerary = Boolean(itineraryData?.itinerary?.days?.some((d) => d.stops.length > 0));

  const selectedPlaceIds = new Set(selectedPlaces.map((p) => p.googlePlaceId).filter(Boolean) as string[]);

  const syncSelectedFromIds = (ids: string[]) => {
    const catalog = new Map<string, Place>();
    for (const p of [...poolPlaces, ...selectedPlaces]) {
      if (p.googlePlaceId) catalog.set(p.googlePlaceId, p);
    }
    const next = ids.map((placeId) => catalog.get(placeId)).filter((p): p is Place => Boolean(p));
    setLocalSelected(next);
  };

  const shareUrl = trip.publicSlug ? `${window.location.origin}/share/${trip.publicSlug}` : "";
  const { hasCopied, onCopy } = useClipboard(shareUrl);

  const hasDiscoveryPool =
    trip.legs.length > 0
      ? trip.legs.some((leg) => leg.discoveryPoolIds.length > 0)
      : poolPlaces.length > 0 || (trip.discoveryPoolIds?.length ?? 0) > 0;

  const tripLegs = getEffectiveLegs(trip);

  const handleDiscover = async () => {
    try {
      const result = await discoverPlaces.mutateAsync({ forceRefresh: hasDiscoveryPool });
      toast({ title: `Discovered ${result.places.length} places`, status: "success", duration: 4000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const handleGenerateItinerary = async () => {
    try {
      await generateItinerary.mutateAsync();
      toast({ title: "Itinerary generated", status: "success" });
      navigate(`/trips/${trip.id}/itinerary`);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const handleDuplicate = async () => {
    try {
      const result = await duplicateTrip.mutateAsync(trip.id);
      toast({ title: "Trip duplicated", status: "success" });
      navigate(`/trips/${result.trip.id}`);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const handleArchive = async () => {
    try {
      await archiveTrip.mutateAsync(trip.id);
      toast({ title: "Trip archived", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const handleShare = async () => {
    try {
      await shareTrip.mutateAsync();
      toast({ title: "Share link created", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const handleUnshare = async () => {
    try {
      await unshareTrip.mutateAsync();
      toast({ title: "Sharing disabled", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTrip.mutateAsync(trip.id);
      toast({ title: "Trip deleted", status: "success" });
      navigate("/trips");
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      await leaveTrip.mutateAsync(trip.id);
      toast({ title: "You left the trip", status: "success" });
      navigate("/trips");
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    } finally {
      setIsLeaving(false);
      onLeaveClose();
    }
  };

  const missingGoogleKey = trip.ownerApiKeys && !trip.ownerApiKeys.hasGoogleMapsKey;
  const missingOpenAiKey = trip.ownerApiKeys && !trip.ownerApiKeys.hasOpenaiKey;
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
                  Add your API keys in <Link to="/profile" style={{ textDecoration: "underline" }}>Profile</Link> to
                  enable place discovery
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
            isLoading={discoverPlaces.isPending}
            loadingText={hasDiscoveryPool ? "Refreshing..." : "Discovering..."}
          >
            {hasDiscoveryPool ? "Refresh discovery" : "Discover Places"}
          </Button>
          {hasItinerary ? (
            <Button as={Link} to={`/trips/${trip.id}/itinerary`} leftIcon={<FiCalendar />} size="sm" colorScheme="teal">
              View Itinerary
            </Button>
          ) : (
            <Button
              leftIcon={<FiCalendar />}
              size="sm"
              colorScheme="teal"
              variant="outline"
              onClick={handleGenerateItinerary}
              isLoading={generateItinerary.isPending}
              loadingText="Generating..."
              isDisabled={selectedPlaces.length === 0 && trip.selectedPlaceIds.length === 0}
            >
              Generate Itinerary
            </Button>
          )}
          <Button as={Link} to={`/trips/${trip.id}/edit`} leftIcon={<FiEdit />} size="sm">
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
            <Button leftIcon={<FiLogOut />} size="sm" variant="outline" colorScheme="orange" onClick={onLeaveOpen}>
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
        <TripMembersPanel trip={trip} currentUserId={currentUserId} />
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
                      <Tag colorScheme="red" variant="subtle">
                        {place}
                      </Tag>
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
          onSelectedChange={(places) => setLocalSelected(places)}
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
