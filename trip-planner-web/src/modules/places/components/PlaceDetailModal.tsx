"use client";

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
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { FiExternalLink, FiMapPin, FiMinus, FiPlus, FiSearch } from "react-icons/fi";
import {
  addPlaceToTripAction,
  getPlaceDetailRichAction,
  removePlaceFromTripAction,
} from "@/modules/places/actions/places.actions";
import { PlacePhotoCarousel } from "@/modules/places/components/PlacePhotoCarousel";
import type { PlaceDetail } from "@/modules/places/types/place.types";
import type { Trip } from "@/modules/trips/types/trip.types";

interface PlaceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  placeId: string | null;
  isSelected: boolean;
  onSelectedChange: (selectedIds: string[]) => void;
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
  placeId,
  isSelected,
  onSelectedChange,
}: PlaceDetailModalProps) {
  const tripId = trip.id;
  const toast = useToast();
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const borderColor = useColorModeValue("gray.200", "gray.700");
  const muted = useColorModeValue("gray.500", "gray.400");
  const emptyPhotoBg = useColorModeValue("gray.100", "gray.700");

  useEffect(() => {
    if (!isOpen || !placeId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getPlaceDetailRichAction({ tripId, placeId }).then((result) => {
      if (cancelled) return;
      setIsLoading(false);
      if (!result.success) {
        toast({ title: result.error, status: "error", duration: 5000 });
        return;
      }
      setDetail(result.data!.place);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, placeId, tripId, toast]);

  const handleToggleTrip = async () => {
    if (!placeId) return;
    setIsUpdating(true);

    const result = isSelected
      ? await removePlaceFromTripAction({ tripId, placeId })
      : await addPlaceToTripAction({ tripId, placeId });

    setIsUpdating(false);

    if (!result.success) {
      toast({ title: result.error, status: "error" });
      return;
    }

    onSelectedChange(
      result.data!.places.map((p) => p.googlePlaceId!).filter(Boolean),
    );
    toast({
      title: isSelected ? "Removed from trip" : "Added to trip",
      status: "success",
    });
  };

  const photos = detail?.photoUrls ?? (detail?.imageUrl ? [detail.imageUrl] : []);

  const mapsUrl = useMemo(
    () => (detail ? buildGoogleMapsUrl(detail, placeId) : null),
    [detail, placeId],
  );

  const searchUrl = useMemo(
    () => (detail ? buildGoogleSearchUrl(detail) : null),
    [detail],
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader pr={12}>
          {detail?.name ?? "Place details"}
        </ModalHeader>
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
                    <Button
                      size="sm"
                      leftIcon={<FiMapPin />}
                      colorScheme="blue"
                      onClick={() => openExternal(mapsUrl)}
                    >
                      View photos & reviews on Google Maps
                    </Button>
                  )}
                </Flex>
              )}

              <HStack spacing={3} flexWrap="wrap">
                {mapsUrl && (
                  <Button
                    size="md"
                    leftIcon={<FiMapPin />}
                    colorScheme="blue"
                    onClick={() => openExternal(mapsUrl)}
                  >
                    Open in Google Maps
                  </Button>
                )}
                {searchUrl && (
                  <Button
                    size="md"
                    leftIcon={<FiSearch />}
                    variant="outline"
                    onClick={() => openExternal(searchUrl)}
                  >
                    Search on Google
                  </Button>
                )}
              </HStack>

              <HStack flexWrap="wrap" spacing={2}>
                <Tag colorScheme="brand">{detail.category}</Tag>
                {detail.rating !== undefined && (
                  <Tag>
                    {detail.rating.toFixed(1)} ★
                    {detail.userRatingCount !== undefined &&
                      ` (${detail.userRatingCount.toLocaleString()} reviews)`}
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

              {(detail.openingTime ||
                detail.closingTime ||
                (detail.weekdayDescriptions?.length ?? 0) > 0) && (
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
                  {detail.entryFee ??
                    detail.priceLevel ??
                    "Not listed — check Google Maps for ticket prices"}
                </Text>
              </Box>

              {detail.description && (
                <Text fontSize="sm" lineHeight="tall">
                  {detail.description}
                </Text>
              )}

              {detail.websiteUri && (
                <Button
                  size="sm"
                  variant="link"
                  leftIcon={<FiExternalLink />}
                  onClick={() => openExternal(detail.websiteUri!)}
                >
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
          {placeId && (
            <Button
              colorScheme={isSelected ? "red" : "brand"}
              leftIcon={isSelected ? <FiMinus /> : <FiPlus />}
              onClick={handleToggleTrip}
              isLoading={isUpdating}
            >
              {isSelected ? "Remove from trip" : "Add to trip"}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
