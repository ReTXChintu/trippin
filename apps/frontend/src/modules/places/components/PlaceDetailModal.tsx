import {
  Box,
  Button,
  Flex,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
  Tag,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { FiExternalLink, FiMapPin, FiMinus, FiPlus, FiSearch } from "react-icons/fi";
import { getPlaceDetailRich } from "@/modules/places/api/places.api";
import { useAddPlaceToTrip, useRemovePlaceFromTrip } from "@/modules/places/hooks/usePlaces";
import { getApiErrorMessage } from "@/lib/api";
import { PlacePhotoCarousel } from "@/modules/places/components/PlacePhotoCarousel";
import type { PlaceDetail } from "@/modules/places/types/place.types";
import type { Trip } from "@/modules/trips/types/trip.types";

interface PlaceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  legId: string;
  placeId: string | null;
  isSelected: boolean;
  onSelectedChange: (selectedIds: string[]) => void;
  /** Hide the add/remove-from-trip button (e.g. when opened from the day plan). */
  hideTripToggle?: boolean;
}

function buildGoogleMapsUrl(detail: PlaceDetail, placeId: string | null): string {
  if (detail.googleMapsUrl) return detail.googleMapsUrl;
  if (detail.googleMapsUri) return detail.googleMapsUri;
  if (placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detail.name)}&query_place_id=${placeId}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${detail.name} ${detail.city}`)}`;
}

function buildGoogleSearchUrl(detail: PlaceDetail): string {
  if (detail.googleSearchUrl) return detail.googleSearchUrl;
  return `https://www.google.com/search?q=${encodeURIComponent(`${detail.name} ${detail.city} ${detail.country}`)}`;
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function PlaceDetailModal({
  isOpen,
  onClose,
  trip,
  legId,
  placeId,
  isSelected,
  onSelectedChange,
  hideTripToggle = false,
}: PlaceDetailModalProps) {
  const tripId = trip.id;
  const toast = useToast();
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const addPlace = useAddPlaceToTrip(tripId, legId);
  const removePlace = useRemovePlaceFromTrip(tripId, legId);

  const borderColor = "border.line";
  const muted = "fg.muted";
  const emptyPhotoBg = "bg.subtle";

  useEffect(() => {
    if (!isOpen || !placeId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getPlaceDetailRich(tripId, placeId)
      .then((result) => {
        if (cancelled) return;
        setDetail(result.place);
      })
      .catch((err) => {
        if (cancelled) return;
        toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, placeId, tripId, toast]);

  const handleToggleTrip = async () => {
    if (!placeId) return;

    try {
      const result = isSelected
        ? await removePlace.mutateAsync(placeId)
        : await addPlace.mutateAsync(placeId);

      onSelectedChange(result.places.map((p) => p.googlePlaceId!).filter(Boolean));
      toast({ title: isSelected ? "Removed from trip" : "Added to trip", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const photos = detail?.photoUrls ?? (detail?.imageUrl ? [detail.imageUrl] : []);

  const mapsUrl = useMemo(() => (detail ? buildGoogleMapsUrl(detail, placeId) : null), [detail, placeId]);

  const searchUrl = useMemo(() => (detail ? buildGoogleSearchUrl(detail) : null), [detail]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader pr={12}>{detail?.name ?? "Place details"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
            <Flex justify="center" py={10}>
              <Spinner />
            </Flex>
          ) : detail ? (
            <Stack spacing={4}>
              {photos.length > 0 ? (
                <PlacePhotoCarousel
                  photos={photos}
                  alt={detail.name}
                  mapsUrl={mapsUrl}
                  onOpenMaps={mapsUrl ? () => openExternal(mapsUrl) : undefined}
                />
              ) : (
                <Flex
                  h="140px"
                  bg={emptyPhotoBg}
                  borderRadius="lg"
                  direction="column"
                  align="center"
                  justify="center"
                  gap={3}
                  px={4}
                >
                  <Text fontSize="sm" color={muted} textAlign="center">
                    No photos loaded for this place
                  </Text>
                  {mapsUrl && (
                    <Button size="sm" leftIcon={<FiMapPin />} colorScheme="blue" onClick={() => openExternal(mapsUrl)}>
                      View photos & reviews on Google Maps
                    </Button>
                  )}
                </Flex>
              )}

              <HStack spacing={3} flexWrap="wrap">
                {mapsUrl && (
                  <Button size="md" leftIcon={<FiMapPin />} colorScheme="blue" onClick={() => openExternal(mapsUrl)}>
                    Open in Google Maps
                  </Button>
                )}
                {searchUrl && (
                  <Button size="md" leftIcon={<FiSearch />} variant="outline" onClick={() => openExternal(searchUrl)}>
                    Search on Google
                  </Button>
                )}
              </HStack>

              <HStack flexWrap="wrap" spacing={2}>
                <Tag colorScheme="brand">{detail.category}</Tag>
                {detail.rating !== undefined && (
                  <Tag>
                    {detail.rating.toFixed(1)} ★
                    {detail.userRatingCount !== undefined && ` (${detail.userRatingCount.toLocaleString()} reviews)`}
                  </Tag>
                )}
                {detail.priceLevel && <Tag variant="subtle">{detail.priceLevel}</Tag>}
                {detail.priceRange && <Tag variant="subtle">{detail.priceRange}</Tag>}
              </HStack>

              {detail.formattedAddress && (
                <HStack align="start" spacing={2}>
                  <Box as={FiMapPin} mt={1} color={muted} />
                  <Text fontSize="sm" color={muted}>
                    {detail.formattedAddress}
                  </Text>
                </HStack>
              )}

              {(detail.openingTime || detail.closingTime || (detail.weekdayDescriptions?.length ?? 0) > 0) && (
                <Box p={3} borderWidth="1px" borderColor={borderColor} borderRadius="md">
                  <Text fontSize="sm" fontWeight="medium" mb={1}>
                    Opening hours
                  </Text>
                  {detail.weekdayDescriptions?.length ? (
                    detail.weekdayDescriptions.map((line) => (
                      <Text key={line} fontSize="xs" color={muted}>
                        {line}
                      </Text>
                    ))
                  ) : (
                    <Text fontSize="sm" color={muted}>
                      {detail.openingTime} – {detail.closingTime}
                    </Text>
                  )}
                </Box>
              )}

              <Box p={3} borderWidth="1px" borderColor={borderColor} borderRadius="md">
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  Entry / cost
                </Text>
                <Text fontSize="sm" color={muted}>
                  {detail.entryFee ?? detail.priceLevel ?? "Not listed — check Google Maps for ticket prices"}
                </Text>
              </Box>

              {(detail.reviewSummary || detail.description) && (
                <Text fontSize="sm" lineHeight="tall">
                  {detail.reviewSummary ?? detail.description}
                </Text>
              )}

              {(detail.reviews?.length ?? 0) > 0 && (
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    What visitors say
                  </Text>
                  <Stack spacing={3}>
                    {detail.reviews!.map((review, i) => (
                      <Box key={i} p={3} borderWidth="1px" borderColor={borderColor} borderRadius="md">
                        <HStack justify="space-between" mb={1} fontSize="xs" color={muted}>
                          <Text fontWeight="semibold">{review.authorName ?? "Google user"}</Text>
                          <Text>
                            {review.rating !== undefined ? `${"★".repeat(Math.round(review.rating))} · ` : ""}
                            {review.relativeTime}
                          </Text>
                        </HStack>
                        <Text fontSize="sm" noOfLines={5}>
                          {review.text}
                        </Text>
                      </Box>
                    ))}
                  </Stack>
                  <Text fontSize="2xs" color={muted} mt={2}>
                    Reviews from Google
                  </Text>
                </Box>
              )}

              {detail.websiteUri && (
                <Button size="sm" variant="link" leftIcon={<FiExternalLink />} onClick={() => openExternal(detail.websiteUri!)}>
                  Visit website
                </Button>
              )}
            </Stack>
          ) : (
            <Text color={muted} fontSize="sm">
              Select a place to view details.
            </Text>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Close
          </Button>
          {placeId && !hideTripToggle && (
            <Button
              colorScheme={isSelected ? "red" : "brand"}
              leftIcon={isSelected ? <FiMinus /> : <FiPlus />}
              onClick={handleToggleTrip}
              isLoading={addPlace.isPending || removePlace.isPending}
            >
              {isSelected ? "Remove from trip" : "Add to trip"}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
