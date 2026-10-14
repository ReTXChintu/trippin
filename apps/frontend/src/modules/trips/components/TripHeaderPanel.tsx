import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Stack,
  Tag,
  Text,
  Textarea,
  Tooltip,
  Wrap,
  WrapItem,
  useClipboard,
  useToast,
} from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { LuCopy, LuExternalLink, LuGlobe } from "react-icons/lu";
import { INTEREST_CATEGORIES } from "@/constants/interests";
import { getApiErrorMessage } from "@/lib/api";
import { canEditTrip } from "@/lib/trip-access";
import { TripActionsMenu } from "@/modules/trips/components/TripActionsMenu";
import { TripMembersPanel } from "@/modules/trips/components/TripMembersPanel";
import { useShareTrip, useUnshareTrip, useUpdateTrip } from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";
import { tripToFormValues } from "@/modules/trips/utils/trip-form.utils";
import { tripFormSchema, type TripFormValues } from "@/modules/trips/validators/trip.validator";
import { parseCommaSeparated } from "@/utils/trip.utils";
import { formatDayDate } from "@/modules/itinerary/utils/plan.utils";
import { Segmented } from "@/components/ui";
import { SectionLabel } from "@/components/ui/plan";

interface TripHeaderPanelProps {
  trip: Trip;
  currentUserId: string;
  isOwner: boolean;
  /** Rendered inside the settings drawer: no card chrome, no actions menu. */
  embedded?: boolean;
  onSaved?: () => void;
}

/** "Public share link" — On/Off plus the link to copy. */
function PublicShare({ trip, canEdit }: { trip: Trip; canEdit: boolean }) {
  const toast = useToast();
  const share = useShareTrip(trip.id);
  const unshare = useUnshareTrip(trip.id);
  const url = trip.publicSlug ? `${window.location.origin}/share/${trip.publicSlug}` : "";
  const { hasCopied, onCopy } = useClipboard(url);

  const set = async (on: "on" | "off") => {
    if ((on === "on") === trip.isPublic) return;
    try {
      if (on === "on") await share.mutateAsync();
      else await unshare.mutateAsync();
      toast({ title: on === "on" ? "Share link created" : "Sharing turned off", status: "success", duration: 2500 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Stack as="section" spacing="10px" aria-label="Public share link">
      <Flex justify="space-between" align="center">
        <SectionLabel>Public share link</SectionLabel>
        {canEdit ? (
          <Segmented
            value={trip.isPublic ? "on" : "off"}
            onChange={(v) => void set(v)}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            opacity={share.isPending || unshare.isPending ? 0.6 : 1}
          />
        ) : (
          <Text fontSize="13px" color="fg.muted">
            {trip.isPublic ? "On" : "Off"}
          </Text>
        )}
      </Flex>
      {trip.isPublic && url && (
        <Flex gap={2}>
          <InputGroup>
            <InputLeftElement pointerEvents="none" color="fg.muted">
              <LuGlobe size={15} />
            </InputLeftElement>
            <Input value={url} isReadOnly aria-label="Public link" onFocus={(e) => e.target.select()} />
          </InputGroup>
          <Tooltip label={hasCopied ? "Copied" : "Copy link"} hasArrow>
            <IconButton aria-label="Copy public link" icon={<LuCopy size={16} />} h="40px" w="40px" onClick={onCopy} />
          </Tooltip>
          <Tooltip label="Open the public page" hasArrow>
            <IconButton as="a" href={url} target="_blank" rel="noopener noreferrer" aria-label="Open the public page" icon={<LuExternalLink size={16} />} h="40px" w="40px" />
          </Tooltip>
        </Flex>
      )}
      <Text fontSize="12px" color="fg.muted">
        Anyone with the link can view the plan — no login. They cannot edit, vote or comment.
      </Text>
    </Stack>
  );
}

export function TripHeaderPanel({ trip, currentUserId, isOwner, embedded = false, onSaved }: TripHeaderPanelProps) {
  const toast = useToast();
  const updateTrip = useUpdateTrip(trip.id);
  const canEdit = canEditTrip(trip, currentUserId);

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

  const dates = `${formatDayDate(trip.startDate.slice(0, 10), "d MMM yyyy")} – ${formatDayDate(trip.endDate.slice(0, 10), "d MMM yyyy")}`;

  return (
    <Box
      as="form"
      onSubmit={handleSubmit(onSubmit)}
      p={embedded ? 0 : 5}
      bg={embedded ? undefined : "bg.surface"}
      borderWidth={embedded ? 0 : "1px"}
      borderColor="border.line"
      borderRadius="xl"
    >
      <Stack spacing={4}>
        <Stack as="section" spacing="10px" aria-label="Trip details">
          <Flex justify="space-between" align="center">
            <SectionLabel>Trip details</SectionLabel>
            {!embedded && <TripActionsMenu trip={trip} isOwner={isOwner} />}
          </Flex>
          <fieldset disabled={!canEdit} style={{ display: "contents" }}>
            <FormControl>
              <FormLabel>Trip name</FormLabel>
              <Input {...register("title")} placeholder="Trip title" />
            </FormControl>
            <SimpleGrid columns={2} spacing="10px">
              <FormControl>
                <FormLabel>Dates</FormLabel>
                <Input value={dates} isReadOnly tabIndex={-1} color="fg.muted" />
                <FormHelperText fontSize="12px" color="fg.muted">
                  Change in Cities &amp; dates above
                </FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select {...register("status")}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </Select>
              </FormControl>
            </SimpleGrid>
          </fieldset>
        </Stack>

        <Divider borderColor="border.line" />

        <Stack as="section" spacing="10px" aria-label="Planning preferences">
          <SectionLabel>Planning preferences</SectionLabel>
          <fieldset disabled={!canEdit} style={{ display: "contents" }}>
            <SimpleGrid columns={2} spacing="10px">
              <FormControl>
                <FormLabel>Day starts</FormLabel>
                <Input type="time" {...register("dailyStartTime")} />
              </FormControl>
              <FormControl>
                <FormLabel>Day ends</FormLabel>
                <Input type="time" {...register("dailyEndTime")} />
              </FormControl>
              <FormControl>
                <FormLabel>Getting around</FormLabel>
                <Select {...register("transportationMode")}>
                  <option value="Walking">Walking</option>
                  <option value="Cab">Taxi / cab</option>
                  <option value="Self Drive">Self-drive</option>
                  <option value="Bike">Bike</option>
                  <option value="Public Transport">Public transport</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Pace</FormLabel>
                <Select {...register("travelStyle")}>
                  <option value="Relaxed">Relaxed</option>
                  <option value="Balanced">Balanced</option>
                  <option value="Fast Paced">Fast paced</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Budget level</FormLabel>
                <Select {...register("budgetLevel")} placeholder="Not set">
                  <option value="budget">Budget</option>
                  <option value="moderate">Moderate</option>
                  <option value="luxury">Luxury</option>
                </Select>
              </FormControl>
              <SimpleGrid columns={2} spacing="10px">
                <FormControl>
                  <FormLabel>Currency</FormLabel>
                  <Input maxLength={3} textTransform="uppercase" placeholder="INR" {...register("currency")} />
                </FormControl>
                <FormControl>
                  <FormLabel>Total budget</FormLabel>
                  <Input type="number" min={0} placeholder="Optional" {...register("budgetAmount")} />
                </FormControl>
              </SimpleGrid>
            </SimpleGrid>
            <Checkbox {...register("useFlexibleSchedule")} colorScheme="brand">
              <Text fontSize="13px">Plan by each place's best time of day</Text>
            </Checkbox>

            <FormControl>
              <FormLabel>Interests</FormLabel>
              <CheckboxGroup value={selectedInterests} onChange={(vals) => setValue("interests", vals as string[], { shouldDirty: true })}>
                <Wrap spacing={2}>
                  {INTEREST_CATEGORIES.map((interest) => (
                    <WrapItem key={interest}>
                      <Checkbox size="sm" value={interest} colorScheme="brand">
                        {interest}
                      </Checkbox>
                    </WrapItem>
                  ))}
                </Wrap>
              </CheckboxGroup>
            </FormControl>

            <FormControl>
              <FormLabel>Must-visit places</FormLabel>
              <Wrap>
                {(watch("mustVisitPlaces") ?? []).map((place) => (
                  <WrapItem key={place}>
                    <Tag size="sm">{place}</Tag>
                  </WrapItem>
                ))}
                {(watch("mustVisitPlaces") ?? []).length === 0 && (
                  <Text fontSize="12px" color="fg.muted">
                    None yet — add them from the Places tab.
                  </Text>
                )}
              </Wrap>
            </FormControl>

            <FormControl>
              <FormLabel>Excluded places</FormLabel>
              <Textarea
                size="sm"
                rows={2}
                placeholder="Places to skip (comma-separated)"
                value={excludedText}
                onChange={(e) => setValue("excludedPlaces", parseCommaSeparated(e.target.value), { shouldDirty: true })}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea size="sm" rows={2} placeholder="Additional preferences…" {...register("notes")} />
            </FormControl>
          </fieldset>
        </Stack>

        <Divider borderColor="border.line" />
        <TripMembersPanel trip={trip} currentUserId={currentUserId} />

        <Divider borderColor="border.line" />
        <PublicShare trip={trip} canEdit={canEdit} />
      </Stack>

      {isDirty && (
        <Flex
          position="sticky"
          bottom={embedded ? "-20px" : 0}
          mt={5}
          mx={embedded ? -6 : 0}
          px={embedded ? 6 : 0}
          py={3}
          bg="bg.surface"
          borderTopWidth="1px"
          borderColor="border.line"
          justify="flex-end"
          gap={2}
          zIndex={2}
        >
          <Button variant="ghost" onClick={() => reset(tripToFormValues(trip))}>
            Discard
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Save changes
          </Button>
        </Flex>
      )}
    </Box>
  );
}
