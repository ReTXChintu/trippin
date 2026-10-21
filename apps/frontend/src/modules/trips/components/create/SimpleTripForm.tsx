import {
  Box,
  Button,
  Checkbox,
  Collapse,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Link,
  Select,
  SimpleGrid,
  Stack,
  Tag,
  TagCloseButton,
  Text,
  Textarea,
  Wrap,
  WrapItem,
  useBreakpointValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { addDays, format, parseISO } from "date-fns";
import { useRef, useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { FiArrowRight, FiCalendar, FiCheck, FiChevronDown, FiChevronUp, FiClock, FiMinus, FiPlus, FiSearch, FiSliders, FiX } from "react-icons/fi";
import {
  LuBike,
  LuBuilding2,
  LuBusFront,
  LuCamera,
  LuCar,
  LuCarTaxiFront,
  LuCastle,
  LuChurch,
  LuCoffee,
  LuFootprints,
  LuGripVertical,
  LuImage,
  LuLandmark,
  LuMoon,
  LuMountain,
  LuPalette,
  LuPawPrint,
  LuShoppingBag,
  LuSun,
  LuTrees,
  LuUtensils,
  LuWallet,
  LuWaves,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { INTEREST_CATEGORIES } from "@/constants/interests";
import { getApiErrorMessage } from "@/lib/api";
import { ChoiceChip, Overline, Pill, Segmented, SurfaceCard } from "@/components/ui";
import { IconInput, StepNumber } from "@/components/ui/app";
import { PlaceSearchInput } from "@/modules/places/components/PlaceSearchInput";
import { useCreateTrip } from "@/modules/trips/hooks/useTrips";
import { createTripSchema } from "@/modules/trips/validators/trip.validator";
import { createEmptyLeg, newTripLegId } from "@/modules/trips/utils/trip-leg.utils";
import { COMMON_CURRENCIES } from "@/modules/trips/utils/money";
import { parseCommaSeparated } from "@/utils/trip.utils";
import { haversineKm } from "@/utils/geo";
import type { TripLeg, TripLegTransfer } from "@/modules/trips/types/trip-leg.types";
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
  { value: "Relaxed", label: "Relaxed", hint: "fewer stops, long breaks." },
  { value: "Balanced", label: "Balanced", hint: "a full but comfortable day." },
  { value: "Fast Paced", label: "Packed", hint: "see as much as possible." },
];

const TRANSPORT: { value: TransportationMode; label: string; short: string; icon: IconType }[] = [
  { value: "Walking", label: "Walking", short: "Walking", icon: LuFootprints },
  { value: "Public Transport", label: "Public transport", short: "Public", icon: LuBusFront },
  { value: "Cab", label: "Taxi / cab", short: "Taxi", icon: LuCarTaxiFront },
  { value: "Self Drive", label: "Own car", short: "Own car", icon: LuCar },
  { value: "Bike", label: "Scooter / bike", short: "Scooter", icon: LuBike },
];

const BUDGETS: { value: BudgetLevel; label: string }[] = [
  { value: "budget", label: "Budget" },
  { value: "moderate", label: "Mid-range" },
  { value: "luxury", label: "Luxury" },
];

const INTEREST_ICONS: Record<string, IconType> = {
  History: LuLandmark,
  Culture: LuPalette,
  Temples: LuChurch,
  Food: LuUtensils,
  Nature: LuTrees,
  Adventure: LuMountain,
  Photography: LuCamera,
  Shopping: LuShoppingBag,
  Nightlife: LuMoon,
  Architecture: LuBuilding2,
  Spiritual: LuSun,
  Museums: LuImage,
  Wildlife: LuPawPrint,
  Forts: LuCastle,
  Lakes: LuWaves,
  Cafes: LuCoffee,
};

function isoAddDays(date: string, days: number): string {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}

function fmt(date: string, pattern: string): string {
  try {
    return format(parseISO(date), pattern);
  } catch {
    return date;
  }
}

/** "5–7 Oct" or "30 Sep – 2 Oct". */
function shortRange(start: string, end: string): string {
  if (start === end) return fmt(start, "d MMM");
  return start.slice(0, 7) === end.slice(0, 7) ? `${fmt(start, "d")}–${fmt(end, "d MMM")}` : `${fmt(start, "d MMM")} – ${fmt(end, "d MMM")}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Consecutive cities: each gets its days; moving on happens on the first day of the next city. */
function buildRoute(cities: CityRow[], startDate: string): { legs: TripLeg[]; transfers: TripLegTransfer[] } {
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

/** "about 390 km" between two picked cities, when both have coordinates. */
function distanceLabel(a: CityRow, b: CityRow): string | null {
  if (a.lat === undefined || a.lng === undefined || b.lat === undefined || b.lng === undefined) return null;
  const km = haversineKm({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
  if (km < 1) return null;
  return `about ${km < 100 ? Math.round(km) : Math.round(km / 10) * 10} km`;
}

// ---------------------------------------------------------------------------------------------
// Pieces

function Section({ step, title, hint, id, children }: { step: number; title: string; hint?: string; id: string; children: ReactNode }) {
  return (
    <SurfaceCard as="section" aria-labelledby={id} p={{ base: "14px", md: "20px" }}>
      <HStack spacing="10px" align={hint ? "flex-start" : "center"} mb="12px">
        <Box display={{ base: "none", md: "block" }} mt={hint ? "2px" : 0}>
          <StepNumber n={step} />
        </Box>
        <Box>
          <Heading as="h2" id={id} fontSize={{ base: "15px", md: "17px" }} lineHeight={{ base: "20px", md: "24px" }}>
            {title}
          </Heading>
          {hint && (
            <Text fontSize="12px" color="tx3" display={{ base: "none", md: "block" }}>
              {hint}
            </Text>
          )}
        </Box>
      </HStack>
      <Stack spacing="12px">{children}</Stack>
    </SurfaceCard>
  );
}

function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <FormLabel htmlFor={htmlFor} m={0} mb="6px" fontSize="12px" fontWeight={600} color="tx3">
      {children}
    </FormLabel>
  );
}

function DaysStepper({ value, onChange, city }: { value: number; onChange: (n: number) => void; city: string }) {
  const name = city || "this city";
  return (
    <HStack spacing={0} borderWidth="1px" borderColor="ln" borderRadius="md" bg="sf" h={{ base: "44px", md: "36px" }} flexShrink={0}>
      <IconButton
        aria-label={`Fewer days in ${name}`}
        icon={<FiMinus />}
        variant="ghost"
        colorScheme="gray"
        size={{ base: "lg", md: "md" }}
        h="full"
        onClick={() => onChange(Math.max(1, value - 1))}
        isDisabled={value <= 1}
      />
      <Text fontWeight={600} minW={{ base: "20px", md: "56px" }} textAlign="center" aria-live="polite">
        {value}
        <Text as="span" display={{ base: "none", md: "inline" }}>
          {" "}
          {value === 1 ? "day" : "days"}
        </Text>
      </Text>
      <IconButton
        aria-label={`More days in ${name}`}
        icon={<FiPlus />}
        variant="ghost"
        colorScheme="gray"
        size={{ base: "lg", md: "md" }}
        h="full"
        onClick={() => onChange(Math.min(MAX_DAYS_PER_CITY, value + 1))}
        isDisabled={value >= MAX_DAYS_PER_CITY}
      />
    </HStack>
  );
}

/** Big selectable tile (getting around, budget). */
function OptionTile({ selected, icon, label, onClick }: { selected: boolean; icon: IconType; label: string; onClick: () => void }) {
  return (
    <Flex
      as="button"
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      direction="column"
      align="flex-start"
      gap="4px"
      p={selected ? "11px" : "12px"}
      borderRadius="lg"
      borderWidth={selected ? "2px" : "1px"}
      borderColor={selected ? "ac" : "ln"}
      bg={selected ? "acSoft" : "sf"}
      textAlign="left"
      minW={0}
      _hover={selected ? undefined : { bg: "sunk" }}
      _focusVisible={{ outline: "2px solid", outlineColor: "ac", outlineOffset: "2px" }}
    >
      <Icon as={icon} boxSize="18px" color="ac" />
      <Text fontWeight={600} lineHeight={1.4}>
        {label}
      </Text>
    </Flex>
  );
}

function CityCard({
  row,
  index,
  dates,
  attempted,
  isOpen,
  onToggle,
  onChange,
  onRemove,
  onMove,
  dragHandlers,
}: {
  row: CityRow;
  index: number;
  dates: { start: string; end: string } | null;
  attempted: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<CityRow>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  dragHandlers: { onDragStart: () => void; onDragEnter: () => void; onDragEnd: () => void; isDragging: boolean };
}) {
  const [areaInput, setAreaInput] = useState("");
  const [addingArea, setAddingArea] = useState(false);
  const needsCountry = row.city.trim().length >= 2 && !row.country.trim();
  const name = row.city.trim() || "this city";
  const place = [row.state, row.country].filter(Boolean).join(", ");

  const addArea = () => {
    const area = areaInput.trim();
    if (area && !row.dayTripAreas.includes(area)) onChange({ dayTripAreas: [...row.dayTripAreas, area] });
    setAreaInput("");
    setAddingArea(false);
  };

  return (
    <Box
      bg={{ base: "bg", md: "sf" }}
      borderWidth="1px"
      borderColor="ln"
      borderRadius="xl"
      opacity={dragHandlers.isDragging ? 0.5 : 1}
      onDragEnter={dragHandlers.onDragEnter}
      onDragOver={(e) => e.preventDefault()}
    >
      <Flex align="center" gap={{ base: "10px", md: "12px" }} px={{ base: "12px", md: "14px" }} py={{ base: "10px", md: "12px" }}>
        <IconButton
          aria-label={`Reorder ${name} — drag, or use the arrow keys`}
          title="Drag to reorder"
          icon={<LuGripVertical />}
          variant="ghost"
          size="xs"
          color="tx3"
          cursor="grab"
          display={{ base: "none", md: "inline-flex" }}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            dragHandlers.onDragStart();
          }}
          onDragEnd={dragHandlers.onDragEnd}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              onMove(-1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              onMove(1);
            }
          }}
        />
        <StepNumber n={index + 1} solid size={28} />
        <Box flex={1} minW={0}>
          <Text fontWeight={600} fontSize={{ base: "14px", md: "15px" }} noOfLines={1}>
            {row.city}
          </Text>
          <Text fontSize="12px" color="tx3" noOfLines={2}>
            {place || "Country needed"}
            {dates && (
              <Text as="span" display={{ base: "inline", md: "none" }}>
                {" "}
                · {shortRange(dates.start, dates.end)}
              </Text>
            )}
          </Text>
        </Box>
        {dates && (
          <Text fontSize="12px" color="tx3" flexShrink={0} display={{ base: "none", md: "block" }}>
            {shortRange(dates.start, dates.end)}
          </Text>
        )}
        <DaysStepper value={row.days} onChange={(days) => onChange({ days })} city={row.city} />
        <IconButton
          aria-label={`${isOpen ? "Hide" : "Show"} times, day trips and hotel for ${name}`}
          aria-expanded={isOpen}
          title="Times, day trips, hotel"
          icon={isOpen ? <FiChevronUp /> : <FiChevronDown />}
          variant="ghost"
          display={{ base: "none", md: "inline-flex" }}
          onClick={onToggle}
        />
        <IconButton aria-label={`Remove ${name}`} title={`Remove ${name}`} icon={<FiX />} variant="ghost" colorScheme="gray" display={{ base: "none", md: "inline-flex" }} onClick={onRemove} />
      </Flex>

      {needsCountry && (
        <HStack px="14px" pb="12px" spacing="8px">
          <Text fontSize="12px" color="warn" fontWeight={600} flexShrink={0}>
            Which country?
          </Text>
          <Input
            size="sm"
            maxW="14rem"
            placeholder="Type the country"
            aria-label={`Country for ${name}`}
            value={row.country}
            isInvalid={attempted}
            onChange={(e) => onChange({ country: e.target.value })}
          />
        </HStack>
      )}

      {/* Phone: the details open from a link instead of the chevron. */}
      <HStack display={{ base: "flex", md: "none" }} px="12px" pb="10px" spacing="12px" fontSize="12px">
        <Link as="button" type="button" color="ac" fontWeight={600} onClick={onToggle} aria-expanded={isOpen}>
          {isOpen ? "Hide details" : "Times, day trips, hotel"}
        </Link>
        <Link as="button" type="button" color="crit" fontWeight={600} onClick={onRemove}>
          Remove
        </Link>
      </HStack>

      <Collapse in={isOpen} animateOpacity>
        <Stack spacing="12px" p="14px" borderTopWidth="1px" borderColor="ln" bg="bg" borderBottomRadius="xl">
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing="12px">
            <FormControl>
              <Label>Arrival time</Label>
              <IconInput icon={FiClock} type="time" value={row.arrivalTime ?? ""} onChange={(e) => onChange({ arrivalTime: e.target.value || undefined })} aria-label={`Arrival time in ${name}`} />
              <Text fontSize="12px" color="tx3" mt="4px">
                First day starts after you get in.
              </Text>
            </FormControl>
            <FormControl>
              <Label>Departure time</Label>
              <IconInput icon={FiClock} type="time" value={row.departureTime ?? ""} onChange={(e) => onChange({ departureTime: e.target.value || undefined })} aria-label={`Departure time from ${name}`} />
              <Text fontSize="12px" color="tx3" mt="4px">
                Last day ends in time to leave.
              </Text>
            </FormControl>
          </SimpleGrid>
          <Box>
            <Label>Day-trip areas (e.g. Nara from Kyoto)</Label>
            <Wrap spacing="6px">
              {row.dayTripAreas.map((area) => (
                <WrapItem key={area}>
                  <ChoiceChip
                    selected
                    icon={FiCheck}
                    aria-label={`Remove day-trip area ${area}`}
                    onClick={() => onChange({ dayTripAreas: row.dayTripAreas.filter((a) => a !== area) })}
                  >
                    {area}
                  </ChoiceChip>
                </WrapItem>
              ))}
              <WrapItem>
                {addingArea ? (
                  <HStack spacing="6px">
                    <Input
                      size="sm"
                      h="32px"
                      w="11rem"
                      borderRadius="full"
                      autoFocus
                      placeholder="e.g. Nara"
                      aria-label="Day-trip area"
                      value={areaInput}
                      onChange={(e) => setAreaInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addArea();
                        } else if (e.key === "Escape") {
                          setAddingArea(false);
                          setAreaInput("");
                        }
                      }}
                      onBlur={() => (areaInput.trim() ? addArea() : setAddingArea(false))}
                    />
                  </HStack>
                ) : (
                  <ChoiceChip onClick={() => setAddingArea(true)}>+ Add area</ChoiceChip>
                )}
              </WrapItem>
            </Wrap>
          </Box>
          <PlaceSearchInput
            label="Hotel search"
            placeholder={`Search hotels in ${row.city || "this city"}`}
            mode="hotel"
            city={row.city}
            country={row.country}
            value={row.hotel?.name ?? ""}
            onSelect={(sel) =>
              onChange({
                hotel: {
                  name: sel.name,
                  address: sel.address,
                  coordinates: sel.lat !== undefined && sel.lng !== undefined ? { lat: sel.lat, lng: sel.lng } : undefined,
                },
              })
            }
            onClear={() => onChange({ hotel: undefined })}
          />
          <Text fontSize="12px" color="tx3" mt="-6px">
            Optional — you can add stays later too.
          </Text>
        </Stack>
      </Collapse>
    </Box>
  );
}

interface PreviewProps {
  title: string;
  cities: CityRow[];
  legs: TripLeg[];
  totalDays: number;
  pace: TravelStyle;
  transport: TransportationMode;
  budgetLevel?: BudgetLevel;
  interests: string[];
}

function PreviewBody({ title, cities, legs, totalDays, pace, transport, budgetLevel, interests, mapHeight = "260px" }: PreviewProps & { mapHeight?: string }) {
  const points: RoutePoint[] = cities.filter((c) => c.lat !== undefined && c.lng !== undefined).map((c) => ({ label: c.city, lat: c.lat!, lng: c.lng! }));
  const transportItem = TRANSPORT.find((t) => t.value === transport);
  const paceLabel = PACES.find((p) => p.value === pace)?.label;
  const budgetLabel = BUDGETS.find((b) => b.value === budgetLevel)?.label;

  return (
    <>
      <Box px="24px" pt="20px" pb="12px">
        <Overline>Your trip</Overline>
        <Heading as="h2" fontSize="24px" mt="2px" noOfLines={2}>
          {title || "Where to?"}
        </Heading>
        <Text fontSize="12px" color="tx3">
          Name is auto-generated if left blank
        </Text>
      </Box>
      <RoutePreviewMap points={points} height={mapHeight} borderRadius={0} />
      <Stack spacing="10px" px="24px" py="20px">
        {cities.length === 0 ? (
          <Text fontSize="12px" color="tx3">
            Add a city — your route and dates show up here.
          </Text>
        ) : (
          cities.map((c, i) => {
            const leg = legs[i];
            return (
              <Box key={c.id}>
                {i > 0 && leg && (
                  <HStack spacing="8px" fontSize="12px" color="tx3" pl="6px" mb="10px">
                    <Icon as={LuCar} boxSize="14px" />
                    <Text>Travel day {fmt(leg.startDate, "d MMM")}</Text>
                  </HStack>
                )}
                <Flex justify="space-between" align="center" gap="8px">
                  <HStack spacing="8px" minW={0}>
                    <StepNumber n={i + 1} solid size={24} />
                    <Text fontWeight={600} noOfLines={1}>
                      {c.city}
                    </Text>
                  </HStack>
                  <Text fontSize="12px" color="tx3" flexShrink={0}>
                    {leg ? `${shortRange(leg.startDate, leg.endDate)} · ${plural(c.days, "day")}` : plural(c.days, "day")}
                  </Text>
                </Flex>
              </Box>
            );
          })
        )}
        <Divider my="6px" />
        <Wrap spacing="6px">
          <WrapItem>
            <Pill icon={FiCalendar}>{plural(totalDays, "day")}</Pill>
          </WrapItem>
          {paceLabel && (
            <WrapItem>
              <Pill icon={FiClock}>{paceLabel}</Pill>
            </WrapItem>
          )}
          {transportItem && (
            <WrapItem>
              <Pill icon={transportItem.icon}>{transportItem.label}</Pill>
            </WrapItem>
          )}
          {budgetLabel && (
            <WrapItem>
              <Pill icon={LuWallet}>{budgetLabel}</Pill>
            </WrapItem>
          )}
        </Wrap>
        {interests.length > 0 && (
          <Text fontSize="12px" color="tx3">
            {interests.map((i, n) => (n === 0 ? i : i.toLowerCase())).join(", ")}
          </Text>
        )}
      </Stack>
    </>
  );
}

// ---------------------------------------------------------------------------------------------

export function SimpleTripForm({ header }: { header?: ReactNode }) {
  const navigate = useNavigate();
  const toast = useToast();
  const createTrip = useCreateTrip();
  const more = useDisclosure();
  const preview = useDisclosure();

  const [startDate, setStartDate] = useState(() => isoAddDays(format(new Date(), "yyyy-MM-dd"), 14));
  const [cities, setCities] = useState<CityRow[]>([]);
  const [openCityId, setOpenCityId] = useState<string | null>(null);
  const [adder, setAdder] = useState<CityValue>({ city: "", country: "" });
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
  const [linkSpendlog, setLinkSpendlog] = useState(false);
  const [linkInframe, setLinkInframe] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const dragFrom = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const route = startDate && cities.length > 0 ? buildRoute(cities, startDate) : null;
  const totalDays = Math.max(1, cities.reduce((sum, c) => sum + c.days, 0));
  const endDate = startDate ? isoAddDays(startDate, totalDays - 1) : "";
  const named = cities.filter((c) => c.city.trim());
  const autoName = autoTitle(cities);
  const paceItem = PACES.find((p) => p.value === pace);
  const transportItem = TRANSPORT.find((t) => t.value === transport);

  const updateCity = (id: string, patch: Partial<CityRow>) => setCities((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const toggleInterest = (i: string) => setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const addCity = (v: CityValue) => {
    setCities((rows) => [...rows, { id: newTripLegId(), days: 3, dayTripAreas: [], ...v, country: v.country || "" }]);
    setAdder({ city: "", country: "" });
  };

  const moveCity = (from: number, to: number) => {
    if (to < 0 || to >= cities.length || from === to) return;
    setCities((rows) => {
      const next = [...rows];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const submit = async () => {
    setAttempted(true);
    if (!startDate) return toast({ title: "Pick a start date", status: "warning" });
    if (cities.length === 0) return toast({ title: "Where are you going? Add a city first.", status: "warning" });
    const blank = cities.find((c) => c.city.trim().length < 2);
    if (blank) return toast({ title: "Every city needs a name (or remove the empty one)", status: "warning" });
    const noCountry = cities.find((c) => !c.country.trim());
    if (noCountry) return toast({ title: `Which country is ${noCountry.city}? Pick it from the list or type the country.`, status: "warning" });

    const { legs, transfers } = buildRoute(cities, startDate);
    const payload = {
      title: title.trim() || autoTitle(cities),
      destinationCity: cities.length === 1 ? legs[0].baseCity : `${legs[0].baseCity} → ${legs[legs.length - 1].baseCity}`,
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
    if (!validated.success) return toast({ title: validated.error.issues[0]?.message ?? "Please check the form", status: "error" });

    try {
      const result = await createTrip.mutateAsync({ ...validated.data, links: { spendlog: linkSpendlog, inframe: linkInframe } });
      toast({ title: "Trip created", description: "Next: pick the places you want to see.", status: "success", duration: 4000 });
      navigate(`/trips/${result.trip.id}?tab=places`);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const previewProps: PreviewProps = {
    title: title.trim() || autoName,
    cities,
    legs: route?.legs ?? [],
    totalDays,
    pace,
    transport,
    budgetLevel,
    interests,
  };

  const createButton = (
    <Button type="submit" size="xl" w="full" leftIcon={<FiArrowRight />} isLoading={createTrip.isPending} loadingText="Creating…">
      Create trip
    </Button>
  );

  const wide = useBreakpointValue({ base: false, md: true }) ?? true;
  const adderPlaceholder = cities.length === 0 ? (wide ? "Where to? Search a city — works without any key" : "Where to? Search a city") : wide ? "Add a city — search works without any key" : "Add a city";

  const summary = cities.length === 0 ? "Add a city to start" : [plural(totalDays, "day"), plural(cities.length, "city").replace("citys", "cities"), paceItem?.label, transportItem?.short].filter(Boolean).join(" · ");

  return (
    <Grid
      as="form"
      noValidate
      onSubmit={(e: React.FormEvent) => {
        e.preventDefault();
        void submit();
      }}
      templateColumns={{ base: "minmax(0, 1fr)", xl: "minmax(0, 1fr) clamp(360px, 32vw, 460px)" }}
      columnGap={{ xl: "2.5rem" }}
      mr={{ xl: "-2rem" }}
      mt={{ xl: "-1.5rem" }}
      mb={{ lg: "-3rem" }}
      alignItems="start"
    >
      <Stack spacing={{ base: "14px", md: "20px" }} minW={0} pt={{ xl: "24px" }} pb={{ lg: "48px" }}>
        {header}

        <Section step={1} title="Where and when" id="where-when">
          <Flex gap="12px" align={{ base: "stretch", md: "flex-end" }} direction={{ base: "column", md: "row" }}>
            <FormControl w={{ base: "full", md: "240px" }} flexShrink={0} isInvalid={attempted && !startDate}>
              <Label htmlFor="trip-start">Start date</Label>
              <IconInput id="trip-start" icon={FiCalendar} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormControl>
            {startDate && (
              <Text fontSize="12px" color="tx3" pb={{ md: "12px" }} display={{ base: "none", md: "block" }}>
                Ends {fmt(endDate, "EEE d MMM")} · {plural(totalDays, "day")} · dates and travel days are computed
              </Text>
            )}
          </Flex>

          {cities.map((row, i) => {
            const leg = route?.legs[i];
            const km = i > 0 ? distanceLabel(cities[i - 1], row) : null;
            return (
              <Box key={row.id}>
                {i > 0 && (
                  <HStack spacing="8px" color="tx3" fontSize="12px" pl={{ base: "12px", md: "56px" }} minH="32px" mb="12px" mt="-2px">
                    <Icon as={LuCar} boxSize="14px" />
                    <Text>
                      Travel day{leg ? ` ${fmt(leg.startDate, "d MMM")}` : ""}
                      {km ? ` · ${km}` : ""} · added automatically
                    </Text>
                  </HStack>
                )}
                <CityCard
                  row={row}
                  index={i}
                  dates={leg ? { start: leg.startDate, end: leg.endDate } : null}
                  attempted={attempted}
                  isOpen={openCityId === row.id}
                  onToggle={() => setOpenCityId((id) => (id === row.id ? null : row.id))}
                  onChange={(patch) => updateCity(row.id, patch)}
                  onRemove={() => setCities((rows) => rows.filter((r) => r.id !== row.id))}
                  onMove={(dir) => moveCity(i, i + dir)}
                  dragHandlers={{
                    isDragging: dragging === i,
                    onDragStart: () => {
                      dragFrom.current = i;
                      setDragging(i);
                    },
                    onDragEnter: () => {
                      const from = dragFrom.current;
                      if (from === null || from === i) return;
                      moveCity(from, i);
                      dragFrom.current = i;
                      setDragging(i);
                    },
                    onDragEnd: () => {
                      dragFrom.current = null;
                      setDragging(null);
                    },
                  }}
                />
              </Box>
            );
          })}

          <CityInput
            value={adder}
            onChange={setAdder}
            onPick={addCity}
            clearOnPick
            onEnterText={(text) => addCity({ city: text, country: "" })}
            icon={FiSearch}
            dashed
            height="44px"
            ariaLabel="Add a city"
            isInvalid={attempted && cities.length === 0}
            placeholder={adderPlaceholder}
          />
        </Section>

        <Section step={2} title="How you like to travel" id="how-travel">
          <FormControl as="fieldset">
            <Label>Pace</Label>
            <Segmented<TravelStyle>
              value={pace}
              onChange={setPace}
              options={PACES.map((p) => ({ value: p.value, label: p.label }))}
              display="flex"
              w="full"
              aria-label="Pace"
              sx={{ "& > button": { flex: 1, justifyContent: "center", h: { base: "40px", md: "30px" } } }}
            />
            <Text fontSize="12px" color="tx3" mt="6px" display={{ base: "none", md: "block" }}>
              {paceItem?.label} · {paceItem?.hint}
            </Text>
          </FormControl>
          <Box>
            <Label>Getting around</Label>
            <SimpleGrid columns={5} spacing="8px" display={{ base: "none", md: "grid" }} role="group" aria-label="Getting around">
              {TRANSPORT.map((t) => (
                <OptionTile key={t.value} selected={transport === t.value} icon={t.icon} label={t.label} onClick={() => setTransport(t.value)} />
              ))}
            </SimpleGrid>
            <Wrap spacing="6px" display={{ base: "flex", md: "none" }} role="group" aria-label="Getting around">
              {TRANSPORT.map((t) => (
                <WrapItem key={t.value}>
                  <ChoiceChip size="lg" selected={transport === t.value} icon={t.icon} onClick={() => setTransport(t.value)}>
                    {t.short}
                  </ChoiceChip>
                </WrapItem>
              ))}
            </Wrap>
          </Box>
          <Box>
            <Label>Budget level</Label>
            <SimpleGrid columns={3} spacing="8px" display={{ base: "none", md: "grid" }} role="group" aria-label="Budget level">
              {BUDGETS.map((b) => (
                <OptionTile key={b.value} selected={budgetLevel === b.value} icon={LuWallet} label={b.label} onClick={() => setBudgetLevel(budgetLevel === b.value ? undefined : b.value)} />
              ))}
            </SimpleGrid>
            <Wrap spacing="6px" display={{ base: "flex", md: "none" }} role="group" aria-label="Budget level">
              {BUDGETS.map((b) => (
                <WrapItem key={b.value}>
                  <ChoiceChip size="lg" selected={budgetLevel === b.value} onClick={() => setBudgetLevel(budgetLevel === b.value ? undefined : b.value)}>
                    {b.label}
                  </ChoiceChip>
                </WrapItem>
              ))}
            </Wrap>
          </Box>
        </Section>

        <Section step={3} title="Interests" hint="Pick a few — they guide place discovery and the plan." id="interests">
          <Wrap spacing={{ base: "6px", md: "8px" }} role="group" aria-label="Interests">
            {INTEREST_CATEGORIES.map((i) => (
              <WrapItem key={i}>
                <ChoiceChip
                  selected={interests.includes(i)}
                  onClick={() => toggleInterest(i)}
                  icon={INTEREST_ICONS[i]}
                  h={{ base: "40px", md: "32px" }}
                  px={{ base: "16px", md: "12px" }}
                  sx={{ "& > svg": { display: { base: "none", md: "block" } } }}
                >
                  {i}
                </ChoiceChip>
              </WrapItem>
            ))}
          </Wrap>
        </Section>

        <Section step={4} title="Connected apps" hint="Optional — switch either on or off later from the trip." id="connected-apps">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing="12px">
            <Checkbox isChecked={linkSpendlog} onChange={(e) => setLinkSpendlog(e.target.checked)} alignItems="flex-start">
              <Text fontWeight={600} fontSize="14px">
                Track spending in SpendLog
              </Text>
              <Text fontSize="12px" color="tx3">
                Creates a SpendLog trip for everyone on it — log, split and settle what you actually spend.
              </Text>
            </Checkbox>
            <Checkbox isChecked={linkInframe} onChange={(e) => setLinkInframe(e.target.checked)} alignItems="flex-start">
              <Text fontWeight={600} fontSize="14px">
                Share photos in InFrame
              </Text>
              <Text fontSize="12px" color="tx3">
                Creates a shared InFrame event so everyone&apos;s trip photos land in one album.
              </Text>
            </Checkbox>
          </SimpleGrid>
        </Section>

        <SurfaceCard as="section" aria-labelledby="more-options" p={{ base: "14px", md: "16px 20px" }}>
          <Flex
            as="button"
            type="button"
            w="full"
            align="center"
            justify="space-between"
            gap="12px"
            textAlign="left"
            onClick={more.onToggle}
            aria-expanded={more.isOpen}
            aria-controls="more-options-panel"
          >
            <HStack spacing="10px" align="center" minW={0}>
              <Icon as={FiSliders} boxSize="18px" display={{ base: "none", md: "block" }} />
              <Box minW={0}>
                <Text as="h2" id="more-options" fontWeight={600}>
                  More options
                </Text>
                <Text fontSize="12px" color="tx3" display={{ base: "none", md: "block" }}>
                  Trip name, status, daily hours, best-time scheduling, budget, must-see and skip lists, notes
                </Text>
              </Box>
            </HStack>
            <Flex
              as="span"
              w="36px"
              h="36px"
              align="center"
              justify="center"
              borderRadius="md"
              borderWidth={{ base: 0, md: "1px" }}
              borderColor="ln"
              bg={{ md: "sf" }}
              flexShrink={0}
              aria-hidden
            >
              <Icon as={more.isOpen ? FiChevronUp : FiChevronDown} boxSize="18px" />
            </Flex>
          </Flex>
          <Collapse in={more.isOpen} animateOpacity>
            <SimpleGrid id="more-options-panel" columns={{ base: 1, md: 2 }} spacing="16px" mt="16px" pt="16px" borderTopWidth="1px" borderColor="ln">
              <FormControl>
                <Label htmlFor="trip-title">Trip name</Label>
                <Input id="trip-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={autoName || "e.g. Japan in spring"} />
              </FormControl>
              <FormControl>
                <Label htmlFor="trip-status">Status</Label>
                <Select id="trip-status" value={status} onChange={(e) => setStatus(e.target.value as TripStatus)}>
                  <option value="draft">Planning (draft)</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </Select>
              </FormControl>
              <FormControl>
                <Label>Day starts / ends</Label>
                <HStack>
                  <IconInput icon={FiClock} type="time" value={dailyStart} onChange={(e) => setDailyStart(e.target.value)} aria-label="Day starts" />
                  <Text color="tx3">–</Text>
                  <IconInput icon={FiClock} type="time" value={dailyEnd} onChange={(e) => setDailyEnd(e.target.value)} aria-label="Day ends" />
                </HStack>
                <Checkbox mt="8px" size="sm" isChecked={flexible} onChange={(e) => setFlexible(e.target.checked)}>
                  Schedule by each place&apos;s best time instead
                </Checkbox>
              </FormControl>
              <FormControl>
                <Label htmlFor="trip-budget">Total budget</Label>
                <HStack>
                  <Input id="trip-budget" type="number" min={0} value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} placeholder="Optional" />
                  <Select value={currency} onChange={(e) => setCurrency(e.target.value)} maxW="9rem" aria-label="Currency">
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
                  onSelect={(sel) => !mustVisit.includes(sel.name) && setMustVisit((prev) => [...prev, sel.name])}
                />
                {mustVisit.length > 0 && (
                  <Wrap mt="8px">
                    {mustVisit.map((p) => (
                      <WrapItem key={p}>
                        <Tag size="md" colorScheme="brand">
                          {p}
                          <TagCloseButton aria-label={`Remove ${p}`} onClick={() => setMustVisit((prev) => prev.filter((x) => x !== p))} />
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                )}
              </Box>
              <FormControl>
                <Label htmlFor="trip-skip">Places to skip</Label>
                <Input id="trip-skip" value={excluded} onChange={(e) => setExcluded(e.target.value)} placeholder="Comma-separated" />
              </FormControl>
              <FormControl gridColumn={{ md: "span 2" }}>
                <Label htmlFor="trip-notes">Notes</Label>
                <Textarea
                  id="trip-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Who's coming, needs like step-free access, anything the plan should know"
                />
              </FormControl>
            </SimpleGrid>
          </Collapse>
        </SurfaceCard>

        {/* Below xl: a sticky bar with the summary, the preview in a drawer, and Create. */}
        <Box
          display={{ base: "block", xl: "none" }}
          position="sticky"
          bottom={{ base: "calc(72px + env(safe-area-inset-bottom))", lg: 0 }}
          zIndex={2}
          mx={{ base: "-1rem", md: "-1.5rem", lg: "-2rem" }}
          px={{ base: 4, md: 6, lg: 8 }}
          py={3}
          bg="sf"
          borderTopWidth="1px"
          borderColor="ln"
        >
          <Flex justify="space-between" align="center" gap="8px" mb="8px" fontSize="12px">
            <Text color="tx3" noOfLines={1}>
              {summary}
            </Text>
            <Link as="button" type="button" fontSize="13px" flexShrink={0} onClick={preview.onOpen}>
              Preview map
            </Link>
          </Flex>
          {createButton}
        </Box>
      </Stack>

      <Flex
        as="aside"
        aria-label="Your trip preview"
        display={{ base: "none", xl: "flex" }}
        direction="column"
        position="sticky"
        top="72px"
        h="calc(100vh - 72px)"
        overflowY="auto"
        bg="sf"
        borderLeftWidth="1px"
        borderColor="ln"
      >
        <PreviewBody {...previewProps} />
        <Box flex={1} />
        <Stack spacing="8px" px="24px" py="20px" borderTopWidth="1px" borderColor="ln">
          {createButton}
          <Text fontSize="12px" color="tx3" textAlign="center">
            Next you&rsquo;ll pick places. Nothing is generated until you say so.
          </Text>
        </Stack>
      </Flex>

      <Drawer isOpen={preview.isOpen} onClose={preview.onClose} placement="bottom">
        <DrawerOverlay />
        <DrawerContent borderTopRadius="xl" maxH="85vh">
          <DrawerCloseButton />
          <DrawerHeader srOnly>Trip preview</DrawerHeader>
          <DrawerBody p={0}>{preview.isOpen && <PreviewBody {...previewProps} mapHeight="220px" />}</DrawerBody>
        </DrawerContent>
      </Drawer>
    </Grid>
  );
}
