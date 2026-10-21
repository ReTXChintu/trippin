import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Link,
  Stack,
  Text,
  Tooltip,
  useBreakpointValue,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { FiAlertTriangle, FiCheck, FiEdit2, FiExternalLink, FiLink, FiMapPin, FiPlus, FiSearch, FiStar, FiTrash2 } from "react-icons/fi";
import { LuBed, LuBike } from "react-icons/lu";
import { Overline, Pill } from "@/components/ui";
import { CityChips, NightTile, RowCard, SectionTitle, TabSplit, Thumb } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/api";
import type { HotelOption, HotelSearchResponse } from "@/modules/trips/api/trips.api";
import { useHotelSearch, useUpdateLegStays } from "@/modules/trips/hooks/useTrips";
import { useDiscoverVehicleRentals, useTripPlacesQuery } from "@/modules/places/hooks/usePlaces";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg, TripStay } from "@/modules/trips/types/trip-leg.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import {
  addDays,
  firstUncoveredRange,
  formatShortDate,
  getEffectiveStays,
  getNightStay,
  getUncoveredNights,
  nightCount,
} from "@/modules/trips/utils/stay.utils";
import { formatMoney } from "@/modules/trips/utils/money";
import { VehicleRentalPanel } from "@/modules/trips/components/VehicleRentalPanel";
import { LegendPin, type MapPin, TabMap } from "@/modules/trips/components/tabs/TabMap";
import { StayFormModal } from "./StayFormModal";

interface StaysViewProps {
  trip: Trip;
  /** The city to show; `null`/unknown id shows every city (the design's "All cities"). */
  cityId?: string | null;
  onCityChange: (legId: string) => void;
}

function fmt(date: string, pattern: string): string {
  try {
    return format(parseISO(date), pattern);
  } catch {
    return date;
  }
}

/** "5 – 8 Oct" / "30 Sep – 2 Oct". */
function dateRange(from: string, to: string): string {
  return fmt(from, "MMM") === fmt(to, "MMM") ? `${fmt(from, "d")} – ${fmt(to, "d MMM")}` : `${fmt(from, "d MMM")} – ${fmt(to, "d MMM")}`;
}

/** "8, 9 and 10 Oct". */
function nightList(nights: string[]): string {
  if (nights.length === 0) return "";
  const days = nights.map((n) => fmt(n, "d"));
  const month = fmt(nights[nights.length - 1], "MMM");
  if (days.length === 1) return `${fmt(nights[0], "d MMM")}`;
  return `${days.slice(0, -1).join(", ")} and ${days[days.length - 1]} ${month}`;
}

function legNights(leg: TripLeg): string[] {
  const nights: string[] = [];
  for (let d = leg.startDate; d < leg.endDate; d = addDays(d, 1)) nights.push(d);
  return nights;
}

function NightsStrip({ legs }: { legs: TripLeg[] }) {
  const compact = useBreakpointValue({ base: true, md: false }, { ssr: false }) ?? false;
  const nights = legs.flatMap((leg) => legNights(leg).map((night) => ({ leg, night, stay: getNightStay(leg, night) })));
  if (nights.length === 0) return null;
  return (
    <Stack spacing={2}>
      <Overline>Nights covered</Overline>
      <Flex gap={compact ? 1 : "6px"} flexWrap="wrap" role="list" aria-label="Nights and stays">
        {nights.map(({ leg, night, stay }) => (
          <Flex key={`${leg.id}-${night}`} role="listitem" flex="1 1 0" minW={compact ? "40px" : "72px"} maxW={compact ? "64px" : "132px"}>
            <NightTile
              covered={Boolean(stay)}
              compact={compact}
              top={compact ? fmt(night, "d") : fmt(night, "d MMM")}
              bottom={compact ? (stay ? "Stay" : "Gap") : stay ? leg.name || leg.baseCity : "No stay"}
              title={stay ? `Night of ${formatShortDate(night)} · ${stay.name}` : `No stay for the night of ${formatShortDate(night)}`}
            />
          </Flex>
        ))}
      </Flex>
    </Stack>
  );
}

function StayCard({ stay, onEdit, onRemove }: { stay: TripStay; onEdit: () => void; onRemove: () => void }) {
  const nights = nightCount(stay);
  const total = stay.pricePerNight !== undefined ? stay.pricePerNight * nights : undefined;
  const money = (n: number) => formatMoney(n, stay.currency || "INR");
  const mapsUrl = stay.googlePlaceId
    ? `https://www.google.com/maps/place/?q=place_id:${stay.googlePlaceId}`
    : stay.coordinates
      ? `https://www.google.com/maps/search/?api=1&query=${stay.coordinates.lat},${stay.coordinates.lng}`
      : undefined;
  const times = [stay.checkInTime && `check-in ${stay.checkInTime}`, stay.checkOutTime && `check-out ${stay.checkOutTime}`].filter(Boolean).join(" · ");

  return (
    <Box bg="sf" borderWidth="1px" borderColor="ln" borderRadius="xl" px={4} py="14px">
      <Flex gap={3} align="center">
        <Thumb seed={stay.id} icon={LuBed} size={56} />
        <Flex direction="column" flex={1} minW={0}>
          <Text fontWeight={600} fontSize="16px" noOfLines={1}>
            {stay.name}
          </Text>
          <Text fontSize="12px" color="tx3">
            {dateRange(stay.checkInDate, stay.checkOutDate)}
            {times ? ` · ${times}` : ""}
          </Text>
        </Flex>
        <Pill tone="success" icon={FiCheck} display={{ base: "none", sm: "inline-flex" }}>
          Covers {nights} night{nights === 1 ? "" : "s"}
        </Pill>
        <HStack spacing={0}>
          <IconButton aria-label={`Edit ${stay.name}`} title="Edit stay" icon={<FiEdit2 size={16} />} variant="ghost" colorScheme="gray" onClick={onEdit} />
          <IconButton aria-label={`Remove ${stay.name}`} title="Remove stay" icon={<FiTrash2 size={16} />} variant="ghost" color="tx3" _hover={{ color: "crit", bg: "critSoft" }} onClick={onRemove} />
        </HStack>
      </Flex>
      <Flex gap={{ base: 3, md: 5 }} rowGap={1} mt="10px" fontSize="12px" flexWrap="wrap" align="center">
        {stay.pricePerNight !== undefined && (
          <Text>
            <Text as="span" color="tx3">
              Per night
            </Text>{" "}
            <b>{money(stay.pricePerNight)}</b>
            {total !== undefined && nights > 1 && (
              <Text as="span" color="tx3">
                {" "}
                · {money(total)} total
              </Text>
            )}
          </Text>
        )}
        {stay.confirmationNumber && (
          <Text>
            <Text as="span" color="tx3">
              Confirmation
            </Text>{" "}
            <b>{stay.confirmationNumber}</b>
          </Text>
        )}
        {stay.rating !== undefined && (
          <HStack spacing={1}>
            <Text color="tx3">Rating</Text>
            <b>{stay.rating.toFixed(1)}</b>
            <Icon as={FiStar} color="warn" boxSize="12px" />
          </HStack>
        )}
        {stay.bookingUrl && (
          <Link href={stay.bookingUrl} isExternal color="ac" fontWeight={600} textDecoration="underline" display="inline-flex" alignItems="center" gap={1}>
            <FiLink /> Booking link
          </Link>
        )}
        {mapsUrl && (
          <Link href={mapsUrl} isExternal color="ac" fontWeight={600} textDecoration="underline" display="inline-flex" alignItems="center" gap={1}>
            <FiMapPin /> Map
          </Link>
        )}
      </Flex>
      {stay.address && (
        <Text fontSize="12px" color="tx3" mt={1} noOfLines={1}>
          {stay.address}
        </Text>
      )}
      {!stay.coordinates && (
        <Text fontSize="12px" color="warn" mt={1}>
          No map location — edit and pick it from search so days can start here.
        </Text>
      )}
      {stay.notes && (
        <Text fontSize="12px" mt={1}>
          {stay.notes}
        </Text>
      )}
    </Box>
  );
}

function HotelRow({ hotel, index, onAdd }: { hotel: HotelOption; index: number; onAdd: () => void }) {
  const reasons = [
    hotel.placesWithin15Min !== undefined && `Near ${hotel.placesWithin15Min} of your places`,
    hotel.avgMinutesToPlaces !== undefined && `~${hotel.avgMinutesToPlaces} min to them on average`,
    hotel.distanceToCenterKm !== undefined && hotel.placesWithin15Min === undefined && `${hotel.distanceToCenterKm.toFixed(1)} km from the centre`,
  ].filter(Boolean);
  return (
    <RowCard flexWrap={{ base: "wrap", sm: "nowrap" }}>
      <Box position="relative">
        <Thumb src={hotel.photoUrl} seed={hotel.googlePlaceId} icon={LuBed} alt="" />
        <Flex position="absolute" top="-6px" left="-6px" h="20px" minW="20px" px="4px" borderRadius="full" bg="ac" color="acTx" fontSize="11px" fontWeight={700} align="center" justify="center" borderWidth="2px" borderColor="sf" aria-hidden>
          H{index + 1}
        </Flex>
      </Box>
      <Flex direction="column" flex={1} minW={0}>
        <Text fontWeight={600} noOfLines={1}>
          {hotel.name}
        </Text>
        <Text fontSize="12px" color="tx3" noOfLines={2}>
          {reasons.length ? reasons.join(" · ") : hotel.address}
        </Text>
      </Flex>
      <Flex direction="column" align="flex-end" flexShrink={0}>
        {hotel.rating !== undefined && (
          <HStack spacing={1} fontSize="13px" fontWeight={600}>
            <Icon as={FiStar} color="warn" boxSize="12px" />
            <Text>{hotel.rating.toFixed(1)}</Text>
          </HStack>
        )}
        {hotel.priceLevel && (
          <Text fontSize="12px" color="tx3">
            {hotel.priceLevel}
          </Text>
        )}
      </Flex>
      <HStack spacing={1} flexShrink={0} ml={{ base: "auto", sm: 0 }}>
        <Button variant="outline" leftIcon={<FiPlus size={16} />} onClick={onAdd}>
          Add as stay
        </Button>
        <Tooltip label="See prices" hasArrow>
          <IconButton as="a" href={hotel.bookingUrl} target="_blank" rel="noopener noreferrer" aria-label={`Prices for ${hotel.name}`} icon={<FiExternalLink size={16} />} variant="ghost" colorScheme="gray" />
        </Tooltip>
        <Tooltip label="Open in Google Maps" hasArrow>
          <IconButton as="a" href={hotel.googleMapsUrl} target="_blank" rel="noopener noreferrer" aria-label={`${hotel.name} in Google Maps`} icon={<FiMapPin size={16} />} variant="ghost" colorScheme="gray" />
        </Tooltip>
      </HStack>
    </RowCard>
  );
}

function RentalsBlock({ trip, legs }: { trip: Trip; legs: TripLeg[] }) {
  const toast = useToast();
  const discoverRentals = useDiscoverVehicleRentals(trip.id);
  const [busyLeg, setBusyLeg] = useState<string | null>(null);
  const ownVehicle = trip.transportationMode === "Self Drive" || trip.transportationMode === "Bike";
  const hasAny = legs.some((l) => l.vehicleRentalSuggestions.length > 0);

  if (!ownVehicle && !hasAny) {
    return (
      <Flex align="center" gap="10px" px="14px" py="10px" borderWidth="1px" borderStyle="dashed" borderColor="ln" borderRadius="xl" color="tx3">
        <Icon as={LuBike} boxSize="16px" flexShrink={0} />
        <Text fontSize="12px">Vehicle and scooter rentals near your stay appear here when &ldquo;Getting around&rdquo; is self-drive or bike.</Text>
      </Flex>
    );
  }

  const search = async (leg: TripLeg) => {
    setBusyLeg(leg.id);
    try {
      const result = await discoverRentals.mutateAsync(leg.id);
      toast({ title: `Found ${result.vehicleRentalSuggestions.length} rental option(s)`, status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    } finally {
      setBusyLeg(null);
    }
  };

  return (
    <Stack spacing={3}>
      <Flex align="center" gap="6px" fontWeight={600} fontSize="15px">
        <Icon as={LuBike} /> Vehicle &amp; scooter rentals
      </Flex>
      {legs.map((leg) => {
        const hasHotel = Boolean(leg.hotelCoordinates);
        const hasRentals = leg.vehicleRentalSuggestions.length > 0;
        return (
          <Stack key={leg.id} spacing={2}>
            <Flex align="center" justify="space-between" gap={2} flexWrap="wrap">
              <Text fontSize="13px" color="tx3">
                {leg.name || leg.baseCity}
                {leg.hotelName ? ` · near ${leg.hotelName}` : ""}
              </Text>
              <Tooltip label="Add a stay first" isDisabled={hasHotel} hasArrow>
                <Box>
                  <Button size="sm" variant="outline" leftIcon={<FiSearch />} onClick={() => void search(leg)} isLoading={busyLeg === leg.id} isDisabled={!hasHotel}>
                    {hasRentals ? "Refresh rentals" : "Search rentals"}
                  </Button>
                </Box>
              </Tooltip>
            </Flex>
            {hasRentals ? (
              <VehicleRentalPanel trip={trip} legId={leg.id} />
            ) : (
              <Text fontSize="12px" color="tx3">
                {hasHotel ? "No rental suggestions yet — search near your stay." : "Add a stay to search rentals near it."}
              </Text>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}

export function StaysView({ trip, cityId }: StaysViewProps) {
  const toast = useToast();
  const allLegs = getEffectiveLegs(trip);
  const focused = allLegs.find((l) => l.id === cityId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const legs = useMemo(() => (focused ? [focused] : allLegs), [focused?.id, trip]);
  const updateStays = useUpdateLegStays(trip.id);
  const hotelSearch = useHotelSearch(trip.id);
  const poolQuery = useTripPlacesQuery(trip.id, "pool");
  const isWide = useBreakpointValue({ base: false, lg: true }, { ssr: false }) ?? true;

  const [formInitial, setFormInitial] = useState<Partial<TripStay> | null>(null);
  const [formLegId, setFormLegId] = useState<string | null>(null);
  const [laterLegs, setLaterLegs] = useState<Set<string>>(new Set());
  const defaultSuggestLeg = legs.find((l) => getUncoveredNights(l).length > 0) ?? legs[0];
  const [suggestLegId, setSuggestLegId] = useState<string | undefined>(defaultSuggestLeg?.id);
  const suggestLeg = legs.find((l) => l.id === suggestLegId) ?? defaultSuggestLeg;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HotelSearchResponse | null>(null);

  useEffect(() => {
    setResults(null);
    setQuery("");
  }, [suggestLeg?.id]);

  const selectedIds = useMemo(() => new Set(legs.flatMap((l) => l.selectedPlaceIds)), [legs]);
  const pins = useMemo<MapPin[]>(() => {
    const out: MapPin[] = [];
    legs.forEach((leg) => {
      for (const s of getEffectiveStays(leg)) {
        if (s.coordinates) out.push({ id: `stay-${leg.id}-${s.id}`, lat: s.coordinates.lat, lng: s.coordinates.lng, kind: "stay", title: s.name, popup: <Text fontWeight={600}>{s.name}</Text> });
      }
    });
    const legIndex = new Map(allLegs.map((l, i) => [l.id, i]));
    for (const p of poolQuery.data?.places ?? []) {
      if (!p.coordinates || !p.googlePlaceId || !selectedIds.has(p.googlePlaceId)) continue;
      const leg = legs.find((l) => l.selectedPlaceIds.includes(p.googlePlaceId!));
      out.push({ id: `p-${p.googlePlaceId}`, lat: p.coordinates.lat, lng: p.coordinates.lng, kind: "dim", color: `day.${((legIndex.get(leg?.id ?? "") ?? 0) % 8) + 1}`, title: p.name, popup: <Text fontWeight={600}>{p.name}</Text> });
    }
    (results?.hotels ?? []).forEach((h, i) => {
      if (h.coordinates) out.push({ id: `h-${h.googlePlaceId}`, lat: h.coordinates.lat, lng: h.coordinates.lng, kind: "hotel", label: `H${i + 1}`, title: h.name, popup: <Text fontWeight={600}>{h.name}</Text> });
    });
    return out;
  }, [legs, allLegs, poolQuery.data, results, selectedIds]);

  if (legs.length === 0) return null;
  const formLeg = allLegs.find((l) => l.id === formLegId) ?? legs[0];

  const saveStays = async (leg: TripLeg, next: TripStay[], successMessage: string) => {
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
  // into a real stay, so the effective stays are always the list to edit.
  const handleSaveStay = (stay: TripStay) => {
    const persisted = getEffectiveStays(formLeg);
    const exists = persisted.some((s) => s.id === stay.id);
    const next = exists ? persisted.map((s) => (s.id === stay.id ? stay : s)) : [...persisted, stay];
    void saveStays(formLeg, next, exists ? "Stay updated" : "Stay added");
  };

  const openForm = (leg: TripLeg, initial: Partial<TripStay>) => {
    setFormLegId(leg.id);
    setFormInitial(initial);
  };
  const newStayDraft = (leg: TripLeg): Partial<TripStay> => ({ ...firstUncoveredRange(leg) });

  const handleSearch = async () => {
    if (!suggestLeg) return;
    try {
      setResults(await hotelSearch.mutateAsync({ legId: suggestLeg.id, query: query.trim() || undefined }));
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const main = (
    <Stack spacing="14px">
      <NightsStrip legs={legs} />

      {legs.map((leg, i) => {
        const stays = getEffectiveStays(leg);
        const uncovered = getUncoveredNights(leg);
        const nights = legNights(leg).length;
        const city = leg.name || leg.baseCity;
        return (
          <Stack key={leg.id} spacing="14px" mt={i > 0 ? "6px" : 0}>
            <SectionTitle
              aside={
                uncovered.length > 0 ? (
                  <Pill tone="warn" icon={FiAlertTriangle}>
                    {uncovered.length} night{uncovered.length === 1 ? "" : "s"} uncovered
                  </Pill>
                ) : (
                  <HStack spacing={2}>
                    <Text fontSize="12px" color="tx3">
                      {nights} night{nights === 1 ? "" : "s"} · {stays.length} stay{stays.length === 1 ? "" : "s"}
                    </Text>
                    <Button size="sm" variant="ghost" leftIcon={<FiPlus />} onClick={() => openForm(leg, newStayDraft(leg))}>
                      Add stay
                    </Button>
                  </HStack>
                )
              }
            >
              {city}
            </SectionTitle>

            {stays.map((stay) => (
              <StayCard
                key={stay.id}
                stay={stay}
                onEdit={() => openForm(leg, stay)}
                onRemove={() => void saveStays(leg, stays.filter((s) => s.id !== stay.id), "Stay removed")}
              />
            ))}

            {uncovered.length > 0 &&
              (laterLegs.has(leg.id) ? (
                <Flex align="center" gap={2} fontSize="12px" color="warn">
                  <Text>
                    {nightList(uncovered)} still {uncovered.length === 1 ? "has" : "have"} no stay.
                  </Text>
                  <Button size="xs" variant="ghost" color="ac" onClick={() => openForm(leg, newStayDraft(leg))}>
                    Add a stay
                  </Button>
                </Flex>
              ) : (
                <Stack spacing={2} px={4} py="14px" borderWidth="1.5px" borderStyle="dashed" borderColor="warn" bg="warnSoft" color="warn" borderRadius="xl">
                  <Text fontWeight={600}>
                    {nightList(uncovered)} {uncovered.length === 1 ? "has" : "have"} no stay.
                  </Text>
                  <Text fontSize="12px">Plan days in {city} will start and end at a placeholder until you add one.</Text>
                  <HStack spacing={2} flexWrap="wrap">
                    <Button size={isWide ? "md" : "lg"} leftIcon={<FiPlus />} onClick={() => openForm(leg, newStayDraft(leg))}>
                      Add a stay
                    </Button>
                    <Button variant="ghost" onClick={() => setLaterLegs((prev) => new Set(prev).add(leg.id))}>
                      I&rsquo;ll book later
                    </Button>
                  </HStack>
                </Stack>
              ))}
          </Stack>
        );
      })}

      {suggestLeg && (
        <Stack spacing={2} mt={1}>
          <Flex align="center" justify="space-between" gap={2} flexWrap="wrap">
            <Flex align="center" gap="6px" fontWeight={600} fontSize="15px">
              <Icon as={FiMapPin} /> Suggested near your places
            </Flex>
            {legs.length > 1 ? (
              <CityChips cities={legs.map((l) => ({ id: l.id, name: l.name || l.baseCity, warn: getUncoveredNights(l).length > 0 }))} value={suggestLeg.id} onChange={setSuggestLegId} label="Find hotels in" />
            ) : (
              <Text fontSize="12px" color="tx3">
                Scored by distance to what you picked
              </Text>
            )}
          </Flex>
          <HStack
            as="form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSearch();
            }}
            spacing={2}
          >
            <InputGroup>
              <InputLeftElement pointerEvents="none" color="tx3">
                <FiSearch />
              </InputLeftElement>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Boutique, budget, near old city… (optional)"
                aria-label={`Hotel search in ${suggestLeg.name || suggestLeg.baseCity}`}
              />
            </InputGroup>
            <Button type="submit" isLoading={hotelSearch.isPending} loadingText="Searching" flexShrink={0} h="40px">
              Find hotels
            </Button>
          </HStack>
          {suggestLeg.selectedPlaceIds.length === 0 && !results && (
            <Text fontSize="12px" color="tx3">
              Pick some places first — hotels are scored by how close they are to them.
            </Text>
          )}
          {results && (
            <>
              <Text fontSize="12px" color="tx3">
                {results.hotels.length} hotels · scored against {results.basis.label} · prices for {formatShortDate(results.checkInDate)} → {formatShortDate(results.checkOutDate)}
              </Text>
              {results.hotels.length === 0 ? (
                <Text fontSize="13px" color="tx3">
                  No hotels found — try a different search.
                </Text>
              ) : (
                results.hotels.map((hotel, i) => (
                  <HotelRow
                    key={hotel.googlePlaceId}
                    hotel={hotel}
                    index={i}
                    onAdd={() =>
                      openForm(suggestLeg, {
                        ...newStayDraft(suggestLeg),
                        name: hotel.name,
                        address: hotel.address,
                        coordinates: hotel.coordinates,
                        googlePlaceId: hotel.googlePlaceId,
                        rating: hotel.rating,
                        bookingUrl: hotel.bookingUrl,
                      })
                    }
                  />
                ))
              )}
            </>
          )}
        </Stack>
      )}

      <RentalsBlock trip={trip} legs={legs} />
    </Stack>
  );

  const map = (
    <TabMap
      label="Map of stays and your places"
      pins={pins}
      fitKey={`${legs.map((l) => l.id).join()}:${pins.length}`}
      h="max(560px, calc(100vh - 140px))"
      legend={
        <>
          <HStack spacing="6px">
            <LegendPin stay />
            <Text>Stay</Text>
          </HStack>
          <HStack spacing="6px">
            <LegendPin color="day.1" dim />
            <Text>Your places</Text>
          </HStack>
          {results && results.hotels.length > 0 && (
            <HStack spacing="6px">
              <LegendPin />
              <Text>Suggested hotels</Text>
            </HStack>
          )}
        </>
      }
    />
  );

  return (
    <>
      <TabSplit main={main} aside={isWide ? map : undefined} mainWidth={700} />
      <StayFormModal
        leg={formLeg}
        initial={formInitial}
        isSaving={updateStays.isPending}
        onClose={() => setFormInitial(null)}
        onSave={handleSaveStay}
      />
    </>
  );
}
