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
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { INTEREST_CATEGORIES } from "@/constants/interests";
import { useCreateTrip } from "@/modules/trips/hooks/useTrips";
import { getApiErrorMessage } from "@/lib/api";
import {
  createTripSchema,
  tripFormSchema,
  type TripFormValues,
} from "@/modules/trips/validators/trip.validator";
import { parseCommaSeparated } from "@/utils/trip.utils";
import { PlaceSearchInput } from "@/modules/places/components/PlaceSearchInput";
import { TripLegBuilder } from "@/modules/trips/components/TripLegBuilder";
import type { TripLeg, TripLegTransfer } from "@/modules/trips/types/trip-leg.types";
import { createEmptyLeg, syncTripDatesFromLegs } from "@/modules/trips/utils/trip-leg.utils";

const defaultValues: TripFormValues = {
  title: "",
  destinationCity: "",
  destinationState: "",
  destinationCountry: "India",
  startDate: "",
  endDate: "",
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

export function TripForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const createTrip = useCreateTrip();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues,
  });

  const destinationCountry = watch("destinationCountry");
  const [mustVisitList, setMustVisitList] = useState<string[]>([]);
  const [excludedText, setExcludedText] = useState("");
  const [legs, setLegs] = useState<TripLeg[]>([createEmptyLeg(0, "India")]);
  const [transfers, setTransfers] = useState<TripLegTransfer[]>([]);
  const selectedInterests = watch("interests") ?? [];

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
    const synced = syncTripDatesFromLegs(legs, transfers);
    const payload = {
      ...data,
      destinationCity: synced?.destinationCity ?? data.destinationCity,
      startDate: synced?.startDate ?? data.startDate,
      endDate: synced?.endDate ?? data.endDate,
      mustVisitPlaces: mustVisitList,
      excludedPlaces: parseCommaSeparated(excludedText),
      legs,
      transfers,
    };

    if (legs.filter((l) => l.baseCity.trim()).length === 0) {
      toast({
        title: "Add at least one destination leg with a base city",
        status: "error",
        duration: 4000,
      });
      return;
    }

    const validated = createTripSchema.safeParse(payload);
    if (!validated.success) {
      toast({
        title: validated.error.issues[0]?.message ?? "Invalid input",
        status: "error",
        duration: 4000,
      });
      return;
    }

    try {
      const result = await createTrip.mutateAsync(validated.data);
      toast({ title: "Trip created successfully", status: "success", duration: 3000 });
      navigate(`/trips/${result.trip.id}`);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 4000 });
    }
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

          <FormControl isInvalid={!!errors.title} mb={4}>
            <FormLabel>Trip Title</FormLabel>
            <Input placeholder="Rajasthan: Ajmer to Jaipur" {...register("title")} />
            <FormErrorMessage>{errors.title?.message}</FormErrorMessage>
          </FormControl>

          <TripLegBuilder legs={legs} transfers={transfers} country={destinationCountry} onChange={handleLegsChange} />
        </Box>

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
              city={legs[0]?.baseCity}
              country={legs[0]?.country ?? destinationCountry}
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
                        onClick={() => setMustVisitList((prev) => prev.filter((p) => p !== place))}
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
              Create Trip
            </Button>
          </GridItem>
          <GridItem>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </GridItem>
        </Grid>
      </Stack>
    </Box>
  );
}
