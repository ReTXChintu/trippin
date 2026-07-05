"use client";

import { Box, HStack, Stack, Tag, Text, useColorModeValue } from "@chakra-ui/react";
import { format, parseISO } from "date-fns";
import { FiArrowRight } from "react-icons/fi";
import type { Trip } from "@/modules/trips/types/trip.types";
import { buildTripDayPlans, getEffectiveLegs, getEffectiveTransfers } from "@/modules/trips/utils/trip-leg.utils";

interface TripLegTimelineProps {
  trip: Trip;
}

function fmt(date: string) {
  try {
    return format(parseISO(date), "MMM d");
  } catch {
    return date;
  }
}

export function TripLegTimeline({ trip }: TripLegTimelineProps) {
  const legs = getEffectiveLegs(trip);
  const transfers = getEffectiveTransfers(trip);
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bg = useColorModeValue("brand.50", "gray.700");

  if (trip.legs.length === 0) return null;

  const dayPlans = buildTripDayPlans(trip);

  return (
    <Box p={4} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl" mb={6}>
      <Text fontWeight="semibold" fontSize="sm" mb={3}>
        Trip route
      </Text>
      <Stack spacing={3}>
        {legs.map((leg, index) => (
          <Box key={leg.id}>
            <Box
              px={3}
              py={2}
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="md"
              bg="white"
              _dark={{ bg: "gray.800" }}
            >
              <Text fontSize="sm" fontWeight="medium">
                {leg.name || leg.baseCity}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {fmt(leg.startDate)} – {fmt(leg.endDate)}
                {leg.hotelName ? ` · ${leg.hotelName}` : ""}
              </Text>
              {(leg.arrivalTime || leg.departureTime) && (
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {leg.arrivalTime ? `Arrive ${leg.arrivalTime}` : ""}
                  {leg.arrivalTime && leg.departureTime ? " · " : ""}
                  {leg.departureTime ? `Leave ${leg.departureTime}` : ""}
                </Text>
              )}
              {leg.dayTripAreas.length > 0 && (
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Day trips: {leg.dayTripAreas.join(", ")}
                </Text>
              )}
            </Box>
            {index < legs.length - 1 && (
              <HStack spacing={2} my={2} pl={2} color="gray.500">
                <FiArrowRight size={14} />
                {transfers[index] ? (
                  <Tag size="sm" colorScheme="orange" variant="subtle">
                    {fmt(transfers[index].date)} · {transfers[index].label}
                  </Tag>
                ) : (
                  <Text fontSize="xs">Travel to next stop</Text>
                )}
              </HStack>
            )}
          </Box>
        ))}
      </Stack>
      <Text fontSize="xs" color="gray.500" mt={3}>
        {dayPlans.filter((d) => d.plan.type === "sightseeing").length} sightseeing day(s)
      </Text>
    </Box>
  );
}
