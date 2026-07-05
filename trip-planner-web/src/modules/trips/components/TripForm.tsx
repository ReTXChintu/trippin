"use client";

import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormErrorMessage,
  FormLabel,
  FormHelperText,
  Grid,
  GridItem,
  Heading,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Tag,
  TagCloseButton,
  Textarea,
  useColorModeValue,
  useToast,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { format, addDays } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { INTEREST_CATEGORIES } from "@/constants/interests";
import {
  createTripAction,
  updateTripAction,
} from "@/modules/trips/actions/trip.actions";
import {
  createTripSchema,
  tripFormSchema,
  type CreateTripInput,
  type TripFormValues,
} from "@/modules/trips/validators/trip.validator";
import type { Trip } from "@/modules/trips/types/trip.types";
import { parseCommaSeparated } from "@/utils/trip.utils";
import { PlaceSearchInput } from "@/modules/places/components/PlaceSearchInput";
import { TripLegBuilder } from "@/modules/trips/components/TripLegBuilder";
import type { TripLeg, TripLegTransfer } from "@/modules/trips/types/trip-leg.types";
import { syncTripDatesFromLegs } from "@/modules/trips/utils/trip-leg.utils";

interface TripFormProps {
  mode: "create" | "edit";
  trip?: Trip;
}

const today = format(new Date(), "yyyy-MM-dd");
const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

const defaultValues: TripFormValues = {
  title: "",
  destinationCity: "",
  destinationState: "",
  destinationCountry: "India",
  startDate: today,
  endDate: tomorrow,
  arrivalTime: "",
  departureTime: "",
  hotelName: "",
  hotelAddress: "",
  dailyStartTime: "09:00",
  dailyEndTime: "20:00",
  useFlexibleSchedule: false,
  transportationMode: "Walking",
  travelStyle: "Balanced",
  interests: [],
  mustVisitPlaces: [],
  excludedPlaces: [],
  notes: "",
  status: "draft",
  legs: [],
  transfers: [],
};

function tripToFormValues(trip: Trip): TripFormValues {
  return {
    title: trip.title,
    destinationCity: trip.destinationCity,
    destinationState: trip.destinationState ?? "",
    destinationCountry: trip.destinationCountry,
    startDate: trip.startDate.slice(0, 10),
    endDate: trip.endDate.slice(0, 10),
    arrivalTime: trip.arrivalTime ?? "",
    departureTime: trip.departureTime ?? "",
    hotelName: trip.hotelName ?? "",
    hotelAddress: trip.hotelAddress ?? "",
    hotelLat: trip.hotelCoordinates?.lat.toString() ?? "",
    hotelLng: trip.hotelCoordinates?.lng.toString() ?? "",
    dailyStartTime: trip.dailyStartTime,
    dailyEndTime: trip.dailyEndTime,
    useFlexibleSchedule: trip.useFlexibleSchedule,
    transportationMode: trip.transportationMode,
    travelStyle: trip.travelStyle,
    budgetLevel: trip.budgetLevel,
    interests: trip.interests,
    mustVisitPlaces: trip.mustVisitPlaces,
    excludedPlaces: trip.excludedPlaces,
    notes: trip.notes ?? "",
    status: trip.status,
    legs: trip.legs,
    transfers: trip.transfers,
  };
}

function toFormData(data: CreateTripInput, legs: TripLeg[], transfers: TripLegTransfer[]): FormData {
  const fd = new FormData();
  const { legs: _legs, transfers: _transfers, ...flat } = data;
  void _legs;
  void _transfers;
  (Object.entries(flat) as [keyof typeof flat, (typeof flat)[keyof typeof flat]][]).forEach(
    ([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach((v) => fd.append(String(key), String(v)));
      } else {
        fd.append(String(key), String(value));
      }
    },
  );
  fd.set("legs", JSON.stringify(legs));
  fd.set("transfers", JSON.stringify(transfers));
  return fd;
}

export function TripForm({ mode, trip }: TripFormProps) {
  const router = useRouter();
  const toast = useToast();
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: trip ? tripToFormValues(trip) : defaultValues,
  });

  const selectedInterests = watch("interests") ?? [];
  const destinationCity = watch("destinationCity");
  const destinationCountry = watch("destinationCountry");
  const [mustVisitList, setMustVisitList] = useState<string[]>(
    trip?.mustVisitPlaces ?? [],
  );
  const [excludedText, setExcludedText] = useState(
    trip?.excludedPlaces.join(", ") ?? "",
  );
  const [hotelSearchValue, setHotelSearchValue] = useState(trip?.hotelName ?? "");
  const [multiDestination, setMultiDestination] = useState((trip?.legs.length ?? 0) > 0);
  const [legs, setLegs] = useState<TripLeg[]>(trip?.legs ?? []);
  const [transfers, setTransfers] = useState<TripLegTransfer[]>(trip?.transfers ?? []);

  const handleLegsChange = (nextLegs: TripLeg[], nextTransfers: TripLegTransfer[]) => {
    setLegs(nextLegs);
    setTransfers(nextTransfers);
    const synced = syncTripDatesFromLegs(nextLegs, nextTransfers);
    if (synced) {
      setValue("destinationCity", synced.destinationCity);
      setValue("startDate", synced.startDate);
      setValue("endDate", synced.endDate);
    }
  };

  const onSubmit = async (data: TripFormValues) => {
    const synced = multiDestination ? syncTripDatesFromLegs(legs, transfers) : null;
    const payload = {
      ...data,
      destinationCity: synced?.destinationCity ?? data.destinationCity,
      startDate: synced?.startDate ?? data.startDate,
      endDate: synced?.endDate ?? data.endDate,
      mustVisitPlaces: mustVisitList,
      excludedPlaces: parseCommaSeparated(excludedText),
      legs: multiDestination ? legs : [],
      transfers: multiDestination ? transfers : [],
    };

    const validated = createTripSchema.safeParse(payload);
    if (!validated.success) {
      toast({
        title: validated.error.issues[0]?.message ?? "Invalid input",
        status: "error",
        duration: 4000,
      });
      return;
    }

    if (multiDestination && legs.filter((l) => l.baseCity.trim()).length === 0) {
      toast({
        title: "Add at least one destination leg with a base city",
        status: "error",
        duration: 4000,
      });
      return;
    }

    const formData = toFormData(
      validated.data,
      multiDestination ? legs : [],
      multiDestination ? transfers : [],
    );
    const result =
      mode === "create"
        ? await createTripAction(formData)
        : await updateTripAction(trip!.id, formData);

    if (!result.success) {
      toast({ title: result.error, status: "error", duration: 4000 });
      return;
    }

    toast({
      title: result.message ?? "Saved",
      status: "success",
      duration: 3000,
    });
    router.push(`/trips/${result.data!.trip.id}`);
    router.refresh();
  };

  return (
    <Box
      as="form"
      onSubmit={handleSubmit(onSubmit)}
      p={6}
      bg={bg}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="xl"
    >
      <Stack spacing={8}>
        <Box>
          <Heading size="md" mb={4}>
            Basic Information
          </Heading>
          <Checkbox
            mb={4}
            isChecked={multiDestination}
            onChange={(e) => setMultiDestination(e.target.checked)}
          >
            Multi-destination trip (multiple cities / stops)
          </Checkbox>

          {multiDestination ? (
            <TripLegBuilder
              legs={legs}
              transfers={transfers}
              country={destinationCountry}
              onChange={handleLegsChange}
            />
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isInvalid={!!errors.title} gridColumn={{ md: "span 2" }}>
                <FormLabel>Trip Title</FormLabel>
                <Input placeholder="3-Day Jaipur Heritage Trip" {...register("title")} />
                <FormErrorMessage>{errors.title?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.destinationCity}>
                <FormLabel>Destination City</FormLabel>
                <Input placeholder="Jaipur" {...register("destinationCity")} />
                <FormErrorMessage>{errors.destinationCity?.message}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>State / Region</FormLabel>
                <Input placeholder="Rajasthan" {...register("destinationState")} />
              </FormControl>

              <FormControl isInvalid={!!errors.destinationCountry}>
                <FormLabel>Country</FormLabel>
                <Input {...register("destinationCountry")} />
                <FormErrorMessage>{errors.destinationCountry?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.status}>
                <FormLabel>Status</FormLabel>
                <Select {...register("status")}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </Select>
              </FormControl>
            </SimpleGrid>
          )}

          {multiDestination && (
            <FormControl isInvalid={!!errors.title} mt={4}>
              <FormLabel>Trip Title</FormLabel>
              <Input placeholder="Rajasthan: Ajmer to Jaipur" {...register("title")} />
              <FormErrorMessage>{errors.title?.message}</FormErrorMessage>
            </FormControl>
          )}
        </Box>

        {!multiDestination && (
        <Box>
          <Heading size="md" mb={4}>
            Dates & Schedule
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl isInvalid={!!errors.startDate}>
              <FormLabel>Start Date</FormLabel>
              <Input type="date" {...register("startDate")} />
              <FormErrorMessage>{errors.startDate?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.endDate}>
              <FormLabel>End Date</FormLabel>
              <Input type="date" {...register("endDate")} />
              <FormErrorMessage>{errors.endDate?.message}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel>Arrive at</FormLabel>
              <Input type="time" {...register("arrivalTime")} />
              <FormHelperText mt={1}>
                When you reach the destination (first day only). E.g. train lands 7:30 AM.
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Leave at</FormLabel>
              <Input type="time" {...register("departureTime")} />
              <FormHelperText mt={1}>
                When you leave on the last day. Morning checkout = no sightseeing that day.
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Daily Start Time</FormLabel>
              <Input type="time" {...register("dailyStartTime")} />
            </FormControl>

            <FormControl>
              <FormLabel>Daily End Time</FormLabel>
              <Input type="time" {...register("dailyEndTime")} />
            </FormControl>

            <FormControl gridColumn={{ md: "span 2" }}>
              <Checkbox {...register("useFlexibleSchedule")}>
                Plan by place best times (ignore fixed daily start)
              </Checkbox>
              <FormHelperText mt={1}>
                When enabled, the itinerary schedules each stop at category-based best times
                (e.g. temples early morning, markets evening), clamped within your arrival and
                departure windows.
              </FormHelperText>
            </FormControl>
          </SimpleGrid>
        </Box>
        )}

        {multiDestination && (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>Daily Start Time</FormLabel>
              <Input type="time" {...register("dailyStartTime")} />
            </FormControl>
            <FormControl>
              <FormLabel>Daily End Time</FormLabel>
              <Input type="time" {...register("dailyEndTime")} />
            </FormControl>
            <FormControl gridColumn={{ md: "span 2" }}>
              <Checkbox {...register("useFlexibleSchedule")}>
                Plan by place best times (ignore fixed daily start)
              </Checkbox>
              <FormHelperText mt={1}>
                Stops are scheduled at preferred or inferred best visit times instead of a fixed
                morning start.
              </FormHelperText>
            </FormControl>
            <FormControl isInvalid={!!errors.status}>
              <FormLabel>Status</FormLabel>
              <Select {...register("status")}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </Select>
            </FormControl>
          </SimpleGrid>
        )}

        {!multiDestination && (
        <Box>
          <Heading size="md" mb={4}>
            Accommodation
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box gridColumn={{ md: "span 2" }}>
              <PlaceSearchInput
                label="Search Hotel"
                placeholder="Search hotels near your destination..."
                mode="hotel"
                city={destinationCity}
                country={destinationCountry}
                value={hotelSearchValue}
                onSelect={(sel) => {
                  setHotelSearchValue(sel.name);
                  setValue("hotelName", sel.name);
                  setValue("hotelAddress", sel.address ?? "");
                  if (sel.lat !== undefined) setValue("hotelLat", sel.lat.toString());
                  if (sel.lng !== undefined) setValue("hotelLng", sel.lng.toString());
                }}
                onClear={() => {
                  setValue("hotelName", "");
                  setValue("hotelAddress", "");
                  setValue("hotelLat", "");
                  setValue("hotelLng", "");
                }}
              />
            </Box>

            <FormControl gridColumn={{ md: "span 2" }}>
              <FormLabel>Hotel Address</FormLabel>
              <Input placeholder="Auto-filled from search" {...register("hotelAddress")} />
            </FormControl>

            <input type="hidden" {...register("hotelName")} />

            <FormControl>
              <FormLabel>Latitude</FormLabel>
              <Input type="text" readOnly placeholder="Auto-filled" {...register("hotelLat")} />
            </FormControl>

            <FormControl>
              <FormLabel>Longitude</FormLabel>
              <Input type="text" readOnly placeholder="Auto-filled" {...register("hotelLng")} />
            </FormControl>
          </SimpleGrid>
        </Box>
        )}

        <Box>
          <Heading size="md" mb={4}>
            Travel Preferences
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <FormControl>
              <FormLabel>Transportation</FormLabel>
              <Select {...register("transportationMode")}>
                <option value="Walking">Walking</option>
                <option value="Cab">Cab</option>
                <option value="Self Drive">Self Drive</option>
                <option value="Bike">Bike</option>
                <option value="Public Transport">Public Transport</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Travel Style</FormLabel>
              <Select {...register("travelStyle")}>
                <option value="Relaxed">Relaxed</option>
                <option value="Balanced">Balanced</option>
                <option value="Fast Paced">Fast Paced</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Budget Level</FormLabel>
              <Select {...register("budgetLevel")} placeholder="Select budget">
                <option value="budget">Budget</option>
                <option value="moderate">Moderate</option>
                <option value="luxury">Luxury</option>
              </Select>
            </FormControl>
          </SimpleGrid>
        </Box>

        <FormControl>
          <FormLabel>Interests</FormLabel>
          <CheckboxGroup
            value={selectedInterests}
            onChange={(vals) => setValue("interests", vals as string[])}
          >
            <Wrap spacing={3}>
              {INTEREST_CATEGORIES.map((interest) => (
                <WrapItem key={interest}>
                  <Checkbox value={interest}>{interest}</Checkbox>
                </WrapItem>
              ))}
            </Wrap>
          </CheckboxGroup>
        </FormControl>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Box>
            <PlaceSearchInput
              label="Add Must-Visit Place"
              placeholder="Search attractions..."
              mode="place"
              city={destinationCity}
              country={destinationCountry}
              onSelect={(sel) => {
                if (!mustVisitList.includes(sel.name)) {
                  setMustVisitList((prev) => [...prev, sel.name]);
                }
              }}
            />
            {mustVisitList.length > 0 && (
              <Wrap mt={3} spacing={2}>
                {mustVisitList.map((place) => (
                  <WrapItem key={place}>
                    <Tag size="md" colorScheme="brand">
                      {place}
                      <TagCloseButton
                        onClick={() =>
                          setMustVisitList((prev) => prev.filter((p) => p !== place))
                        }
                      />
                    </Tag>
                  </WrapItem>
                ))}
              </Wrap>
            )}
          </Box>

          <FormControl>
            <FormLabel>Excluded Places</FormLabel>
            <Textarea
              placeholder="Places to skip (comma-separated)"
              rows={3}
              value={excludedText}
              onChange={(e) => setExcludedText(e.target.value)}
            />
          </FormControl>
        </SimpleGrid>

        <FormControl>
          <FormLabel>Notes</FormLabel>
          <Textarea rows={3} placeholder="Additional preferences..." {...register("notes")} />
        </FormControl>

        <Grid templateColumns={{ base: "1fr", md: "auto auto" }} gap={3}>
          <GridItem>
            <Button type="submit" colorScheme="brand" isLoading={isSubmitting}>
              {mode === "create" ? "Create Trip" : "Save Changes"}
            </Button>
          </GridItem>
          <GridItem>
            <Button variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
          </GridItem>
        </Grid>
      </Stack>
    </Box>
  );
}
