import {
  Box,
  Button,
  Checkbox,
  Collapse,
  Flex,
  FormControl,
  Grid,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Tag,
  TagCloseButton,
  Text,
  Textarea,
  Wrap,
  WrapItem,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { addDays, format, parseISO } from "date-fns";
import { useState } from "react";
import type { IconType } from "react-icons";
import {
  FiChevronDown,
  FiMinus,
  FiNavigation,
  FiPlus,
  FiSettings,
  FiTrash2,
  FiTruck,
  FiUsers,
} from "react-icons/fi";
import {
  MdDirectionsBike,
  MdDirectionsCar,
  MdDirectionsWalk,
  MdLocalTaxi,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { INTEREST_CATEGORIES } from "@/constants/interests";
import { getApiErrorMessage } from "@/lib/api";
import { PlaceSearchInput } from "@/modules/places/components/PlaceSearchInput";
import { useCreateTrip } from "@/modules/trips/hooks/useTrips";
import { createTripSchema } from "@/modules/trips/validators/trip.validator";
import {
  createEmptyLeg,
  newTripLegId,
} from "@/modules/trips/utils/trip-leg.utils";
import { COMMON_CURRENCIES } from "@/modules/trips/utils/money";
import { parseCommaSeparated } from "@/utils/trip.utils";
import type {
  TripLeg,
  TripLegTransfer,
} from "@/modules/trips/types/trip-leg.types";
import type { TransportationMode, TravelStyle, TripStatus } from "@/types";
import { CityInput, type CityValue } from "./CityInput";
import { RoutePreviewMap, type RoutePoint } from "./RoutePreviewMap";

interface CityRow extends CityValue {
  id: string;
  days: number;
  arrivalTime?: string;
  departureTime?: string;
  dayTripAreas: string[];
  hotel?: {
    name: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
  };
}

type BudgetLevel = "budget" | "moderate" | "luxury";

const MAX_DAYS_PER_CITY = 30;

const PACES: { value: TravelStyle; label: string; hint: string }[] = [
  { value: "Relaxed", label: "Relaxed", hint: "Fewer stops, long breaks" },
  { value: "Balanced", label: "Balanced", hint: "A full but comfortable day" },
  { value: "Fast Paced", label: "Packed", hint: "See as much as possible" },
];

const TRANSPORT: {
  value: TransportationMode;
  label: string;
  icon: IconType;
}[] = [
  { value: "Walking", label: "Walking", icon: MdDirectionsWalk },
  { value: "Public Transport", label: "Public transport", icon: FiTruck },
  { value: "Cab", label: "Taxi / cab", icon: MdLocalTaxi },
  { value: "Self Drive", label: "Own car", icon: MdDirectionsCar },
  { value: "Bike", label: "Scooter / bike", icon: MdDirectionsBike },
];

const BUDGETS: { value: BudgetLevel; label: string }[] = [
  { value: "budget", label: "Budget" },
  { value: "moderate", label: "Mid-range" },
  { value: "luxury", label: "Luxury" },
];

function isoAddDays(date: string, days: number): string {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}

function newCity(country = ""): CityRow {
  return { id: newTripLegId(), city: "", country, days: 3, dayTripAreas: [] };
}

/** Consecutive cities: each gets its days; moving on happens on the first day of the next city. */
function buildRoute(
  cities: CityRow[],
  startDate: string,
): { legs: TripLeg[]; transfers: TripLegTransfer[] } {
  const legs: TripLeg[] = [];
  const transfers: TripLegTransfer[] = [];
  let cursor = startDate;
  cities.forEach((c, order) => {
    const leg: TripLeg = {
      ...createEmptyLeg(order, c.country.trim()),
      id: c.id,
      name: c.city.trim(),
      baseCity: c.city.trim(),
      state: c.state,
      startDate: cursor,
      endDate: isoAddDays(cursor, c.days - 1),
      arrivalTime: c.arrivalTime || undefined,
      departureTime: c.departureTime || undefined,
      dayTripAreas: c.dayTripAreas,
      hotelName: c.hotel?.name,
      hotelAddress: c.hotel?.address,
      hotelCoordinates: c.hotel?.coordinates,
    };
    const prev = legs[legs.length - 1];
    if (prev) {
      transfers.push({
        id: newTripLegId(),
        date: leg.startDate,
        fromLegId: prev.id,
        toLegId: leg.id,
        label: `Travel from ${prev.baseCity} to ${leg.baseCity}`,
      });
    }
    legs.push(leg);
    cursor = isoAddDays(leg.endDate, 1);
  });
  return { legs, transfers };
}

function autoTitle(cities: CityRow[]): string {
  const names = cities.map((c) => c.city.trim()).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length <= 3) return `${names.join(" & ")} trip`;
  return `${names[0]} → ${names[names.length - 1]} trip`;
}

function ChoiceChip({
  selected,
  onClick,
  children,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: IconType;
}) {
  return (
    <Button
      size="sm"
      borderRadius="full"
      variant={selected ? "solid" : "outline"}
      colorScheme={selected ? "brand" : "gray"}
      leftIcon={icon ? <Icon as={icon} /> : undefined}
      onClick={onClick}
      aria-pressed={selected}
      fontWeight={selected ? "semibold" : "normal"}
    >
      {children}
    </Button>
  );
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const muted = "fg.muted";
  return (
    <Box>
      <HStack spacing={3} mb={hint ? 1 : 4} align="center">
        <Flex
          w={7}
          h={7}
          borderRadius="full"
          bg="brand.500"
          color="white"
          align="center"
          justify="center"
          fontSize="sm"
          fontWeight="bold"
          flexShrink={0}
        >
          {step}
        </Flex>
        <Heading size="sm">{title}</Heading>
      </HStack>
      {hint && (
        <Text fontSize="sm" color={muted} mb={4} ml={10}>
          {hint}
        </Text>
      )}
      <Box ml={{ base: 0, md: 10 }}>{children}</Box>
    </Box>
  );
}

function DaysStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <HStack spacing={0} borderWidth="1px" borderRadius="md" flexShrink={0}>
      <IconButton
        aria-label="Fewer days"
        icon={<FiMinus />}
        size="sm"
        variant="ghost"
        onClick={() => onChange(Math.max(1, value - 1))}
        isDisabled={value <= 1}
      />
      <Text
        fontSize="sm"
        fontWeight="semibold"
        minW="4.5rem"
        textAlign="center"
      >
        {value} {value === 1 ? "day" : "days"}
      </Text>
      <IconButton
        aria-label="More days"
        icon={<FiPlus />}
        size="sm"
        variant="ghost"
        onClick={() => onChange(Math.min(MAX_DAYS_PER_CITY, value + 1))}
        isDisabled={value >= MAX_DAYS_PER_CITY}
      />
    </HStack>
  );
}

function CityCard({
  row,
  index,
  dates,
  canRemove,
  attempted,
  onChange,
  onRemove,
}: {
  row: CityRow;
  index: number;
  dates: { start: string; end: string } | null;
  canRemove: boolean;
  attempted: boolean;
  onChange: (patch: Partial<CityRow>) => void;
  onRemove: () => void;
}) {
  const more = useDisclosure();
  const [areaInput, setAreaInput] = useState("");
  const border = "border.line";
  const muted = "fg.muted";
  const needsCountry = row.city.trim().length >= 2 && !row.country.trim();

  const addArea = () => {
    const area = areaInput.trim();
    if (area && !row.dayTripAreas.includes(area))
      onChange({ dayTripAreas: [...row.dayTripAreas, area] });
    setAreaInput("");
  };

  return (
    <Box borderWidth="1px" borderColor={border} borderRadius="lg" p={3}>
      <Flex
        gap={3}
        align={{ base: "stretch", md: "center" }}
        direction={{ base: "column", md: "row" }}
      >
        <Box flex={1} minW={0}>
          <CityInput
            value={row}
            onChange={(v) => onChange(v)}
            autoFocus={index > 0 && !row.city}
            isInvalid={attempted && row.city.trim().length < 2}
            placeholder={index === 0 ? "Where to? — e.g. Kyoto" : "Next city"}
          />
        </Box>
        <HStack spacing={2} justify="space-between">
          <DaysStepper
            value={row.days}
            onChange={(days) => onChange({ days })}
          />
          {canRemove && (
            <IconButton
              aria-label="Remove city"
              icon={<FiTrash2 />}
              size="sm"
              variant="ghost"
              onClick={onRemove}
            />
          )}
        </HStack>
      </Flex>

      {needsCountry && (
        <HStack mt={2} spacing={2}>
          <Text fontSize="xs" color={muted} flexShrink={0}>
            Country:
          </Text>
          <Input
            size="xs"
            maxW="12rem"
            placeholder="Pick from the list or type it"
            value={row.country}
            isInvalid={attempted}
            onChange={(e) => onChange({ country: e.target.value })}
          />
        </HStack>
      )}

      <Flex
        mt={2}
        justify="space-between"
        align="center"
        gap={2}
        flexWrap="wrap"
      >
        <Text fontSize="xs" color={muted}>
          {dates
            ? `${format(parseISO(dates.start), "EEE d MMM")} – ${format(parseISO(dates.end), "EEE d MMM")}`
            : "Pick a start date"}
          {row.state || row.country
            ? ` · ${[row.state, row.country].filter(Boolean).join(", ")}`
            : ""}
          {row.hotel ? ` · staying at ${row.hotel.name}` : ""}
        </Text>
        <Button
          size="xs"
          variant="ghost"
          rightIcon={
            <FiChevronDown
              style={{ transform: more.isOpen ? "rotate(180deg)" : undefined }}
            />
          }
          onClick={more.onToggle}
        >
          Times, day trips, hotel
        </Button>
      </Flex>

      <Collapse in={more.isOpen} animateOpacity>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mt={3}>
          <FormControl>
            <FormLabel fontSize="xs" mb={1}>
              Arriving at
            </FormLabel>
            <Input
              size="sm"
              type="time"
              value={row.arrivalTime ?? ""}
              onChange={(e) =>
                onChange({ arrivalTime: e.target.value || undefined })
              }
            />
            <FormHelperText fontSize="xs">
              First day starts after you get in.
            </FormHelperText>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="xs" mb={1}>
              Leaving at
            </FormLabel>
            <Input
              size="sm"
              type="time"
              value={row.departureTime ?? ""}
              onChange={(e) =>
                onChange({ departureTime: e.target.value || undefined })
              }
            />
            <FormHelperText fontSize="xs">
              Last day ends in time to leave.
            </FormHelperText>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="xs" mb={1}>
              Day trips from here
            </FormLabel>
            <HStack>
              <Input
                size="sm"
                placeholder="e.g. Nara"
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addArea();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={addArea}
                isDisabled={!areaInput.trim()}
              >
                Add
              </Button>
            </HStack>
            {row.dayTripAreas.length > 0 && (
              <Wrap mt={2}>
                {row.dayTripAreas.map((area) => (
                  <WrapItem key={area}>
                    <Tag size="sm">
                      {area}
                      <TagCloseButton
                        onClick={() =>
                          onChange({
                            dayTripAreas: row.dayTripAreas.filter(
                              (a) => a !== area,
                            ),
                          })
                        }
                      />
                    </Tag>
                  </WrapItem>
                ))}
              </Wrap>
            )}
          </FormControl>
          <Box>
            <PlaceSearchInput
              label="Hotel (optional — or add it later under Stays)"
              placeholder="Search hotels…"
              mode="hotel"
              city={row.city}
              country={row.country}
              value={row.hotel?.name ?? ""}
              onSelect={(sel) =>
                onChange({
                  hotel: {
                    name: sel.name,
                    address: sel.address,
                    coordinates:
                      sel.lat !== undefined && sel.lng !== undefined
                        ? { lat: sel.lat, lng: sel.lng }
                        : undefined,
                  },
                })
              }
              onClear={() => onChange({ hotel: undefined })}
            />
          </Box>
        </SimpleGrid>
      </Collapse>
    </Box>
  );
}

function TripPreview({
  title,
  startDate,
  endDate,
  totalDays,
  cities,
  legs,
  pace,
  transport,
  budgetLevel,
  interests,
  isSubmitting,
  onCancel,
}: {
  title: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  cities: CityRow[];
  legs: TripLeg[];
  pace: TravelStyle;
  transport: TransportationMode;
  budgetLevel?: BudgetLevel;
  interests: string[];
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  const cardBg = "bg.surface";
  const border = "border.line";
  const muted = "fg.muted";
  const line = "border.line";
  const points: RoutePoint[] = cities
    .filter((c) => c.lat !== undefined && c.lng !== undefined)
    .map((c) => ({ label: c.city, lat: c.lat!, lng: c.lng! }));
  const named = cities.filter((c) => c.city.trim());
  const transportLabel = TRANSPORT.find((t) => t.value === transport)?.label;
  const paceLabel = PACES.find((p) => p.value === pace)?.label;
  const budgetLabel = BUDGETS.find((b) => b.value === budgetLevel)?.label;

  return (
    <Box
      position={{ xl: "sticky" }}
      top={{ xl: "88px" }}
      bg={cardBg}
      borderWidth="1px"
      borderColor={border}
      borderRadius="xl"
      overflow="hidden"
    >
      <RoutePreviewMap points={points} height="220px" />
      <Stack spacing={4} p={5}>
        <Box>
          <Text
            fontSize="xs"
            textTransform="uppercase"
            letterSpacing="wider"
            color={muted}
            fontWeight="semibold"
          >
            Your trip
          </Text>
          <Heading size="md" mt={1} noOfLines={2}>
            {title || "Where to?"}
          </Heading>
          {startDate && (
            <Text fontSize="sm" color={muted} mt={1}>
              {format(parseISO(startDate), "EEE d MMM")} →{" "}
              {format(parseISO(endDate), "EEE d MMM yyyy")} · {totalDays}{" "}
              {totalDays === 1 ? "day" : "days"}
            </Text>
          )}
        </Box>

        {named.length === 0 ? (
          <Text fontSize="sm" color={muted}>
            Add a city on the left — your route and dates show up here.
          </Text>
        ) : (
          <Stack spacing={0}>
            {cities.map((c, i) => {
              const leg = legs[i];
              return (
                <Flex key={c.id} gap={3}>
                  <Flex direction="column" align="center" flexShrink={0}>
                    <Flex
                      w={6}
                      h={6}
                      borderRadius="full"
                      bg="brand.500"
                      color="white"
                      fontSize="xs"
                      fontWeight="bold"
                      align="center"
                      justify="center"
                    >
                      {i + 1}
                    </Flex>
                    {i < cities.length - 1 && (
                      <Box w="2px" flex={1} minH={6} bg={line} my={1} />
                    )}
                  </Flex>
                  <Box pb={i < cities.length - 1 ? 3 : 0} minW={0} flex={1}>
                    <Flex justify="space-between" gap={2}>
                      <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
                        {c.city.trim() || "Next city"}
                      </Text>
                      <Text fontSize="xs" color={muted} flexShrink={0}>
                        {c.days} {c.days === 1 ? "day" : "days"}
                      </Text>
                    </Flex>
                    <Text fontSize="xs" color={muted}>
                      {leg
                        ? `${format(parseISO(leg.startDate), "d MMM")} – ${format(parseISO(leg.endDate), "d MMM")}`
                        : ""}
                      {c.country ? ` · ${c.country}` : ""}
                    </Text>
                    {i < cities.length - 1 && legs[i + 1] && (
                      <HStack spacing={1} fontSize="xs" color={muted} mt={2}>
                        <Icon as={FiNavigation} />
                        <Text>
                          Travel day{" "}
                          {format(parseISO(legs[i + 1].startDate), "EEE d MMM")}
                        </Text>
                      </HStack>
                    )}
                  </Box>
                </Flex>
              );
            })}
          </Stack>
        )}

        <Wrap spacing={2}>
          {[paceLabel && `${paceLabel} pace`, transportLabel, budgetLabel]
            .filter(Boolean)
            .map((t) => (
              <WrapItem key={t as string}>
                <Tag size="sm" variant="subtle" colorScheme="brand">
                  {t}
                </Tag>
              </WrapItem>
            ))}
          {interests.map((i) => (
            <WrapItem key={i}>
              <Tag size="sm" variant="outline">
                {i}
              </Tag>
            </WrapItem>
          ))}
        </Wrap>

        <Stack spacing={2}>
          <Button
            type="submit"
            colorScheme="brand"
            size="lg"
            isLoading={isSubmitting}
            loadingText="Creating…"
          >
            Create trip
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Text fontSize="xs" color={muted} textAlign="center">
            Next you&apos;ll pick places, then generate the day-by-day plan.
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}

export function SimpleTripForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const createTrip = useCreateTrip();
  const cardBg = "bg.surface";
  const border = "border.line";
  const muted = "fg.muted";
  const more = useDisclosure();

  const [startDate, setStartDate] = useState(() =>
    isoAddDays(format(new Date(), "yyyy-MM-dd"), 14),
  );
  const [cities, setCities] = useState<CityRow[]>([newCity()]);
  const [pace, setPace] = useState<TravelStyle>("Balanced");
  const [transport, setTransport] = useState<TransportationMode>("Cab");
  const [budgetLevel, setBudgetLevel] = useState<BudgetLevel | undefined>();
  const [interests, setInterests] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [dailyStart, setDailyStart] = useState("09:00");
  const [dailyEnd, setDailyEnd] = useState("20:00");
  const [flexible, setFlexible] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [mustVisit, setMustVisit] = useState<string[]>([]);
  const [excluded, setExcluded] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<TripStatus>("draft");
  const [attempted, setAttempted] = useState(false);

  const route = startDate ? buildRoute(cities, startDate) : null;
  const totalDays = cities.reduce((sum, c) => sum + c.days, 0);
  const endDate = startDate ? isoAddDays(startDate, totalDays - 1) : "";
  const named = cities.filter((c) => c.city.trim());

  const updateCity = (id: string, patch: Partial<CityRow>) =>
    setCities((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  const toggleInterest = (i: string) =>
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );

  const submit = async () => {
    setAttempted(true);
    if (!startDate)
      return toast({ title: "Pick a start date", status: "warning" });
    const blank = cities.find((c) => c.city.trim().length < 2);
    if (blank)
      return toast({
        title:
          cities.length > 1
            ? "Every city needs a name (or remove the empty one)"
            : "Where are you going?",
        status: "warning",
      });
    const noCountry = cities.find((c) => !c.country.trim());
    if (noCountry)
      return toast({
        title: `Which country is ${noCountry.city}? Pick it from the list or type the country.`,
        status: "warning",
      });

    const { legs, transfers } = buildRoute(cities, startDate);
    const payload = {
      title: title.trim() || autoTitle(cities),
      destinationCity:
        cities.length === 1
          ? legs[0].baseCity
          : `${legs[0].baseCity} → ${legs[legs.length - 1].baseCity}`,
      destinationState: legs[0].state,
      destinationCountry: legs[0].country,
      startDate,
      endDate,
      legs,
      transfers,
      dailyStartTime: dailyStart,
      dailyEndTime: dailyEnd,
      useFlexibleSchedule: flexible,
      transportationMode: transport,
      travelStyle: pace,
      budgetLevel,
      currency: currency || undefined,
      budgetAmount,
      interests,
      mustVisitPlaces: mustVisit,
      excludedPlaces: parseCommaSeparated(excluded),
      notes: notes.trim() || undefined,
      status,
    };
    const validated = createTripSchema.safeParse(payload);
    if (!validated.success)
      return toast({
        title: validated.error.issues[0]?.message ?? "Please check the form",
        status: "error",
      });

    try {
      const result = await createTrip.mutateAsync(validated.data);
      toast({
        title: "Trip created",
        description: "Next: pick the places you want to see.",
        status: "success",
        duration: 4000,
      });
      navigate(`/trips/${result.trip.id}?tab=places`);
    } catch (err) {
      toast({
        title: getApiErrorMessage(err),
        status: "error",
        duration: 5000,
      });
    }
  };

  const card = {
    bg: cardBg,
    borderWidth: "1px",
    borderColor: border,
    borderRadius: "xl",
    p: { base: 4, md: 6 },
  } as const;

  return (
    <Grid
      as="form"
      onSubmit={(e: React.FormEvent) => {
        e.preventDefault();
        void submit();
      }}
      templateColumns={{
        base: "1fr",
        xl: "minmax(0, 1fr) 400px",
        "2xl": "minmax(0, 1fr) 460px",
      }}
      gap={6}
      alignItems="start"
    >
      <Stack spacing={6} minW={0}>
        <Box {...card}>
          <Section
            step={1}
            title="Where & when"
            hint="Add each city you'll stay in, in order. Travel days between them are added for you."
          >
            <Stack spacing={3}>
              <FormControl maxW="16rem" isInvalid={attempted && !startDate}>
                <FormLabel fontSize="sm" mb={1}>
                  Starting
                </FormLabel>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </FormControl>

              {cities.map((row, i) => {
                const leg = route?.legs[i];
                return (
                  <Box key={row.id}>
                    {i > 0 && (
                      <HStack
                        spacing={2}
                        color={muted}
                        fontSize="xs"
                        pl={3}
                        pb={2}
                      >
                        <Icon as={FiNavigation} />
                        <Text>
                          Travel to {row.city.trim() || "the next city"}
                          {leg
                            ? ` on ${format(parseISO(leg.startDate), "EEE d MMM")}`
                            : ""}
                        </Text>
                      </HStack>
                    )}
                    <CityCard
                      row={row}
                      index={i}
                      dates={
                        leg ? { start: leg.startDate, end: leg.endDate } : null
                      }
                      canRemove={cities.length > 1}
                      attempted={attempted}
                      onChange={(patch) => updateCity(row.id, patch)}
                      onRemove={() =>
                        setCities((rows) => rows.filter((r) => r.id !== row.id))
                      }
                    />
                  </Box>
                );
              })}

              <Button
                leftIcon={<FiPlus />}
                size="sm"
                variant="ghost"
                alignSelf="flex-start"
                onClick={() =>
                  setCities((rows) => [
                    ...rows,
                    newCity(rows[rows.length - 1]?.country),
                  ])
                }
              >
                Add another city
              </Button>
            </Stack>
          </Section>
        </Box>

        <Box {...card}>
          <Section
            step={2}
            title="How you like to travel"
            hint="This shapes how full each day is and how travel times are worked out."
          >
            <Stack spacing={5}>
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={5}>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    Pace
                  </Text>
                  <Wrap spacing={2}>
                    {PACES.map((p) => (
                      <WrapItem key={p.value}>
                        <ChoiceChip
                          selected={pace === p.value}
                          onClick={() => setPace(p.value)}
                        >
                          {p.label}
                        </ChoiceChip>
                      </WrapItem>
                    ))}
                  </Wrap>
                  <Text fontSize="xs" color={muted} mt={1}>
                    {PACES.find((p) => p.value === pace)?.hint}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    Budget
                  </Text>
                  <Wrap spacing={2}>
                    {BUDGETS.map((b) => (
                      <WrapItem key={b.value}>
                        <ChoiceChip
                          selected={budgetLevel === b.value}
                          onClick={() =>
                            setBudgetLevel(
                              budgetLevel === b.value ? undefined : b.value,
                            )
                          }
                        >
                          {b.label}
                        </ChoiceChip>
                      </WrapItem>
                    ))}
                  </Wrap>
                </Box>
              </SimpleGrid>
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Getting around in each city
                </Text>
                <Wrap spacing={2}>
                  {TRANSPORT.map((t) => (
                    <WrapItem key={t.value}>
                      <ChoiceChip
                        selected={transport === t.value}
                        onClick={() => setTransport(t.value)}
                        icon={t.icon}
                      >
                        {t.label}
                      </ChoiceChip>
                    </WrapItem>
                  ))}
                </Wrap>
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  What do you enjoy?{" "}
                  <Text
                    as="span"
                    fontWeight="normal"
                    color={muted}
                    fontSize="xs"
                  >
                    (pick any — used to suggest places)
                  </Text>
                </Text>
                <Wrap spacing={2}>
                  {INTEREST_CATEGORIES.map((i) => (
                    <WrapItem key={i}>
                      <ChoiceChip
                        selected={interests.includes(i)}
                        onClick={() => toggleInterest(i)}
                      >
                        {i}
                      </ChoiceChip>
                    </WrapItem>
                  ))}
                </Wrap>
              </Box>
            </Stack>
          </Section>
        </Box>

        <Box {...card}>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FiSettings />}
            rightIcon={
              <FiChevronDown
                style={{
                  transform: more.isOpen ? "rotate(180deg)" : undefined,
                }}
              />
            }
            onClick={more.onToggle}
          >
            More options
          </Button>
          <Text fontSize="xs" color={muted} ml={3}>
            Trip name, daily hours, budget amount, must-see places, notes — all
            can be changed later too.
          </Text>
          <Collapse in={more.isOpen} animateOpacity>
            <SimpleGrid
              columns={{ base: 1, md: 2 }}
              spacing={4}
              mt={4}
              ml={{ base: 0, md: 10 }}
            >
              <FormControl>
                <FormLabel fontSize="sm">Trip name</FormLabel>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={autoTitle(cities) || "e.g. Japan in spring"}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Status</FormLabel>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TripStatus)}
                >
                  <option value="draft">Planning (draft)</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Day starts / ends</FormLabel>
                <HStack>
                  <Input
                    type="time"
                    value={dailyStart}
                    onChange={(e) => setDailyStart(e.target.value)}
                    aria-label="Day starts"
                  />
                  <Text color={muted}>–</Text>
                  <Input
                    type="time"
                    value={dailyEnd}
                    onChange={(e) => setDailyEnd(e.target.value)}
                    aria-label="Day ends"
                  />
                </HStack>
                <Checkbox
                  mt={2}
                  size="sm"
                  isChecked={flexible}
                  onChange={(e) => setFlexible(e.target.checked)}
                >
                  Schedule by each place&apos;s best time instead
                </Checkbox>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Total budget</FormLabel>
                <HStack>
                  <Input
                    type="number"
                    min={0}
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    placeholder="Optional"
                  />
                  <Select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    maxW="9rem"
                    aria-label="Currency"
                  >
                    <option value="">Local currency</option>
                    {COMMON_CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </HStack>
              </FormControl>
              <Box>
                <PlaceSearchInput
                  label="Must-see places"
                  placeholder="Search attractions…"
                  mode="place"
                  city={named[0]?.city}
                  country={named[0]?.country}
                  onSelect={(sel) =>
                    !mustVisit.includes(sel.name) &&
                    setMustVisit((prev) => [...prev, sel.name])
                  }
                />
                {mustVisit.length > 0 && (
                  <Wrap mt={2}>
                    {mustVisit.map((p) => (
                      <WrapItem key={p}>
                        <Tag size="sm" colorScheme="brand">
                          {p}
                          <TagCloseButton
                            onClick={() =>
                              setMustVisit((prev) =>
                                prev.filter((x) => x !== p),
                              )
                            }
                          />
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                )}
              </Box>
              <FormControl>
                <FormLabel fontSize="sm">Places to skip</FormLabel>
                <Input
                  value={excluded}
                  onChange={(e) => setExcluded(e.target.value)}
                  placeholder="Comma-separated"
                />
              </FormControl>
              <FormControl gridColumn={{ md: "span 2" }}>
                <FormLabel fontSize="sm">
                  <Icon as={FiUsers} mr={1} />
                  Notes
                </FormLabel>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Who's coming, needs like step-free access, anything the plan should know"
                />
              </FormControl>
            </SimpleGrid>
          </Collapse>
        </Box>
      </Stack>

      <TripPreview
        title={title.trim() || autoTitle(cities)}
        startDate={startDate}
        endDate={endDate}
        totalDays={totalDays}
        cities={cities}
        legs={route?.legs ?? []}
        pace={pace}
        transport={transport}
        budgetLevel={budgetLevel}
        interests={interests}
        isSubmitting={createTrip.isPending}
        onCancel={() => navigate(-1)}
      />
    </Grid>
  );
}
