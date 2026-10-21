import {
  Button,
  ButtonGroup,
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
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { useAddStop } from "@/modules/itinerary/hooks/useItinerary";
import type { ItineraryDay } from "@/modules/itinerary/types";
import { formatDayDate, formatDuration } from "@/modules/itinerary/utils/plan.utils";
import { PlaceSearchInput, type PlaceSelection } from "@/modules/places/components/PlaceSearchInput";

const DURATIONS = [30, 45, 60, 90, 120, 150, 180, 240];

interface AddStopModalProps {
  tripId: string;
  day: ItineraryDay | null;
  city?: string;
  country?: string;
  onClose: () => void;
}

export function AddStopModal({ tripId, day, city, country, onClose }: AddStopModalProps) {
  const toast = useToast();
  const addStop = useAddStop(tripId);

  const [kind, setKind] = useState<"place" | "custom">("place");
  const [place, setPlace] = useState<PlaceSelection | null>(null);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(60);
  const [isFixed, setIsFixed] = useState(false);
  const [fixedTime, setFixedTime] = useState("18:00");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!day) return;
    setKind("place");
    setPlace(null);
    setName("");
    setDuration(60);
    setIsFixed(false);
    setNotes("");
  }, [day]);

  const canSubmit = kind === "place" ? Boolean(place) : name.trim().length > 0;

  const handleAdd = async () => {
    if (!day || !canSubmit) return;
    try {
      await addStop.mutateAsync({
        dayNumber: day.dayNumber,
        placeId: kind === "place" ? place!.googlePlaceId : undefined,
        name: kind === "custom" ? name.trim() : undefined,
        durationMinutes: duration,
        fixedStartTime: isFixed ? fixedTime : undefined,
        notes: notes.trim() || undefined,
      });
      toast({ title: `Added to Day ${day.dayNumber}`, status: "success", duration: 2500 });
      onClose();
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Modal isOpen={Boolean(day)} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Add to Day {day?.dayNumber}
          <Text fontSize="sm" fontWeight="normal" color="tx3">
            {day && formatDayDate(day.date, "EEEE, d MMM")}
            {day?.legName ? ` · ${day.legName}` : ""}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={5}>
            <ButtonGroup size="sm" isAttached variant="outline" w="full">
              <Button flex={1} colorScheme={kind === "place" ? "brand" : "gray"} variant={kind === "place" ? "solid" : "outline"} onClick={() => setKind("place")}>
                A place
              </Button>
              <Button flex={1} colorScheme={kind === "custom" ? "brand" : "gray"} variant={kind === "custom" ? "solid" : "outline"} onClick={() => setKind("custom")}>
                Something else
              </Button>
            </ButtonGroup>

            {kind === "place" ? (
              <PlaceSearchInput
                label="Search for a place"
                placeholder="Museum, viewpoint, café, market…"
                mode="place"
                city={city}
                country={country}
                value={place?.name ?? ""}
                onSelect={setPlace}
                onClear={() => setPlace(null)}
              />
            ) : (
              <FormControl>
                <FormLabel fontSize="sm">What is it?</FormLabel>
                <Input
                  size="sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Cooking class, spa, rest at hotel, laundry…"
                />
              </FormControl>
            )}

            <HStack align="start" spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">Duration</FormLabel>
                <Select size="sm" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {formatDuration(d)}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <HStack justify="space-between" mb={2}>
                  <FormLabel fontSize="sm" mb={0}>
                    At a set time
                  </FormLabel>
                  <Switch size="sm" isChecked={isFixed} onChange={(e) => setIsFixed(e.target.checked)} colorScheme="brand" />
                </HStack>
                <Input size="sm" type="time" value={fixedTime} isDisabled={!isFixed} onChange={(e) => setFixedTime(e.target.value)} />
              </FormControl>
            </HStack>

            <FormControl>
              <FormLabel fontSize="sm">Notes (optional)</FormLabel>
              <Textarea size="sm" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormControl>

            <Text fontSize="xs" color="tx3">
              {isFixed
                ? "The day will be planned around this time."
                : "It goes where it adds the least travel — drag it anywhere afterwards."}
            </Text>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={2} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="brand" onClick={handleAdd} isDisabled={!canSubmit} isLoading={addStop.isPending}>
            Add to day
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
