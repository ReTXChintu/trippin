import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
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
  Tag,
  TagCloseButton,
  Wrap,
  WrapItem,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { PlaceSearchInput } from "@/modules/places/components/PlaceSearchInput";
import { useUpdateTrip } from "@/modules/trips/hooks/useTrips";
import { tripToFormValues } from "@/modules/trips/utils/trip-form.utils";
import { createEmptyLeg } from "@/modules/trips/utils/trip-leg.utils";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";

interface AddLegModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onAdded: (legId: string) => void;
}

function buildInitialDraft(trip: Trip): TripLeg {
  const sortedLegs = [...trip.legs].sort((a, b) => a.order - b.order);
  const lastLeg = sortedLegs[sortedLegs.length - 1];
  return {
    ...createEmptyLeg(sortedLegs.length, lastLeg?.country ?? trip.destinationCountry),
    name: `Leg ${sortedLegs.length + 1}`,
    startDate: lastLeg?.endDate ?? trip.startDate.slice(0, 10),
    endDate: lastLeg?.endDate ?? trip.endDate.slice(0, 10),
  };
}

export function AddLegModal({ isOpen, onClose, trip, onAdded }: AddLegModalProps) {
  const toast = useToast();
  const updateTrip = useUpdateTrip(trip.id);
  const [draft, setDraft] = useState<TripLeg>(() => buildInitialDraft(trip));
  const [dayTripAreaInput, setDayTripAreaInput] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraft(buildInitialDraft(trip));
      setDayTripAreaInput("");
      setAttempted(false);
    }
    // Only reset when the modal transitions open — not on every trip refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const patch = (fields: Partial<TripLeg>) => setDraft((prev) => ({ ...prev, ...fields }));

  const nameError = !draft.name.trim();
  const baseCityError = draft.baseCity.trim().length < 2;
  const countryError = draft.country.trim().length < 2;
  const datesError = !draft.startDate || !draft.endDate || draft.endDate < draft.startDate;
  const hasErrors = nameError || baseCityError || countryError || datesError;

  const addDayTripArea = () => {
    const area = dayTripAreaInput.trim();
    if (area && !draft.dayTripAreas.includes(area)) {
      patch({ dayTripAreas: [...draft.dayTripAreas, area] });
    }
    setDayTripAreaInput("");
  };

  const handleSubmit = async () => {
    setAttempted(true);
    if (hasErrors) return;

    const nextLegs = [...trip.legs, draft];
    try {
      await updateTrip.mutateAsync({ ...tripToFormValues(trip), legs: nextLegs });
      toast({ title: "Leg added", status: "success", duration: 2000 });
      onAdded(draft.id);
      onClose();
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add a new leg</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={5}>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired isInvalid={attempted && nameError}>
                <FormLabel fontSize="sm">Leg Name</FormLabel>
                <Input size="sm" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
              </FormControl>
              <FormControl isRequired isInvalid={attempted && baseCityError}>
                <FormLabel fontSize="sm">Base City</FormLabel>
                <Input
                  size="sm"
                  value={draft.baseCity}
                  onChange={(e) => patch({ baseCity: e.target.value })}
                  placeholder="e.g. Udaipur"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">State</FormLabel>
                <Input size="sm" value={draft.state ?? ""} onChange={(e) => patch({ state: e.target.value })} />
              </FormControl>
              <FormControl isRequired isInvalid={attempted && countryError}>
                <FormLabel fontSize="sm">Country</FormLabel>
                <Input size="sm" value={draft.country} onChange={(e) => patch({ country: e.target.value })} />
              </FormControl>
              <FormControl isRequired isInvalid={attempted && datesError}>
                <FormLabel fontSize="sm">Start Date</FormLabel>
                <Input
                  size="sm"
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => patch({ startDate: e.target.value })}
                />
              </FormControl>
              <FormControl isRequired isInvalid={attempted && datesError}>
                <FormLabel fontSize="sm">End Date</FormLabel>
                <Input
                  size="sm"
                  type="date"
                  value={draft.endDate}
                  onChange={(e) => patch({ endDate: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Arrival Time</FormLabel>
                <Input
                  size="sm"
                  type="time"
                  value={draft.arrivalTime ?? ""}
                  onChange={(e) => patch({ arrivalTime: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">Departure Time</FormLabel>
                <Input
                  size="sm"
                  type="time"
                  value={draft.departureTime ?? ""}
                  onChange={(e) => patch({ departureTime: e.target.value })}
                />
              </FormControl>
            </SimpleGrid>

            <Box>
              <PlaceSearchInput
                label="Hotel / Stay (optional)"
                placeholder="Search hotels..."
                mode="hotel"
                city={draft.baseCity}
                country={draft.country || trip.destinationCountry}
                value={draft.hotelName ?? ""}
                onSelect={(sel) =>
                  patch({
                    hotelName: sel.name,
                    hotelAddress: sel.address,
                    hotelCoordinates:
                      sel.lat != null && sel.lng != null ? { lat: sel.lat, lng: sel.lng } : draft.hotelCoordinates,
                  })
                }
                onClear={() => patch({ hotelName: undefined, hotelAddress: undefined, hotelCoordinates: undefined })}
              />
            </Box>

            <FormControl>
              <FormLabel fontSize="sm">Day-trip areas (optional)</FormLabel>
              <HStack>
                <Input
                  size="sm"
                  value={dayTripAreaInput}
                  onChange={(e) => setDayTripAreaInput(e.target.value)}
                  placeholder="e.g. Pushkar"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDayTripArea();
                    }
                  }}
                />
                <Button size="sm" onClick={addDayTripArea}>
                  Add
                </Button>
              </HStack>
              <Wrap mt={2}>
                {draft.dayTripAreas.map((area) => (
                  <WrapItem key={area}>
                    <Tag size="sm">
                      {area}
                      <TagCloseButton
                        onClick={() => patch({ dayTripAreas: draft.dayTripAreas.filter((a) => a !== area) })}
                      />
                    </Tag>
                  </WrapItem>
                ))}
              </Wrap>
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="brand" onClick={handleSubmit} isLoading={updateTrip.isPending}>
            Add Leg
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
