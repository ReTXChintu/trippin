import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  SimpleGrid,
  Stack,
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/api";
import { DayTripsEditor } from "@/modules/trips/components/workspace/DayTripsEditor";
import { useDeleteTripLeg, useUpdateTrip } from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import { tripToFormValues } from "@/modules/trips/utils/trip-form.utils";

interface LegOverviewPanelProps {
  trip: Trip;
  leg: TripLeg;
}

export function LegOverviewPanel({ trip, leg }: LegOverviewPanelProps) {
  const toast = useToast();
  const updateTrip = useUpdateTrip(trip.id);
  const deleteTripLeg = useDeleteTripLeg(trip.id);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isDeleting, setIsDeleting] = useState(false);

  const [draft, setDraft] = useState<TripLeg>(leg);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setDraft(leg);
    setIsDirty(false);
  }, [leg]);

  const patch = (fields: Partial<TripLeg>) => {
    setDraft((prev) => ({ ...prev, ...fields }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    const nextLegs = trip.legs.map((l) => (l.id === leg.id ? draft : l));
    const payload = { ...tripToFormValues(trip), legs: nextLegs };
    try {
      await updateTrip.mutateAsync(payload);
      toast({ title: "City updated", status: "success", duration: 2000 });
      setIsDirty(false);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTripLeg.mutateAsync(leg.id);
      toast({ title: "City removed", status: "success" });
      onClose();
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    } finally {
      setIsDeleting(false);
    }
  };


  const canDelete = trip.legs.length > 1;

  return (
    <Stack spacing={5}>
      {isDirty && (
        <HStack>
          <Button size="sm" colorScheme="brand" onClick={handleSave} isLoading={updateTrip.isPending}>
            Save changes
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(leg)}>
            Discard
          </Button>
        </HStack>
      )}

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl>
          <FormLabel fontSize="sm">Name</FormLabel>
          <Input size="sm" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Base City</FormLabel>
          <Input size="sm" value={draft.baseCity} onChange={(e) => patch({ baseCity: e.target.value })} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">State</FormLabel>
          <Input size="sm" value={draft.state ?? ""} onChange={(e) => patch({ state: e.target.value })} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Country</FormLabel>
          <Input size="sm" value={draft.country} onChange={(e) => patch({ country: e.target.value })} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Start Date</FormLabel>
          <Input size="sm" type="date" value={draft.startDate} onChange={(e) => patch({ startDate: e.target.value })} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">End Date</FormLabel>
          <Input size="sm" type="date" value={draft.endDate} onChange={(e) => patch({ endDate: e.target.value })} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Arrival Time</FormLabel>
          <Input size="sm" type="time" value={draft.arrivalTime ?? ""} onChange={(e) => patch({ arrivalTime: e.target.value })} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Departure Time</FormLabel>
          <Input size="sm" type="time" value={draft.departureTime ?? ""} onChange={(e) => patch({ departureTime: e.target.value })} />
        </FormControl>
      </SimpleGrid>


      <FormControl as="fieldset">
        <FormLabel as="legend" fontSize="sm">
          Day trips from {draft.baseCity || "here"}
        </FormLabel>
        <DayTripsEditor
          value={draft.dayTrips?.length ? draft.dayTrips : draft.dayTripAreas.map((name, i) => ({ id: `area-${i}`, name }))}
          onChange={(next) => patch({ dayTrips: next, dayTripAreas: next.map((d) => d.name).filter(Boolean) })}
          startDate={draft.startDate}
          endDate={draft.endDate}
          country={draft.country}
        />
      </FormControl>

      <Box pt={4} borderTopWidth="1px">
        <Button size="sm" colorScheme="red" variant="outline" leftIcon={<FiTrash2 />} onClick={onOpen} isDisabled={!canDelete}>
          Remove this city from the trip
        </Button>
        {!canDelete && (
          <Text fontSize="xs" color="tx3" mt={1}>
            This is the only city. Add another one first, or delete the whole trip instead.
          </Text>
        )}
      </Box>

      <ConfirmDialog
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={handleDelete}
        title="Remove city"
        description={`This removes "${leg.name || leg.baseCity}" and its days from the plan. This cannot be undone.`}
        confirmLabel="Remove city"
        isLoading={isDeleting}
        isDestructive
      />
    </Stack>
  );
}
