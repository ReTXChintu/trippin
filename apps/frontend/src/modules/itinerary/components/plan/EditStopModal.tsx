import {
  Button,
  FormControl,
  FormHelperText,
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
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { useUpdateStop } from "@/modules/itinerary/hooks/useItinerary";
import type { ItineraryDay, ItineraryStop } from "@/modules/itinerary/types";
import { formatDuration } from "@/modules/itinerary/utils/plan.utils";

const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 360];

interface EditStopModalProps {
  tripId: string;
  target: { stop: ItineraryStop; day: ItineraryDay } | null;
  onClose: () => void;
}

export function EditStopModal({ tripId, target, onClose }: EditStopModalProps) {
  const toast = useToast();
  const updateStop = useUpdateStop(tripId);
  const stop = target?.stop;

  const [duration, setDuration] = useState(60);
  const [isFixed, setIsFixed] = useState(false);
  const [fixedTime, setFixedTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!stop) return;
    setDuration(stop.visitDurationMinutes);
    setIsFixed(Boolean(stop.fixedStartTime));
    setFixedTime(stop.fixedStartTime ?? stop.arrivalTime);
    setNotes(stop.notes ?? "");
  }, [stop]);

  const durationOptions = DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration].sort((a, b) => a - b);

  const handleSave = async () => {
    if (!target) return;
    try {
      await updateStop.mutateAsync({
        dayNumber: target.day.dayNumber,
        stopId: target.stop.id,
        durationMinutes: duration,
        fixedStartTime: isFixed ? fixedTime : null,
        notes,
      });
      toast({ title: "Saved — the day was re-timed", status: "success", duration: 2500 });
      onClose();
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Modal isOpen={Boolean(target)} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader pr={12}>{stop?.placeName}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={5}>
            <FormControl>
              <FormLabel fontSize="sm">How long you'll spend there</FormLabel>
              <Select size="sm" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {durationOptions.map((d) => (
                  <option key={d} value={d}>
                    {formatDuration(d)}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <HStack justify="space-between">
                <FormLabel fontSize="sm" mb={0}>
                  Booked for a set time
                </FormLabel>
                <Switch isChecked={isFixed} onChange={(e) => setIsFixed(e.target.checked)} colorScheme="brand" />
              </HStack>
              {isFixed && (
                <Input mt={2} size="sm" type="time" value={fixedTime} onChange={(e) => setFixedTime(e.target.value)} />
              )}
              <FormHelperText fontSize="xs">
                For tickets, tours, shows and table reservations — the rest of the day is planned around it.
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Notes</FormLabel>
              <Textarea
                size="sm"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Booking reference, what to see, who to ask for…"
              />
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={2} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="brand" onClick={handleSave} isLoading={updateStop.isPending}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
