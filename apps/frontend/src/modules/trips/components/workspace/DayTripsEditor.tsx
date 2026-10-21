import { Box, Button, Flex, IconButton, Select, Stack, Text } from "@chakra-ui/react";
import { addDays, format, parseISO } from "date-fns";
import { LuPlus, LuX } from "react-icons/lu";
import { CityInput } from "@/modules/trips/components/create/CityInput";
import type { TripDayTrip } from "@/modules/trips/types/trip-leg.types";
import { newTripLegId } from "@/modules/trips/utils/trip-leg.utils";

function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = parseISO(start); format(d, "yyyy-MM-dd") <= end && out.length < 60; d = addDays(d, 1)) out.push(format(d, "yyyy-MM-dd"));
  return out;
}

/**
 * Day trips from a city: towns you visit and come back from the same day. Each can be pinned to a
 * day of the stay or left to the planner. The planner gives each town its own day and keeps its
 * places together, coming back to the city's stay in the evening.
 */
export function DayTripsEditor({
  value,
  onChange,
  startDate,
  endDate,
  country,
}: {
  value: TripDayTrip[];
  onChange: (next: TripDayTrip[]) => void;
  startDate: string;
  endDate: string;
  country?: string;
}) {
  const dates = datesBetween(startDate, endDate);
  const update = (id: string, patch: Partial<TripDayTrip>) => onChange(value.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const takenDates = new Set(value.map((d) => d.date).filter(Boolean));

  return (
    <Stack spacing={2}>
      {value.length === 0 && (
        <Text fontSize="13px" color="tx3">
          Going somewhere for the day and coming back here? Add the town — its places get a day of their own.
        </Text>
      )}
      {value.map((trip) => (
        <Flex key={trip.id} gap={2} align="center" direction={{ base: "column", sm: "row" }}>
          <Box flex={1} w="full" minW={0}>
            <CityInput
              size="sm"
              value={{ city: trip.name, country: country ?? "", lat: trip.coordinates?.lat, lng: trip.coordinates?.lng }}
              onChange={(v) =>
                update(trip.id, {
                  name: v.city,
                  coordinates: v.lat !== undefined && v.lng !== undefined ? { lat: v.lat, lng: v.lng } : undefined,
                })
              }
              placeholder="Town, e.g. Ujjain"
            />
          </Box>
          <Flex gap={2} w={{ base: "full", sm: "auto" }}>
            <Select
              size="sm"
              value={trip.date ?? ""}
              onChange={(e) => update(trip.id, { date: e.target.value || undefined })}
              aria-label={`Day for ${trip.name || "this day trip"}`}
              w={{ base: "full", sm: "170px" }}
            >
              <option value="">Any day</option>
              {dates.map((d) => (
                <option key={d} value={d} disabled={takenDates.has(d) && trip.date !== d}>
                  {format(parseISO(d), "EEE d MMM")}
                </option>
              ))}
            </Select>
            <IconButton
              aria-label={`Remove ${trip.name || "day trip"}`}
              icon={<LuX size={16} />}
              size="sm"
              variant="ghost"
              colorScheme="gray"
              onClick={() => onChange(value.filter((d) => d.id !== trip.id))}
            />
          </Flex>
        </Flex>
      ))}
      <Button size="sm" variant="ghost" leftIcon={<LuPlus size={14} />} alignSelf="flex-start" onClick={() => onChange([...value, { id: newTripLegId(), name: "" }])}>
        Add a day trip
      </Button>
    </Stack>
  );
}
