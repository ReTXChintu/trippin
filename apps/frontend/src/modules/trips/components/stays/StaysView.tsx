import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
  useToast,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FiEdit2, FiExternalLink, FiMapPin, FiPlus, FiSearch, FiStar, FiTrash2 } from "react-icons/fi";
import { MdHotel } from "react-icons/md";
import { getApiErrorMessage } from "@/lib/api";
import type { HotelOption, HotelSearchResponse } from "@/modules/trips/api/trips.api";
import { useHotelSearch, useUpdateLegStays } from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg, TripStay } from "@/modules/trips/types/trip-leg.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import {
  addDays,
  firstUncoveredRange,
  formatShortDate,
  getEffectiveStays,
  getNightStay,
  nightCount,
} from "@/modules/trips/utils/stay.utils";
import { CitySwitcher } from "@/modules/trips/components/CitySwitcher";
import { StayFormModal } from "./StayFormModal";

interface StaysViewProps {
  trip: Trip;
  cityId: string;
  onCityChange: (legId: string) => void;
}

function NightsStrip({ leg }: { leg: TripLeg }) {
  const nights: string[] = [];
  for (let d = leg.startDate; d < leg.endDate; d = addDays(d, 1)) nights.push(d);
  if (nights.length === 0) return null;

  return (
    <Wrap spacing={1.5}>
      {nights.map((night) => {
        const stay = getNightStay(leg, night);
        return (
          <WrapItem key={night}>
            <Tooltip label={stay ? `Night of ${formatShortDate(night)} · ${stay.name}` : `No stay booked for ${formatShortDate(night)}`} hasArrow>
              <Badge
                px={2}
                py={1}
                borderRadius="md"
                colorScheme={stay ? "brand" : "orange"}
                variant={stay ? "subtle" : "outline"}
                fontWeight="medium"
                textTransform="none"
              >
                {formatShortDate(night)}
              </Badge>
            </Tooltip>
          </WrapItem>
        );
      })}
    </Wrap>
  );
}

function StayCard({ stay, onEdit, onRemove }: { stay: TripStay; onEdit: () => void; onRemove: () => void }) {
  const border = "border.line";
  const bg = "bg.surface";
  const muted = "fg.muted";
  const nights = nightCount(stay);
  const total = stay.pricePerNight !== undefined ? stay.pricePerNight * nights : undefined;
  const mapsUrl = stay.googlePlaceId
    ? `https://www.google.com/maps/place/?q=place_id:${stay.googlePlaceId}`
    : stay.coordinates
      ? `https://www.google.com/maps/search/?api=1&query=${stay.coordinates.lat},${stay.coordinates.lng}`
      : undefined;

  return (
    <Flex p={4} bg={bg} borderWidth="1px" borderColor={border} borderRadius="xl" gap={4} align="start">
      <Flex boxSize="44px" borderRadius="lg" bg="blue.50" _dark={{ bg: "whiteAlpha.100" }} align="center" justify="center" flexShrink={0}>
        <Icon as={MdHotel} color="blue.400" boxSize={5} />
      </Flex>
      <Box flex={1} minW={0}>
        <Text fontWeight="semibold">{stay.name}</Text>
        <Text fontSize="sm">
          {formatShortDate(stay.checkInDate)} → {formatShortDate(stay.checkOutDate)} · {nights} night{nights === 1 ? "" : "s"}
        </Text>
        <HStack spacing={3} fontSize="xs" color={muted} mt={1} flexWrap="wrap">
          {(stay.checkInTime || stay.checkOutTime) && (
            <Text>
              {stay.checkInTime ? `In ${stay.checkInTime}` : ""}
              {stay.checkInTime && stay.checkOutTime ? " · " : ""}
              {stay.checkOutTime ? `Out ${stay.checkOutTime}` : ""}
            </Text>
          )}
          {stay.confirmationNumber && <Text>Conf. #{stay.confirmationNumber}</Text>}
          {total !== undefined && (
            <Text>
              {stay.currency ?? ""} {stay.pricePerNight?.toLocaleString()}/night · {stay.currency ?? ""} {total.toLocaleString()} total
            </Text>
          )}
        </HStack>
        {stay.address && (
          <Text fontSize="xs" color={muted} mt={1} noOfLines={1}>
            {stay.address}
          </Text>
        )}
        {!stay.coordinates && (
          <Text fontSize="xs" color="orange.500" mt={1}>
            No map location — edit and pick it from search so days can start here.
          </Text>
        )}
        {stay.notes && (
          <Text fontSize="xs" mt={1}>
            📝 {stay.notes}
          </Text>
        )}
        <HStack spacing={3} mt={2}>
          {mapsUrl && (
            <Link href={mapsUrl} isExternal fontSize="xs" color="brand.500">
              Map <Icon as={FiExternalLink} mx="2px" />
            </Link>
          )}
          {stay.bookingUrl && (
            <Link href={stay.bookingUrl} isExternal fontSize="xs" color="brand.500">
              Booking <Icon as={FiExternalLink} mx="2px" />
            </Link>
          )}
        </HStack>
      </Box>
      <HStack spacing={0}>
        <IconButton aria-label="Edit stay" icon={<FiEdit2 />} size="sm" variant="ghost" onClick={onEdit} />
        <IconButton aria-label="Remove stay" icon={<FiTrash2 />} size="sm" variant="ghost" colorScheme="red" onClick={onRemove} />
      </HStack>
    </Flex>
  );
}

function HotelCard({ hotel, onAdd }: { hotel: HotelOption; onAdd: () => void }) {
  const border = "border.line";
  const bg = "bg.surface";
  const muted = "fg.muted";
  const placeholder = "bg.subtle";
  const score = hotel.locationScore;
  const scoreLabel =
    score === undefined ? undefined : score >= 8 ? "Great location" : score >= 6 ? "Good location" : score >= 4 ? "Okay location" : "Far from your places";

  return (
    <Box bg={bg} borderWidth="1px" borderColor={border} borderRadius="xl" overflow="hidden" display="flex" flexDirection="column">
      {hotel.photoUrl ? (
        <Image src={hotel.photoUrl} alt="" h="140px" w="100%" objectFit="cover" fallback={<Box h="140px" bg={placeholder} />} />
      ) : (
        <Flex h="140px" bg={placeholder} align="center" justify="center">
          <Icon as={MdHotel} boxSize={8} color={muted} />
        </Flex>
      )}
      <Stack p={4} spacing={2} flex={1}>
        <Text fontWeight="semibold" noOfLines={2}>
          {hotel.name}
        </Text>
        <HStack spacing={2} fontSize="xs" color={muted} flexWrap="wrap">
          {hotel.rating !== undefined && (
            <HStack spacing={0.5}>
              <Icon as={FiStar} color="yellow.500" />
              <Text>
                {hotel.rating.toFixed(1)}
                {hotel.userRatingCount ? ` (${hotel.userRatingCount.toLocaleString()})` : ""}
              </Text>
            </HStack>
          )}
          {hotel.priceLevel && <Text>· {hotel.priceLevel}</Text>}
        </HStack>
        {score !== undefined && (
          <Box>
            <HStack justify="space-between" fontSize="xs" mb={1}>
              <Text fontWeight="semibold" color={score >= 6 ? "brand.600" : "orange.500"}>
                {scoreLabel}
              </Text>
              <Text color={muted}>{score.toFixed(1)}/10</Text>
            </HStack>
            <Progress value={score * 10} size="xs" borderRadius="full" colorScheme={score >= 6 ? "brand" : "orange"} />
            <Text fontSize="xs" color={muted} mt={1}>
              ~{hotel.avgMinutesToPlaces} min to your places on average · {hotel.placesWithin15Min} within 15 min
            </Text>
          </Box>
        )}
        <HStack pt={2} mt="auto" spacing={2}>
          <Button size="sm" colorScheme="brand" leftIcon={<FiPlus />} onClick={onAdd} flex={1}>
            Add as stay
          </Button>
          <Button as="a" href={hotel.bookingUrl} target="_blank" rel="noopener noreferrer" size="sm" variant="outline" rightIcon={<FiExternalLink />}>
            Prices
          </Button>
          <Tooltip label="Open in Google Maps" hasArrow>
            <IconButton as="a" href={hotel.googleMapsUrl} target="_blank" rel="noopener noreferrer" aria-label="Open in Google Maps" size="sm" variant="ghost" icon={<FiMapPin />} />
          </Tooltip>
        </HStack>
      </Stack>
    </Box>
  );
}

export function StaysView({ trip, cityId, onCityChange }: StaysViewProps) {
  const toast = useToast();
  const legs = getEffectiveLegs(trip);
  const leg = legs.find((l) => l.id === cityId) ?? legs[0];
  const updateStays = useUpdateLegStays(trip.id);
  const hotelSearch = useHotelSearch(trip.id);

  const [formInitial, setFormInitial] = useState<Partial<TripStay> | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HotelSearchResponse | null>(null);

  const muted = "fg.muted";
  const cardBg = "bg.surface";
  const border = "border.line";

  useEffect(() => {
    setResults(null);
    setQuery("");
  }, [leg?.id]);

  if (!leg) return null;
  const stays = getEffectiveStays(leg);

  const saveStays = async (next: TripStay[], successMessage: string) => {
    try {
      const result = await updateStays.mutateAsync({ legId: leg.id, stays: next });
      toast({
        title: successMessage,
        description: result.uncoveredNights.length ? `${result.uncoveredNights.length} night(s) still without a stay.` : "Every night is covered.",
        status: "success",
        duration: 3000,
      });
      setFormInitial(null);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  // A legacy single-hotel leg shows up as one stay (stable id "legacy-<leg>"); saving turns it
  // into a real stay, so `stays` is always the list to edit.
  const persisted = stays;

  const handleSaveStay = (stay: TripStay) => {
    const exists = persisted.some((s) => s.id === stay.id);
    const next = exists ? persisted.map((s) => (s.id === stay.id ? stay : s)) : [...persisted, stay];
    void saveStays(next, exists ? "Stay updated" : "Stay added");
  };

  const handleSearch = async () => {
    try {
      setResults(await hotelSearch.mutateAsync({ legId: leg.id, query: query.trim() || undefined }));
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const newStayDraft = (): Partial<TripStay> => ({ ...firstUncoveredRange(leg) });

  return (
    <Stack spacing={6}>
      <CitySwitcher legs={legs} value={leg.id} onChange={onCityChange} />

      <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="xl" p={5}>
        <Flex justify="space-between" align="start" gap={3} flexWrap="wrap" mb={4}>
          <Box>
            <Heading size="md">Where you're staying in {leg.name || leg.baseCity}</Heading>
            <Text fontSize="sm" color={muted}>
              Each day starts and ends at that night's stay — switch hotels mid-city and the plan follows.
            </Text>
          </Box>
          <Button size="sm" leftIcon={<FiPlus />} onClick={() => setFormInitial(newStayDraft())}>
            Add a stay
          </Button>
        </Flex>

        <Stack spacing={4}>
          <NightsStrip leg={leg} />
          {stays.length === 0 ? (
            <Text fontSize="sm" color={muted}>
              No stays yet. Find a well-located hotel below, or add one you've already booked.
            </Text>
          ) : (
            persisted.map((stay) => (
              <StayCard
                key={stay.id}
                stay={stay}
                onEdit={() => setFormInitial(stay)}
                onRemove={() => void saveStays(persisted.filter((s) => s.id !== stay.id), "Stay removed")}
              />
            ))
          )}
        </Stack>
      </Box>

      <Box bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="xl" p={5}>
        <Heading size="sm" mb={1}>
          Find a hotel near your plans
        </Heading>
        <Text fontSize="sm" color={muted} mb={4}>
          Hotels are scored by how close they are to the places you've picked
          {leg.selectedPlaceIds.length === 0 ? " — pick some places first for a better score." : "."}
        </Text>
        <HStack as="form" onSubmit={(e) => { e.preventDefault(); void handleSearch(); }} spacing={2} mb={5}>
          <InputGroup size="md">
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color={muted} />
            </InputLeftElement>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Boutique, budget, near old city… (optional)`} />
          </InputGroup>
          <Button type="submit" colorScheme="brand" isLoading={hotelSearch.isPending} loadingText="Searching" flexShrink={0}>
            Find hotels
          </Button>
        </HStack>

        {results && (
          <Stack spacing={4}>
            <Text fontSize="xs" color={muted}>
              {results.hotels.length} hotels · location scored against {results.basis.label} · prices for{" "}
              {formatShortDate(results.checkInDate)} → {formatShortDate(results.checkOutDate)}
            </Text>
            {results.hotels.length === 0 ? (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                No hotels found — try a different search.
              </Alert>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, "2xl": 3 }} spacing={4}>
                {results.hotels.map((hotel) => (
                  <HotelCard
                    key={hotel.googlePlaceId}
                    hotel={hotel}
                    onAdd={() =>
                      setFormInitial({
                        ...newStayDraft(),
                        name: hotel.name,
                        address: hotel.address,
                        coordinates: hotel.coordinates,
                        googlePlaceId: hotel.googlePlaceId,
                        rating: hotel.rating,
                        bookingUrl: hotel.bookingUrl,
                      })
                    }
                  />
                ))}
              </SimpleGrid>
            )}
          </Stack>
        )}
      </Box>

      <StayFormModal
        leg={leg}
        initial={formInitial}
        isSaving={updateStays.isPending}
        onClose={() => setFormInitial(null)}
        onSave={handleSaveStay}
      />
    </Stack>
  );
}
