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
  Text,
  Wrap,
  WrapItem,
  Collapse,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { addDays, format, parseISO } from "date-fns";
import { FiChevronDown } from "react-icons/fi";
import { CityInput } from "@/modules/trips/components/create/CityInput";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { PlaceSearchInput } from "@/modules/places/components/PlaceSearchInput";
import { useUpdateTrip } from "@/modules/trips/hooks/useTrips";
import { tripToFormValues } from "@/modules/trips/utils/trip-form.utils";
import {
  createEmptyLeg,
  newTripLegId,
} from "@/modules/trips/utils/trip-leg.utils";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";

interface AddLegModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onAdded: (legId: string) => void;
}

function lastLegOf(trip: Trip): TripLeg | undefined {
  const sorted = [...trip.legs].sort((a, b) => a.order - b.order);
  return sorted[sorted.length - 1];
}

function buildInitialDraft(trip: Trip): TripLeg {
  const lastLeg = lastLegOf(trip);
  // The new city starts the day after the current last one, for three days by default.
  const start = format(
    addDays(parseISO(lastLeg?.endDate ?? trip.endDate.slice(0, 10)), 1),
    "yyyy-MM-dd",
  );
  return {
    ...createEmptyLeg(
      trip.legs.length,
      lastLeg?.country ?? trip.destinationCountry,
    ),
    startDate: start,
    endDate: format(addDays(parseISO(start), 2), "yyyy-MM-dd"),
  };
}

export function AddLegModal({
  isOpen,
  onClose,
  trip,
  onAdded,
}: AddLegModalProps) {
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

  const patch = (fields: Partial<TripLeg>) =>
    setDraft((prev) => ({ ...prev, ...fields }));

  const more = useDisclosure();
  const baseCityError = draft.baseCity.trim().length < 2;
  const countryError = draft.country.trim().length < 2;
  const datesError =
    !draft.startDate || !draft.endDate || draft.endDate < draft.startDate;
  const hasErrors = baseCityError || countryError || datesError;

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

    const leg = { ...draft, name: draft.name.trim() || draft.baseCity.trim() };
    const lastLeg = lastLegOf(trip);
    const values = tripToFormValues(trip);
    // Moving on from the previous city happens on the new city's first day.
    const transfers =
      lastLeg && leg.startDate > lastLeg.endDate
        ? [
            ...(values.transfers ?? []),
            {
              id: newTripLegId(),
              date: leg.startDate,
              fromLegId: lastLeg.id,
              toLegId: leg.id,
              label: `Travel from ${lastLeg.baseCity} to ${leg.baseCity}`,
            },
          ]
        : values.transfers;
    try {
      await updateTrip.mutateAsync({
        ...values,
        legs: [...trip.legs, leg],
        transfers,
      });
      toast({
        title: `${leg.baseCity} added`,
        status: "success",
        duration: 2000,
      });
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
        <ModalHeader>Add a city</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={5}>
            <FormControl
              isRequired
              isInvalid={attempted && (baseCityError || countryError)}
            >
              <FormLabel fontSize="sm">City</FormLabel>
              <CityInput
                value={{
                  city: draft.baseCity,
                  state: draft.state,
                  country: draft.country,
                }}
                onChange={(v) =>
                  patch({
                    baseCity: v.city,
                    name: v.city,
                    state: v.state,
                    country: v.country,
                  })
                }
                isInvalid={attempted && baseCityError}
                placeholder="e.g. Udaipur"
                autoFocus
              />
              {draft.baseCity.trim().length >= 2 && !draft.country.trim() && (
                <Input
                  mt={2}
                  size="sm"
                  placeholder="Country"
                  value={draft.country}
                  onChange={(e) => patch({ country: e.target.value })}
                />
              )}
              {draft.country && (
                <Text fontSize="xs" color="tx3" mt={1}>
                  {[draft.state, draft.country].filter(Boolean).join(", ")}
                </Text>
              )}
            </FormControl>
            <SimpleGrid columns={2} spacing={4}>
              <FormControl isRequired isInvalid={attempted && datesError}>
                <FormLabel fontSize="sm">From</FormLabel>
                <Input
                  size="sm"
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => patch({ startDate: e.target.value })}
                />
              </FormControl>
              <FormControl isRequired isInvalid={attempted && datesError}>
                <FormLabel fontSize="sm">To</FormLabel>
                <Input
                  size="sm"
                  type="date"
                  value={draft.endDate}
                  onChange={(e) => patch({ endDate: e.target.value })}
                />
              </FormControl>
            </SimpleGrid>

            <Button
              size="sm"
              variant="ghost"
              alignSelf="flex-start"
              onClick={more.onToggle}
              rightIcon={
                <FiChevronDown
                  style={{
                    transform: more.isOpen ? "rotate(180deg)" : undefined,
                  }}
                />
              }
            >
              Times, day trips, hotel
            </Button>
            <Collapse in={more.isOpen} animateOpacity>
              <Stack spacing={5}>
                <SimpleGrid columns={2} spacing={4}>
                  <FormControl>
                    <FormLabel fontSize="sm">Arriving at</FormLabel>
                    <Input
                      size="sm"
                      type="time"
                      value={draft.arrivalTime ?? ""}
                      onChange={(e) =>
                        patch({ arrivalTime: e.target.value || undefined })
                      }
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Leaving at</FormLabel>
                    <Input
                      size="sm"
                      type="time"
                      value={draft.departureTime ?? ""}
                      onChange={(e) =>
                        patch({ departureTime: e.target.value || undefined })
                      }
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
                          sel.lat != null && sel.lng != null
                            ? { lat: sel.lat, lng: sel.lng }
                            : draft.hotelCoordinates,
                      })
                    }
                    onClear={() =>
                      patch({
                        hotelName: undefined,
                        hotelAddress: undefined,
                        hotelCoordinates: undefined,
                      })
                    }
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
                            onClick={() =>
                              patch({
                                dayTripAreas: draft.dayTripAreas.filter(
                                  (a) => a !== area,
                                ),
                              })
                            }
                          />
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                </FormControl>
              </Stack>
            </Collapse>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="brand"
            onClick={handleSubmit}
            isLoading={updateTrip.isPending}
          >
            Add city
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
