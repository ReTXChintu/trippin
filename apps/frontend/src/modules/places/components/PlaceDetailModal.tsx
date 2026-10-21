import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState, type ReactNode } from "react";
import { LuExternalLink, LuMapPin, LuMinus, LuPlus, LuSearch, LuSparkles, LuStar, LuX } from "react-icons/lu";
import { getPlaceDetailRich } from "@/modules/places/api/places.api";
import { useAddPlaceToTrip, useRemovePlaceFromTrip } from "@/modules/places/hooks/usePlaces";
import { getApiErrorMessage } from "@/lib/api";
import { PlacePhotoCarousel } from "@/modules/places/components/PlacePhotoCarousel";
import type { PlaceDetail } from "@/modules/places/types/place.types";
import type { Trip } from "@/modules/trips/types/trip.types";
import { Banner, PhotoFallback } from "@/components/ui";
import { SectionLabel } from "@/components/ui/plan";
import { categoryIcon } from "@/components/ui/plan.utils";

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
  /** "Day 2 · 09:15–11:45 · locked" — shown under "In your plan" when opened from the plan. */
  planInfo?: string;
  /** Extra actions on the left of the footer row (the plan's Edit / Lock / Move to day…). */
  actions?: ReactNode;
  /** What to show if the rich details can't be loaded (e.g. no Maps key) — the plan still knows the name. */
  fallback?: { name: string; category?: string; city?: string };
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

/** Photo strip: one wide + two narrow tiles; tap to open the full-screen carousel. */
function PhotoStrip({ photos, alt, seed, category, mapsUrl }: { photos: string[]; alt: string; seed: string; category: string; mapsUrl: string | null }) {
  const viewer = useDisclosure();
  const [index, setIndex] = useState(0);
  const CatIcon = categoryIcon(category);

  if (photos.length === 0) {
    return (
      <PhotoFallback seed={seed} icon={CatIcon} h={{ base: "140px", md: "200px" }} iconSize={28}>
        <Text position="absolute" left={2} bottom={1} fontSize="12px" fontWeight={600} opacity={0.85}>
          No photo
        </Text>
        {mapsUrl && (
          <Button
            size="sm"
            variant="outline"
            position="absolute"
            right={3}
            bottom={3}
            leftIcon={<LuMapPin />}
            onClick={() => openExternal(mapsUrl)}
          >
            Photos on Google Maps
          </Button>
        )}
      </PhotoFallback>
    );
  }

  const tiles = photos.slice(0, 3);
  const widths = tiles.length === 1 ? ["100%"] : tiles.length === 2 ? ["65%", "35%"] : ["60%", "20%", "20%"];
  return (
    <>
      <Flex gap="4px" h={{ base: "160px", md: "200px" }} bg="sunk">
        {tiles.map((src, i) => (
          <Box
            key={src}
            as="button"
            type="button"
            w={widths[i]}
            h="100%"
            position="relative"
            overflow="hidden"
            onClick={() => {
              setIndex(i);
              viewer.onOpen();
            }}
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
            display={{ base: i === 0 ? "block" : "none", sm: "block" }}
          >
            <img src={src} alt={i === 0 ? alt : ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {i === tiles.length - 1 && photos.length > tiles.length && (
              <Flex position="absolute" inset={0} bg="blackAlpha.500" color="white" align="center" justify="center" fontWeight={600}>
                +{photos.length - tiles.length}
              </Flex>
            )}
          </Box>
        ))}
      </Flex>
      <Modal isOpen={viewer.isOpen} onClose={viewer.onClose} size="full" motionPreset="slideInBottom">
        <ModalOverlay bg="blackAlpha.900" />
        <ModalContent bg="black" m={0} borderRadius={0}>
          <IconButton
            aria-label="Close photos"
            icon={<LuX size={20} />}
            position="absolute"
            top={3}
            right={3}
            zIndex={10}
            variant="ghost"
            color="white"
            _hover={{ bg: "whiteAlpha.200" }}
            onClick={viewer.onClose}
          />
          <ModalBody display="flex" alignItems="center" justifyContent="center" px={{ base: 2, md: 8 }} py={12}>
            <Box w="full" maxW="1200px">
              <PlacePhotoCarousel
                photos={photos}
                alt={alt}
                mapsUrl={mapsUrl}
                onOpenMaps={mapsUrl ? () => openExternal(mapsUrl) : undefined}
                variant="fullscreen"
                index={index}
                onIndexChange={setIndex}
              />
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
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
  planInfo,
  actions,
  fallback,
}: PlaceDetailModalProps) {
  const tripId = trip.id;
  const toast = useToast();
  const [loaded, setLoaded] = useState<PlaceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const addPlace = useAddPlaceToTrip(tripId, legId);
  const removePlace = useRemovePlaceFromTrip(tripId, legId);

  useEffect(() => {
    if (!isOpen || !placeId) {
      setLoaded(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    getPlaceDetailRich(tripId, placeId)
      .then((result) => {
        if (cancelled) return;
        setLoaded(result.place);
      })
      .catch((err) => {
        if (cancelled) return;
        if (fallback) setLoadError(getApiErrorMessage(err));
        else toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `fallback` only matters when a load fails; don't refetch when its identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, placeId, tripId, toast]);

  const detail: PlaceDetail | null =
    loaded ??
    (!isLoading && fallback
      ? { name: fallback.name, category: fallback.category ?? "Place", city: fallback.city ?? "", country: "", source: "user" }
      : null);

  const handleToggleTrip = async () => {
    if (!placeId) return;

    try {
      const result = isSelected ? await removePlace.mutateAsync(placeId) : await addPlace.mutateAsync(placeId);

      onSelectedChange(result.places.map((p) => p.googlePlaceId!).filter(Boolean));
      toast({ title: isSelected ? "Removed from trip" : "Added to trip", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const photos = detail?.photoUrls ?? (detail?.imageUrl ? [detail.imageUrl] : []);
  const mapsUrl = detail ? buildGoogleMapsUrl(detail, placeId) : null;
  const searchUrl = detail ? buildGoogleSearchUrl(detail) : null;
  const CatIcon = categoryIcon(detail?.category);
  const hasHours = Boolean(detail && (detail.openingTime || detail.closingTime || (detail.weekdayDescriptions?.length ?? 0) > 0));
  const reviews = detail?.reviews ?? [];

  const metaParts: ReactNode[] = [];
  if (detail) {
    if (detail.rating !== undefined) {
      metaParts.push(
        <HStack as="span" key="r" spacing="4px" display="inline-flex">
          <Icon as={LuStar} boxSize="13px" color="warn" />
          <span>
            {detail.rating.toFixed(1)}
            {detail.userRatingCount !== undefined ? ` · ${detail.userRatingCount.toLocaleString()} reviews` : ""}
          </span>
        </HStack>,
      );
    }
    if (detail.priceLevel) metaParts.push(<span key="p">{detail.priceLevel}</span>);
    if (detail.priceRange) metaParts.push(<span key="pr">{detail.priceRange}</span>);
    if (detail.closingTime) metaParts.push(<span key="c">Open until {detail.closingTime}</span>);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent maxW="760px" mx={4} borderRadius="3xl" overflow="hidden" bg="sf" boxShadow="ds2">
        <ModalBody p={0}>
          {isLoading || !detail ? (
            <Stack p={6} spacing={4}>
              {isLoading ? (
                <>
                  <Skeleton h="200px" borderRadius="lg" startColor="sunk" endColor="ln" />
                  <Skeleton h="28px" w="50%" startColor="sunk" endColor="ln" />
                  <Skeleton h="16px" w="70%" startColor="sunk" endColor="ln" />
                </>
              ) : (
                <Flex justify="space-between" align="center">
                  <Text color="tx3" fontSize="13px">
                    Select a place to view details.
                  </Text>
                  <IconButton aria-label="Close" icon={<LuX size={18} />} variant="outline" onClick={onClose} />
                </Flex>
              )}
            </Stack>
          ) : (
            <>
              <PhotoStrip photos={photos} alt={detail.name} seed={detail.name} category={detail.category} mapsUrl={mapsUrl} />
              <Stack spacing="14px" px={{ base: 5, md: "26px" }} py="22px">
                <Flex justify="space-between" align="flex-start" gap={3}>
                  <Box minW={0}>
                    <Text as="h2" fontWeight={600} fontSize="22px" lineHeight="28px">
                      {detail.name}
                    </Text>
                    <Flex align="center" gap={2} color="tx3" flexWrap="wrap" mt={1}>
                      <HStack as="span" spacing="6px">
                        <Icon as={CatIcon} boxSize="15px" />
                        <span>{detail.category}</span>
                      </HStack>
                      {metaParts.map((part, i) => (
                        <HStack as="span" key={i} spacing={2}>
                          <span aria-hidden>·</span>
                          {part}
                        </HStack>
                      ))}
                    </Flex>
                    {detail.formattedAddress && (
                      <Text fontSize="12px" color="tx3" mt={1}>
                        {detail.formattedAddress}
                      </Text>
                    )}
                  </Box>
                  <IconButton aria-label="Close" title="Close" icon={<LuX size={18} />} variant="outline" onClick={onClose} flexShrink={0} />
                </Flex>

                {loadError && (
                  <Banner tone="warn" py="10px" borderRadius="md">
                    Photos, hours and reviews couldn't be loaded — {loadError}
                  </Banner>
                )}

                {(detail.reviewSummary || detail.description) && (
                  <Flex gap="10px" px="14px" py={3} bg="acSoft" color="ac" borderRadius="xl" align="flex-start">
                    <Icon as={LuSparkles} boxSize="16px" mt="2px" flexShrink={0} />
                    <Text fontSize="13px">
                      <b>{detail.reviewSummary ? "Summary" : "About"}</b> · {detail.reviewSummary ?? detail.description}
                    </Text>
                  </Flex>
                )}

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <Stack spacing="6px">
                    {hasHours && (
                      <>
                        <SectionLabel>Opening hours</SectionLabel>
                        {detail.weekdayDescriptions?.length ? (
                          detail.weekdayDescriptions.map((line) => (
                            <Text key={line} fontSize="12px">
                              {line}
                            </Text>
                          ))
                        ) : (
                          <Text fontSize="13px">
                            {detail.openingTime} – {detail.closingTime}
                          </Text>
                        )}
                      </>
                    )}
                    <SectionLabel mt={hasHours ? 2 : 0}>Entry / cost</SectionLabel>
                    <Text fontSize="13px" color={detail.entryFee ?? detail.priceLevel ? undefined : "tx3"}>
                      {detail.entryFee ?? detail.priceLevel ?? "Not listed — check Google Maps for ticket prices"}
                    </Text>
                    {planInfo && (
                      <>
                        <SectionLabel mt={2}>In your plan</SectionLabel>
                        <Text fontSize="13px">{planInfo}</Text>
                      </>
                    )}
                  </Stack>
                  <Stack spacing="6px">
                    <SectionLabel>Reviews</SectionLabel>
                    {reviews.length === 0 ? (
                      <Text fontSize="13px" color="tx3">
                        No reviews loaded — see them on Google Maps.
                      </Text>
                    ) : (
                      <Stack spacing={3} maxH="240px" overflowY="auto" pr={1}>
                        {reviews.map((review, i) => (
                          <Box key={i}>
                            <Text fontSize="13px" color="tx3" noOfLines={4}>
                              “{review.text}”
                            </Text>
                            <Text fontSize="12px" color="tx3" mt="2px">
                              — {review.authorName ?? "Google user"}
                              {review.rating !== undefined ? ` · ${review.rating}★` : ""}
                              {review.relativeTime ? ` · ${review.relativeTime}` : ""}
                            </Text>
                          </Box>
                        ))}
                        <Text fontSize="12px" color="tx3">
                          Reviews from Google
                        </Text>
                      </Stack>
                    )}
                  </Stack>
                </SimpleGrid>

                <Flex justify="space-between" align="center" gap={3} flexWrap="wrap" pt={1}>
                  <Flex gap={2} flexWrap="wrap" align="center">
                    {actions}
                    {placeId && !hideTripToggle && (
                      <Button
                        variant={isSelected ? "danger" : "solid"}
                        leftIcon={isSelected ? <LuMinus /> : <LuPlus />}
                        onClick={handleToggleTrip}
                        isLoading={addPlace.isPending || removePlace.isPending}
                      >
                        {isSelected ? "Remove from trip" : "Add to trip"}
                      </Button>
                    )}
                    {searchUrl && (
                      <Button variant="ghost" leftIcon={<LuSearch />} onClick={() => openExternal(searchUrl)}>
                        Search on Google
                      </Button>
                    )}
                    {detail.websiteUri && (
                      <Button variant="ghost" leftIcon={<LuExternalLink />} onClick={() => openExternal(detail.websiteUri!)}>
                        Website
                      </Button>
                    )}
                  </Flex>
                  {mapsUrl && (
                    <Button leftIcon={<LuMapPin />} onClick={() => openExternal(mapsUrl)} variant={!hideTripToggle && !isSelected ? "outline" : "solid"}>
                      Open in Google Maps
                    </Button>
                  )}
                </Flex>
              </Stack>
            </>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
