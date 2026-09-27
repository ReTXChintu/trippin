import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
  Stack,
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { FiClock, FiPlus, FiX } from "react-icons/fi";
import { PlaceSearchInput, type PlaceSelection } from "@/modules/places/components/PlaceSearchInput";
import { useUpdateMealSlot } from "@/modules/itinerary/hooks/useItinerary";
import { getApiErrorMessage } from "@/lib/api";
import type { ItineraryStop } from "@/modules/itinerary/types";

interface MealSlotEditorProps {
  tripId: string;
  dayNumber: number;
  stop: ItineraryStop;
  destinationCity?: string;
  destinationCountry?: string;
}

export function MealSlotEditor({ tripId, dayNumber, stop, destinationCity, destinationCountry }: MealSlotEditorProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const updateMealSlot = useUpdateMealSlot(tripId);

  const [arrivalTime, setArrivalTime] = useState(stop.arrivalTime);
  const [departureTime, setDepartureTime] = useState(stop.departureTime);
  const [pendingPlace, setPendingPlace] = useState<PlaceSelection | null>(null);

  const isAssigned = Boolean(stop.placeId);

  const resetForm = () => {
    setArrivalTime(stop.arrivalTime);
    setDepartureTime(stop.departureTime);
    setPendingPlace(null);
  };

  const handleSave = async () => {
    try {
      await updateMealSlot.mutateAsync({
        dayNumber,
        stopId: stop.id,
        arrivalTime: arrivalTime !== stop.arrivalTime ? arrivalTime : undefined,
        departureTime: departureTime !== stop.departureTime ? departureTime : undefined,
        placeId: pendingPlace?.googlePlaceId,
      });
      toast({ title: "Meal slot updated", status: "success", duration: 3000 });
      onClose();
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const handleClear = async () => {
    try {
      await updateMealSlot.mutateAsync({ dayNumber, stopId: stop.id, clearPlace: true });
      toast({ title: "Restaurant removed from slot", status: "success", duration: 3000 });
      onClose();
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  return (
    <Popover
      isOpen={isOpen}
      onOpen={() => {
        resetForm();
        onOpen();
      }}
      onClose={onClose}
      placement="bottom-start"
      closeOnBlur
    >
      <PopoverTrigger>
        {isAssigned ? (
          <Button size="xs" variant="outline">
            Change
          </Button>
        ) : (
          <Button size="xs" leftIcon={<FiPlus />} variant="outline" colorScheme="brand">
            Add restaurant
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent w="320px">
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader fontWeight="semibold" fontSize="sm">
          Edit {stop.placeName}
        </PopoverHeader>
        <PopoverBody>
          <Stack spacing={3}>
            <HStack>
              <FormControl>
                <FormLabel fontSize="xs">
                  <HStack spacing={1}>
                    <FiClock size={12} />
                    <Text>From</Text>
                  </HStack>
                </FormLabel>
                <Input size="sm" type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs">To</FormLabel>
                <Input size="sm" type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
              </FormControl>
            </HStack>

            <Box>
              <PlaceSearchInput
                label="Restaurant / cafe"
                placeholder="Search places to eat..."
                mode="place"
                city={destinationCity}
                country={destinationCountry}
                value={pendingPlace?.name ?? (isAssigned ? stop.placeName : "")}
                onSelect={setPendingPlace}
              />
            </Box>
          </Stack>
        </PopoverBody>
        <PopoverFooter>
          <HStack justify="space-between">
            {isAssigned ? (
              <Button size="sm" variant="ghost" colorScheme="red" leftIcon={<FiX />} onClick={handleClear} isLoading={updateMealSlot.isPending}>
                Remove
              </Button>
            ) : (
              <Box />
            )}
            <Button size="sm" colorScheme="brand" onClick={handleSave} isLoading={updateMealSlot.isPending}>
              Save
            </Button>
          </HStack>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  );
}
