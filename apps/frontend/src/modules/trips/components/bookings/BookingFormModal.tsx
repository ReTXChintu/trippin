import {
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { type FormEvent, useEffect, useState } from "react";
import { FiInfo } from "react-icons/fi";
import { ChoiceChip, Pill, SurfaceCard } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api";
import { useSaveBooking } from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";
import { BOOKING_TYPES, TRANSPORT_BOOKING_TYPES, type TripBooking } from "@/modules/trips/types/trip-extras.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import { COMMON_CURRENCIES } from "@/modules/trips/utils/money";
import { BOOKING_META, tripDayNumber } from "./bookingMeta";

function useBookingDraft(trip: Trip, initial: Partial<TripBooking> | null) {
  const [draft, setDraft] = useState<Partial<TripBooking>>({});
  useEffect(() => {
    if (initial) setDraft({ type: "flight", currency: trip.currency, startDate: trip.startDate.slice(0, 10), ...initial });
  }, [initial, trip.currency, trip.startDate]);
  return [draft, setDraft] as const;
}

interface BookingFieldsProps {
  trip: Trip;
  draft: Partial<TripBooking>;
  patch: (fields: Partial<TripBooking>) => void;
}

function BookingFields({ trip, draft, patch }: BookingFieldsProps) {
  const type = draft.type ?? "flight";
  const isTransport = TRANSPORT_BOOKING_TYPES.includes(type);
  const legs = getEffectiveLegs(trip);
  const legName = (id: string) => legs.find((l) => l.id === id)?.baseCity ?? "";
  const linkedDay = draft.transferId && draft.startDate ? tripDayNumber(trip, draft.startDate) : undefined;

  return (
    <Stack spacing={3}>
      <FormControl as="fieldset">
        <FormLabel as="legend">Type</FormLabel>
        <Flex gap="6px" flexWrap="wrap">
          {BOOKING_TYPES.map((t) => (
            <ChoiceChip key={t} selected={type === t} icon={BOOKING_META[t].icon} onClick={() => patch({ type: t })}>
              {BOOKING_META[t].label}
            </ChoiceChip>
          ))}
        </Flex>
      </FormControl>

      <FormControl isRequired>
        <FormLabel>Name</FormLabel>
        <Input value={draft.title ?? ""} onChange={(e) => patch({ title: e.target.value })} placeholder={isTransport ? "IndiGo 6E-512 to Udaipur" : "Old city walking tour"} />
      </FormControl>

      {isTransport && (
        <SimpleGrid columns={2} spacing={3}>
          <FormControl>
            <FormLabel>From</FormLabel>
            <Input value={draft.fromPlace ?? ""} onChange={(e) => patch({ fromPlace: e.target.value })} placeholder="Jaipur (JAI)" />
          </FormControl>
          <FormControl>
            <FormLabel>To</FormLabel>
            <Input value={draft.toPlace ?? ""} onChange={(e) => patch({ toPlace: e.target.value })} placeholder="Udaipur (UDR)" />
          </FormControl>
        </SimpleGrid>
      )}

      <SimpleGrid columns={2} spacing={3}>
        <FormControl isRequired>
          <FormLabel>{isTransport ? "Departs" : "Date"}</FormLabel>
          <Input type="date" value={draft.startDate ?? ""} onChange={(e) => patch({ startDate: e.target.value })} />
        </FormControl>
        <FormControl>
          <FormLabel>{isTransport ? "Departure time" : "Start time"}</FormLabel>
          <Input type="time" value={draft.startTime ?? ""} onChange={(e) => patch({ startTime: e.target.value })} />
        </FormControl>
        <FormControl>
          <FormLabel>{isTransport ? "Arrives (if a different day)" : "End date"}</FormLabel>
          <Input type="date" value={draft.endDate ?? ""} min={draft.startDate} onChange={(e) => patch({ endDate: e.target.value })} />
        </FormControl>
        <FormControl>
          <FormLabel>{isTransport ? "Arrival time" : "End time"}</FormLabel>
          <Input type="time" value={draft.endTime ?? ""} onChange={(e) => patch({ endTime: e.target.value })} />
        </FormControl>
      </SimpleGrid>

      {isTransport && trip.transfers.length > 0 && (
        <FormControl>
          <FormLabel>Is this your move between cities?</FormLabel>
          <Select value={draft.transferId ?? ""} onChange={(e) => patch({ transferId: e.target.value || undefined })}>
            <option value="">No — just a booking</option>
            {trip.transfers.map((t) => (
              <option key={t.id} value={t.id}>
                {legName(t.fromLegId)} → {legName(t.toLegId)} ({t.date})
              </option>
            ))}
          </Select>
          <FormHelperText fontSize="12px" color="tx3">
            Linked bookings set that travel day&rsquo;s times — sightseeing starts after you arrive.
          </FormHelperText>
        </FormControl>
      )}

      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
        <FormControl>
          <FormLabel>Price</FormLabel>
          <Input type="number" min={0} value={draft.cost ?? ""} onChange={(e) => patch({ cost: e.target.value === "" ? undefined : Number(e.target.value) })} />
        </FormControl>
        <FormControl>
          <FormLabel>Currency</FormLabel>
          <Select value={draft.currency ?? trip.currency} onChange={(e) => patch({ currency: e.target.value })}>
            {[...new Set([trip.currency, ...COMMON_CURRENCIES])].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl gridColumn={{ base: "span 2", md: "auto" }}>
          <FormLabel>Confirmation</FormLabel>
          <Input value={draft.confirmationNumber ?? ""} onChange={(e) => patch({ confirmationNumber: e.target.value })} placeholder="—" />
        </FormControl>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <FormControl>
          <FormLabel>Provider</FormLabel>
          <Input value={draft.provider ?? ""} onChange={(e) => patch({ provider: e.target.value })} placeholder="IndiGo, IRCTC, GetYourGuide…" />
        </FormControl>
        <FormControl>
          <FormLabel>Link</FormLabel>
          <Input value={draft.url ?? ""} onChange={(e) => patch({ url: e.target.value })} placeholder="https://" />
        </FormControl>
      </SimpleGrid>

      <FormControl>
        <FormLabel>Notes</FormLabel>
        <Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => patch({ notes: e.target.value })} placeholder="Seat 14C, meeting point, baggage allowance…" />
      </FormControl>

      {linkedDay && (
        <HStack spacing="6px" fontSize="12px" color="tx3">
          <Icon as={FiInfo} />
          <Text>Saving links this booking to Day {linkedDay} and sets its times in the plan.</Text>
        </HStack>
      )}
    </Stack>
  );
}

function useSubmitBooking(trip: Trip, draft: Partial<TripBooking>, onSaved: () => void) {
  const toast = useToast();
  const save = useSaveBooking(trip.id);
  const type = draft.type ?? "flight";
  const isTransport = TRANSPORT_BOOKING_TYPES.includes(type);
  const valid = Boolean(draft.title?.trim() && draft.startDate);

  const submit = async () => {
    if (!valid) return;
    try {
      await save.mutateAsync({
        id: draft.id,
        type,
        title: draft.title!.trim(),
        provider: draft.provider || undefined,
        confirmationNumber: draft.confirmationNumber || undefined,
        startDate: draft.startDate!,
        startTime: draft.startTime || undefined,
        endDate: draft.endDate || undefined,
        endTime: draft.endTime || undefined,
        fromPlace: isTransport ? draft.fromPlace || undefined : undefined,
        toPlace: isTransport ? draft.toPlace || undefined : undefined,
        transferId: isTransport ? draft.transferId || undefined : undefined,
        cost: draft.cost,
        currency: draft.currency || trip.currency,
        url: draft.url || undefined,
        notes: draft.notes || undefined,
      });
      toast({
        title: draft.id ? "Booking updated" : "Booking added",
        description: draft.transferId && draft.startTime ? "The travel day now follows these times." : undefined,
        status: "success",
        duration: 3000,
      });
      onSaved();
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };
  return { submit, valid, isSaving: save.isPending };
}

/** The booking form as an inline card (desktop Bookings tab, right pane). */
export function BookingFormCard({ trip, initial, onDone, onCancel }: { trip: Trip; initial: Partial<TripBooking>; onDone: () => void; onCancel?: () => void }) {
  const [draft, setDraft] = useBookingDraft(trip, initial);
  const patch = (fields: Partial<TripBooking>) => setDraft((prev) => ({ ...prev, ...fields }));
  const { submit, valid, isSaving } = useSubmitBooking(trip, draft, onDone);
  const prefilled = !initial.id && Boolean(initial.transferId);

  return (
    <SurfaceCard raised p={5} as="form" onSubmit={(e: FormEvent) => { e.preventDefault(); void submit(); }} aria-label={draft.id ? "Edit booking" : "New booking"}>
      <Stack spacing={3}>
        <Flex justify="space-between" align="center" gap={2} flexWrap="wrap">
          <Text as="h3" fontWeight={600} fontSize="17px" lineHeight="24px">
            {draft.id ? "Edit booking" : "New booking"}
          </Text>
          {prefilled && <Pill tone="accent">Prefilled from travel day</Pill>}
        </Flex>
        <BookingFields trip={trip} draft={draft} patch={patch} />
        <HStack spacing={2} pt={1}>
          <Button type="submit" isDisabled={!valid} isLoading={isSaving}>
            {draft.id ? "Save changes" : "Save booking"}
          </Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </HStack>
      </Stack>
    </SurfaceCard>
  );
}

interface BookingFormModalProps {
  trip: Trip;
  /** The booking to edit, or a partial draft for a new one. Null = closed. */
  initial: Partial<TripBooking> | null;
  onClose: () => void;
}

export function BookingFormModal({ trip, initial, onClose }: BookingFormModalProps) {
  const [draft, setDraft] = useBookingDraft(trip, initial);
  const patch = (fields: Partial<TripBooking>) => setDraft((prev) => ({ ...prev, ...fields }));
  const { submit, valid, isSaving } = useSubmitBooking(trip, draft, onClose);

  return (
    <Modal isOpen={Boolean(initial)} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent mx={{ base: 3, md: "auto" }}>
        <ModalHeader>{draft.id ? "Edit booking" : "New booking"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {!draft.id && initial?.transferId && (
            <Pill tone="accent" mb={3}>
              Prefilled from travel day
            </Pill>
          )}
          <BookingFields trip={trip} draft={draft} patch={patch} />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={2} onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} isDisabled={!valid} isLoading={isSaving}>
            {draft.id ? "Save changes" : "Save booking"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
