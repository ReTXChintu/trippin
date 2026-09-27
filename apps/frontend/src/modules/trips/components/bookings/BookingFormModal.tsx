import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
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
  Textarea,
  Wrap,
  WrapItem,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { useSaveBooking } from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";
import {
  BOOKING_TYPES,
  TRANSPORT_BOOKING_TYPES,
  type TripBooking,
} from "@/modules/trips/types/trip-extras.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import { COMMON_CURRENCIES } from "@/modules/trips/utils/money";
import { BOOKING_META } from "./bookingMeta";

interface BookingFormModalProps {
  trip: Trip;
  /** The booking to edit, or a partial draft for a new one. Null = closed. */
  initial: Partial<TripBooking> | null;
  onClose: () => void;
}

export function BookingFormModal({ trip, initial, onClose }: BookingFormModalProps) {
  const toast = useToast();
  const save = useSaveBooking(trip.id);
  const [draft, setDraft] = useState<Partial<TripBooking>>({});

  useEffect(() => {
    if (initial) setDraft({ type: "flight", currency: trip.currency, startDate: trip.startDate.slice(0, 10), ...initial });
  }, [initial, trip.currency, trip.startDate]);

  const patch = (fields: Partial<TripBooking>) => setDraft((prev) => ({ ...prev, ...fields }));
  const type = draft.type ?? "flight";
  const isTransport = TRANSPORT_BOOKING_TYPES.includes(type);
  const legs = getEffectiveLegs(trip);
  const legName = (id: string) => legs.find((l) => l.id === id)?.baseCity ?? "";
  const valid = Boolean(draft.title?.trim() && draft.startDate);

  const handleSave = async () => {
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
      onClose();
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Modal isOpen={Boolean(initial)} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{draft.id ? "Edit booking" : "Add a booking"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={5}>
            <Wrap spacing={2}>
              {BOOKING_TYPES.map((t) => (
                <WrapItem key={t}>
                  <Button
                    size="sm"
                    leftIcon={<Icon as={BOOKING_META[t].icon} />}
                    variant={type === t ? "solid" : "outline"}
                    colorScheme={type === t ? "brand" : "gray"}
                    onClick={() => patch({ type: t })}
                  >
                    {BOOKING_META[t].label}
                  </Button>
                </WrapItem>
              ))}
            </Wrap>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              <FormControl isRequired gridColumn={{ md: "span 2" }}>
                <FormLabel fontSize="sm">Name</FormLabel>
                <Input
                  size="sm"
                  value={draft.title ?? ""}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder={isTransport ? "IndiGo 6E-512 to Udaipur" : "Old city walking tour"}
                />
              </FormControl>
              {isTransport && (
                <>
                  <FormControl>
                    <FormLabel fontSize="sm">From</FormLabel>
                    <Input size="sm" value={draft.fromPlace ?? ""} onChange={(e) => patch({ fromPlace: e.target.value })} placeholder="Jaipur (JAI)" />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">To</FormLabel>
                    <Input size="sm" value={draft.toPlace ?? ""} onChange={(e) => patch({ toPlace: e.target.value })} placeholder="Udaipur (UDR)" />
                  </FormControl>
                </>
              )}
              <FormControl isRequired>
                <FormLabel fontSize="sm">{isTransport ? "Departs" : "Date"}</FormLabel>
                <Input size="sm" type="date" value={draft.startDate ?? ""} onChange={(e) => patch({ startDate: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">{isTransport ? "Departure time" : "Start time"}</FormLabel>
                <Input size="sm" type="time" value={draft.startTime ?? ""} onChange={(e) => patch({ startTime: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">{isTransport ? "Arrives (if a different day)" : "End date"}</FormLabel>
                <Input size="sm" type="date" value={draft.endDate ?? ""} min={draft.startDate} onChange={(e) => patch({ endDate: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">{isTransport ? "Arrival time" : "End time"}</FormLabel>
                <Input size="sm" type="time" value={draft.endTime ?? ""} onChange={(e) => patch({ endTime: e.target.value })} />
              </FormControl>
            </SimpleGrid>

            {isTransport && trip.transfers.length > 0 && (
              <FormControl>
                <FormLabel fontSize="sm">Is this your move between cities?</FormLabel>
                <Select
                  size="sm"
                  value={draft.transferId ?? ""}
                  onChange={(e) => patch({ transferId: e.target.value || undefined })}
                >
                  <option value="">No — just a booking</option>
                  {trip.transfers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {legName(t.fromLegId)} → {legName(t.toLegId)} ({t.date})
                    </option>
                  ))}
                </Select>
                <FormHelperText fontSize="xs">
                  Linked bookings set that travel day's times — sightseeing starts after you arrive.
                </FormHelperText>
              </FormControl>
            )}

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
              <FormControl>
                <FormLabel fontSize="sm">Provider</FormLabel>
                <Input size="sm" value={draft.provider ?? ""} onChange={(e) => patch({ provider: e.target.value })} placeholder="IndiGo, IRCTC, GetYourGuide…" />
              </FormControl>
              <FormControl gridColumn={{ md: "span 2" }}>
                <FormLabel fontSize="sm">Confirmation / PNR</FormLabel>
                <Input size="sm" value={draft.confirmationNumber ?? ""} onChange={(e) => patch({ confirmationNumber: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Cost</FormLabel>
                <Input
                  size="sm"
                  type="number"
                  min={0}
                  value={draft.cost ?? ""}
                  onChange={(e) => patch({ cost: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Currency</FormLabel>
                <Select size="sm" value={draft.currency ?? trip.currency} onChange={(e) => patch({ currency: e.target.value })}>
                  {[...new Set([trip.currency, ...COMMON_CURRENCIES])].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Link</FormLabel>
                <Input size="sm" value={draft.url ?? ""} onChange={(e) => patch({ url: e.target.value })} placeholder="https://" />
              </FormControl>
            </SimpleGrid>

            <FormControl>
              <FormLabel fontSize="sm">Notes</FormLabel>
              <Textarea size="sm" rows={2} value={draft.notes ?? ""} onChange={(e) => patch({ notes: e.target.value })} placeholder="Seat 14C, meeting point, baggage allowance…" />
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={2} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="brand" onClick={handleSave} isDisabled={!valid} isLoading={save.isPending}>
            {draft.id ? "Save" : "Add booking"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
