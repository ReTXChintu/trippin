import { Box, Button, Flex, FormControl, FormHelperText, FormLabel, HStack, Input, Stack, Text, useToast } from "@chakra-ui/react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { useState } from "react";
import { LuArrowRight, LuPencil, LuPlus } from "react-icons/lu";
import { getApiErrorMessage } from "@/lib/api";
import { DayBadge, Overline } from "@/components/ui";
import { useUpdateTrip } from "@/modules/trips/hooks/useTrips";
import { tripToFormValues } from "@/modules/trips/utils/trip-form.utils";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import type { Trip } from "@/modules/trips/types/trip.types";

const shift = (date: string, days: number) => format(addDays(parseISO(date), days), "yyyy-MM-dd");
const nice = (date: string) => format(parseISO(date), "EEE d MMM");

/**
 * "Cities & dates" at the top of Edit trip: every city with its dates (edit opens the city editor),
 * Add city, and moving the whole trip to a new start date. Moving shifts cities, travel days and
 * stays together; bookings are left alone (they're real reservations).
 */
export function CitiesDatesSection({
  trip,
  canEdit,
  onEditCity,
  onAddCity,
}: {
  trip: Trip;
  canEdit: boolean;
  onEditCity: (legId: string) => void;
  onAddCity?: () => void;
}) {
  const toast = useToast();
  const update = useUpdateTrip(trip.id);
  const legs = getEffectiveLegs(trip);
  const start = trip.startDate.slice(0, 10);
  const [newStart, setNewStart] = useState(start);
  const offset = newStart ? differenceInCalendarDays(parseISO(newStart), parseISO(start)) : 0;

  const moveTrip = async () => {
    if (!offset) return;
    const values = tripToFormValues(trip);
    try {
      await update.mutateAsync({
        ...values,
        startDate: shift(start, offset),
        endDate: shift(trip.endDate.slice(0, 10), offset),
        legs: trip.legs.map((l) => ({
          ...l,
          startDate: shift(l.startDate, offset),
          endDate: shift(l.endDate, offset),
          stays: (l.stays ?? []).map((s) => ({ ...s, checkInDate: shift(s.checkInDate, offset), checkOutDate: shift(s.checkOutDate, offset) })),
          dayTrips: (l.dayTrips ?? []).map((d) => (d.date ? { ...d, date: shift(d.date, offset) } : d)),
        })),
        transfers: (trip.transfers ?? []).map((t) => ({ ...t, date: shift(t.date, offset) })),
      });
      toast({
        title: `Trip moved ${offset > 0 ? "later" : "earlier"} by ${Math.abs(offset)} day${Math.abs(offset) === 1 ? "" : "s"}`,
        description: "Replan the Plan tab to move the day-by-day plan too — locked stops keep their day.",
        status: "success",
        duration: 6000,
      });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Stack as="section" spacing="10px" aria-label="Cities and dates">
      <Overline>Cities & dates</Overline>
      <Stack spacing={2}>
        {legs.map((leg, i) => {
          const days = differenceInCalendarDays(parseISO(leg.endDate), parseISO(leg.startDate)) + 1;
          return (
            <Flex key={leg.id} align="center" gap={3} px={3} py={2.5} borderWidth="1px" borderColor="ln" borderRadius="lg">
              <DayBadge dayNumber={i + 1} size={30} />
              <Box flex={1} minW={0}>
                <Text fontWeight={600} noOfLines={1}>
                  {leg.name || leg.baseCity}
                </Text>
                <Text fontSize="12px" color="tx3">
                  {nice(leg.startDate)} – {nice(leg.endDate)} · {days} day{days === 1 ? "" : "s"}
                </Text>
              </Box>
              {canEdit && leg.id !== "legacy" && (
                <Button size="sm" variant="outline" leftIcon={<LuPencil size={14} />} onClick={() => onEditCity(leg.id)}>
                  Edit
                </Button>
              )}
            </Flex>
          );
        })}
      </Stack>
      {canEdit && onAddCity && (
        <Button size="sm" variant="ghost" leftIcon={<LuPlus size={14} />} alignSelf="flex-start" onClick={onAddCity}>
          Add city
        </Button>
      )}
      {canEdit && trip.legs.length > 0 && (
        <FormControl>
          <FormLabel>Move the whole trip</FormLabel>
          <HStack>
            <Input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} maxW="200px" aria-label="New start date" />
            <Button size="md" rightIcon={<LuArrowRight size={14} />} onClick={moveTrip} isLoading={update.isPending} isDisabled={!offset}>
              {offset ? `Move ${offset > 0 ? "+" : "−"}${Math.abs(offset)} day${Math.abs(offset) === 1 ? "" : "s"}` : "Move"}
            </Button>
          </HStack>
          <FormHelperText fontSize="12px" color="tx3">
            Shifts every city, travel day and stay together. Bookings stay as they are.
          </FormHelperText>
        </FormControl>
      )}
    </Stack>
  );
}
