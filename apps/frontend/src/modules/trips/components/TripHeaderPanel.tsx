import {
  Badge,
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Tag,
  Textarea,
  Wrap,
  WrapItem,
  useToast,
} from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { INTEREST_CATEGORIES } from "@/constants/interests";
import { getApiErrorMessage } from "@/lib/api";
import { TripActionsMenu } from "@/modules/trips/components/TripActionsMenu";
import { TripMembersPanel } from "@/modules/trips/components/TripMembersPanel";
import { useUpdateTrip } from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";
import { tripToFormValues } from "@/modules/trips/utils/trip-form.utils";
import { tripFormSchema, type TripFormValues } from "@/modules/trips/validators/trip.validator";
import { parseCommaSeparated } from "@/utils/trip.utils";

interface TripHeaderPanelProps {
  trip: Trip;
  currentUserId: string;
  isOwner: boolean;
  /** Rendered inside the settings drawer: no card chrome, no actions menu. */
  embedded?: boolean;
  onSaved?: () => void;
}

const statusColors: Record<Trip["status"], string> = {
  draft: "gray",
  active: "green",
  completed: "blue",
  archived: "orange",
};

export function TripHeaderPanel({ trip, currentUserId, isOwner, embedded = false, onSaved }: TripHeaderPanelProps) {
  const toast = useToast();
  const bg = "bg.surface";
  const borderColor = "border.line";
  const updateTrip = useUpdateTrip(trip.id);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: tripToFormValues(trip),
  });

  useEffect(() => {
    if (!isDirty) reset(tripToFormValues(trip));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.updatedAt]);

  const selectedInterests = watch("interests") ?? [];
  const excludedText = (watch("excludedPlaces") ?? []).join(", ");

  const onSubmit = async (data: TripFormValues) => {
    const payload = { ...tripToFormValues(trip), ...data };
    try {
      await updateTrip.mutateAsync(payload);
      toast({ title: "Trip updated", status: "success", duration: 2000 });
      reset(payload);
      onSaved?.();
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Box
      as="form"
      onSubmit={handleSubmit(onSubmit)}
      p={embedded ? 0 : 5}
      bg={embedded ? undefined : bg}
      borderWidth={embedded ? 0 : "1px"}
      borderColor={borderColor}
      borderRadius="xl"
    >
      <Flex justify="space-between" align="flex-start" gap={3} flexWrap="wrap" mb={4}>
        <HStack spacing={3} flex={1} minW="240px">
          <Input
            {...register("title")}
            fontSize="lg"
            fontWeight="bold"
            variant="flushed"
            placeholder="Trip title"
          />
          <Badge colorScheme={statusColors[trip.status]}>{trip.status}</Badge>
        </HStack>
        <HStack spacing={2}>
          {isDirty && (
            <Button type="submit" size="sm" colorScheme="brand" isLoading={isSubmitting}>
              Save changes
            </Button>
          )}
          {!embedded && <TripActionsMenu trip={trip} isOwner={isOwner} />}
        </HStack>
      </Flex>

      <Stack spacing={5}>
        <TripMembersPanel trip={trip} currentUserId={currentUserId} />

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <FormControl>
            <FormLabel fontSize="sm">Daily Start</FormLabel>
            <Input size="sm" type="time" {...register("dailyStartTime")} />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Daily End</FormLabel>
            <Input size="sm" type="time" {...register("dailyEndTime")} />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Transportation</FormLabel>
            <Select size="sm" {...register("transportationMode")}>
              <option value="Walking">Walking</option>
              <option value="Cab">Cab</option>
              <option value="Self Drive">Self Drive</option>
              <option value="Bike">Bike</option>
              <option value="Public Transport">Public Transport</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Travel Style</FormLabel>
            <Select size="sm" {...register("travelStyle")}>
              <option value="Relaxed">Relaxed</option>
              <option value="Balanced">Balanced</option>
              <option value="Fast Paced">Fast Paced</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Budget Level</FormLabel>
            <Select size="sm" {...register("budgetLevel")} placeholder="Not set">
              <option value="budget">Budget</option>
              <option value="moderate">Moderate</option>
              <option value="luxury">Luxury</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Currency</FormLabel>
            <Input size="sm" maxLength={3} textTransform="uppercase" placeholder="INR" {...register("currency")} />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Total budget</FormLabel>
            <Input size="sm" type="number" min={0} placeholder="Optional" {...register("budgetAmount")} />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Status</FormLabel>
            <Select size="sm" {...register("status")}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </Select>
          </FormControl>
          <FormControl gridColumn={{ md: "span 2" }} display="flex" alignItems="center" pt={5}>
            <Checkbox {...register("useFlexibleSchedule")} fontSize="sm">
              Plan by place best times
            </Checkbox>
          </FormControl>
        </SimpleGrid>

        <FormControl>
          <FormLabel fontSize="sm">Interests</FormLabel>
          <CheckboxGroup value={selectedInterests} onChange={(vals) => setValue("interests", vals as string[], { shouldDirty: true })}>
            <Wrap spacing={2}>
              {INTEREST_CATEGORIES.map((interest) => (
                <WrapItem key={interest}>
                  <Checkbox size="sm" value={interest}>
                    {interest}
                  </Checkbox>
                </WrapItem>
              ))}
            </Wrap>
          </CheckboxGroup>
        </FormControl>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl>
            <FormLabel fontSize="sm">Must-Visit Places</FormLabel>
            <Wrap>
              {(watch("mustVisitPlaces") ?? []).map((place) => (
                <WrapItem key={place}>
                  <Tag size="sm">{place}</Tag>
                </WrapItem>
              ))}
              {(watch("mustVisitPlaces") ?? []).length === 0 && (
                <Tag size="sm" variant="outline" color="fg.muted">
                  None yet — add from a leg's Places tab
                </Tag>
              )}
            </Wrap>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Excluded Places</FormLabel>
            <Textarea
              size="sm"
              rows={2}
              placeholder="Places to skip (comma-separated)"
              value={excludedText}
              onChange={(e) => setValue("excludedPlaces", parseCommaSeparated(e.target.value), { shouldDirty: true })}
            />
          </FormControl>
        </SimpleGrid>

        <FormControl>
          <FormLabel fontSize="sm">Notes</FormLabel>
          <Textarea size="sm" rows={2} placeholder="Additional preferences..." {...register("notes")} />
        </FormControl>
      </Stack>
    </Box>
  );
}
