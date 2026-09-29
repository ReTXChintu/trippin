import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { PlaceSearchInput } from "@/modules/places/components/PlaceSearchInput";
import type { TripLeg, TripStay } from "@/modules/trips/types/trip-leg.types";
import { addDays, nightCount } from "@/modules/trips/utils/stay.utils";

interface StayFormModalProps {
  leg: TripLeg;
  /** The stay to edit, or a partial draft (e.g. from the hotel finder) to create. */
  initial: Partial<TripStay> | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (stay: TripStay) => void;
}

export function StayFormModal({ leg, initial, isSaving, onClose, onSave }: StayFormModalProps) {
  const [draft, setDraft] = useState<Partial<TripStay>>({});

  useEffect(() => {
    if (initial) setDraft(initial);
  }, [initial]);

  const patch = (fields: Partial<TripStay>) => setDraft((prev) => ({ ...prev, ...fields }));
  const nights =
    draft.checkInDate && draft.checkOutDate
      ? nightCount({ checkInDate: draft.checkInDate, checkOutDate: draft.checkOutDate })
      : 0;
  const isValid = Boolean(draft.name?.trim() && draft.checkInDate && draft.checkOutDate && nights > 0);
  const isEdit = Boolean(initial?.id);

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      id: draft.id ?? crypto.randomUUID(),
      name: draft.name!.trim(),
      address: draft.address,
      coordinates: draft.coordinates,
      googlePlaceId: draft.googlePlaceId,
      checkInDate: draft.checkInDate!,
      checkOutDate: draft.checkOutDate!,
      checkInTime: draft.checkInTime || undefined,
      checkOutTime: draft.checkOutTime || undefined,
      confirmationNumber: draft.confirmationNumber?.trim() || undefined,
      pricePerNight: draft.pricePerNight,
      currency: draft.currency?.trim() || undefined,
      bookingUrl: draft.bookingUrl?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
      rating: draft.rating,
    });
  };

  return (
    <Modal isOpen={Boolean(initial)} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isEdit ? "Edit stay" : "Add a stay"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <PlaceSearchInput
              label="Hotel / place to stay"
              placeholder="Search hotels, homestays, hostels…"
              mode="hotel"
              city={leg.baseCity}
              country={leg.country}
              value={draft.name ?? ""}
              onSelect={(sel) =>
                patch({
                  name: sel.name,
                  address: sel.address,
                  googlePlaceId: sel.googlePlaceId,
                  coordinates: sel.lat != null && sel.lng != null ? { lat: sel.lat, lng: sel.lng } : draft.coordinates,
                })
              }
              onClear={() => patch({ name: "", address: undefined, googlePlaceId: undefined, coordinates: undefined })}
            />
            {draft.name && !draft.coordinates && (
              <Text fontSize="xs" color="orange.500">
                Pick it from the search list so days can start and end there on the map.
              </Text>
            )}

            <SimpleGrid columns={2} spacing={3}>
              <FormControl>
                <FormLabel fontSize="sm">Check-in</FormLabel>
                <Input
                  size="sm"
                  type="date"
                  value={draft.checkInDate ?? ""}
                  min={leg.startDate}
                  max={leg.endDate}
                  onChange={(e) => {
                    const checkInDate = e.target.value;
                    patch({
                      checkInDate,
                      checkOutDate:
                        !draft.checkOutDate || draft.checkOutDate <= checkInDate ? addDays(checkInDate, 1) : draft.checkOutDate,
                    });
                  }}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Check-out</FormLabel>
                <Input
                  size="sm"
                  type="date"
                  value={draft.checkOutDate ?? ""}
                  min={draft.checkInDate ? addDays(draft.checkInDate, 1) : leg.startDate}
                  max={addDays(leg.endDate, 1)}
                  onChange={(e) => patch({ checkOutDate: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Check-in time</FormLabel>
                <Input size="sm" type="time" value={draft.checkInTime ?? ""} onChange={(e) => patch({ checkInTime: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Check-out time</FormLabel>
                <Input size="sm" type="time" value={draft.checkOutTime ?? ""} onChange={(e) => patch({ checkOutTime: e.target.value })} />
              </FormControl>
            </SimpleGrid>
            {nights > 0 && (
              <Text fontSize="xs" color="fg.muted" mt={-2}>
                {nights} night{nights === 1 ? "" : "s"}
              </Text>
            )}

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
              <FormControl gridColumn={{ md: "span 2" }}>
                <FormLabel fontSize="sm">Confirmation number</FormLabel>
                <Input size="sm" value={draft.confirmationNumber ?? ""} onChange={(e) => patch({ confirmationNumber: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Price / night</FormLabel>
                <Input
                  size="sm"
                  type="number"
                  min={0}
                  value={draft.pricePerNight ?? ""}
                  onChange={(e) => patch({ pricePerNight: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </FormControl>
            </SimpleGrid>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
              <FormControl>
                <FormLabel fontSize="sm">Currency</FormLabel>
                <Input size="sm" placeholder="INR" value={draft.currency ?? ""} onChange={(e) => patch({ currency: e.target.value.toUpperCase() })} />
              </FormControl>
              <FormControl gridColumn={{ md: "span 2" }}>
                <FormLabel fontSize="sm">Booking link</FormLabel>
                <Input size="sm" placeholder="https://" value={draft.bookingUrl ?? ""} onChange={(e) => patch({ bookingUrl: e.target.value })} />
              </FormControl>
            </SimpleGrid>
            <FormControl>
              <FormLabel fontSize="sm">Notes</FormLabel>
              <Textarea size="sm" rows={2} value={draft.notes ?? ""} onChange={(e) => patch({ notes: e.target.value })} placeholder="Breakfast included, early check-in requested…" />
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={2} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="brand" onClick={handleSave} isDisabled={!isValid} isLoading={isSaving}>
            {isEdit ? "Save" : "Add stay"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
