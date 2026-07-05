import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  SimpleGrid,
  Stack,
  Tag,
  TagCloseButton,
  Text,
  useColorModeValue,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { addDays, format, parseISO } from "date-fns";
import { FiArrowDown, FiPlus, FiTrash2 } from "react-icons/fi";
import { PlaceSearchInput } from "@/modules/places/components/PlaceSearchInput";
import type { TripLeg, TripLegTransfer } from "@/modules/trips/types/trip-leg.types";
import {
  createEmptyLeg,
  newTripLegId,
  syncTripDatesFromLegs,
} from "@/modules/trips/utils/trip-leg.utils";

interface TripLegBuilderProps {
  legs: TripLeg[];
  transfers: TripLegTransfer[];
  country: string;
  onChange: (legs: TripLeg[], transfers: TripLegTransfer[]) => void;
}

function defaultTransferLabel(from: TripLeg, to: TripLeg): string {
  return `Travel from ${from.baseCity} to ${to.baseCity}`;
}

function suggestTransferDate(fromLeg: TripLeg, toLeg: TripLeg): string {
  try {
    const next = addDays(parseISO(fromLeg.endDate), 1);
    const toStart = parseISO(toLeg.startDate);
    return format(next <= toStart ? next : toStart, "yyyy-MM-dd");
  } catch {
    return toLeg.startDate;
  }
}

export function TripLegBuilder({
  legs,
  transfers,
  country,
  onChange,
}: TripLegBuilderProps) {
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const sectionBg = useColorModeValue("gray.50", "gray.700");

  const displayLegs = legs.length > 0 ? legs : [createEmptyLeg(0, country)];

  const updateLeg = (index: number, patch: Partial<TripLeg>) => {
    const next = displayLegs.map((leg, i) => (i === index ? { ...leg, ...patch } : leg));
    onChange(next, transfers);
  };

  const addLeg = () => {
    const order = displayLegs.length;
    const prev = displayLegs[order - 1];
    const start = prev
      ? format(addDays(parseISO(prev.endDate), 1), "yyyy-MM-dd")
      : new Date().toISOString().slice(0, 10);
    const end = format(addDays(parseISO(start), 2), "yyyy-MM-dd");
    const newLeg = { ...createEmptyLeg(order, country), startDate: start, endDate: end };
    const nextLegs = [...displayLegs, newLeg];
    const nextTransfers = prev
      ? [
          ...transfers,
          {
            id: newTripLegId(),
            date: suggestTransferDate(prev, newLeg),
            fromLegId: prev.id,
            toLegId: newLeg.id,
            label: defaultTransferLabel(prev, newLeg),
          },
        ]
      : transfers;
    onChange(nextLegs, nextTransfers);
  };

  const removeLeg = (index: number) => {
    const leg = displayLegs[index];
    const nextLegs = displayLegs
      .filter((_, i) => i !== index)
      .map((l, i) => ({ ...l, order: i }));
    const nextTransfers = transfers.filter(
      (t) => t.fromLegId !== leg.id && t.toLegId !== leg.id,
    );
    onChange(nextLegs, nextTransfers);
  };

  const addDayTripArea = (index: number, area: string) => {
    const leg = displayLegs[index];
    if (!area.trim() || leg.dayTripAreas.includes(area.trim())) return;
    updateLeg(index, { dayTripAreas: [...leg.dayTripAreas, area.trim()] });
  };

  const synced = syncTripDatesFromLegs(displayLegs, transfers);

  return (
    <Stack spacing={4}>
      <Text fontSize="sm" color="gray.500">
        Plan each stop on your route — where you stay, how long, and nearby day-trip towns
        (e.g. Pushkar & Kishangarh while based in Ajmer).
      </Text>

      {synced && (
        <Text fontSize="sm" fontWeight="medium">
          Route: {synced.destinationCity} · {synced.startDate} → {synced.endDate}
        </Text>
      )}

      {displayLegs.map((leg, index) => (
        <Box
          key={leg.id}
          p={4}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          bg={sectionBg}
        >
          <Flex justify="space-between" align="center" mb={3}>
            <Text fontWeight="semibold" fontSize="sm">
              Stop {index + 1}
            </Text>
            {displayLegs.length > 1 && (
              <IconButton
                aria-label="Remove leg"
                icon={<FiTrash2 />}
                size="sm"
                variant="ghost"
                colorScheme="red"
                onClick={() => removeLeg(index)}
              />
            )}
          </Flex>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            <FormControl>
              <FormLabel fontSize="sm">Leg name</FormLabel>
              <Input
                size="sm"
                placeholder="Ajmer & nearby"
                value={leg.name}
                onChange={(e) => updateLeg(index, { name: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Base city (where you stay)</FormLabel>
              <Input
                size="sm"
                placeholder="Ajmer"
                value={leg.baseCity}
                onChange={(e) =>
                  updateLeg(index, {
                    baseCity: e.target.value,
                    name: leg.name || e.target.value,
                  })
                }
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">From</FormLabel>
              <Input
                size="sm"
                type="date"
                value={leg.startDate}
                onChange={(e) => updateLeg(index, { startDate: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">To</FormLabel>
              <Input
                size="sm"
                type="date"
                value={leg.endDate}
                onChange={(e) => updateLeg(index, { endDate: e.target.value })}
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Arrive at</FormLabel>
              <Input
                size="sm"
                type="time"
                value={leg.arrivalTime ?? ""}
                onChange={(e) =>
                  updateLeg(index, { arrivalTime: e.target.value || undefined })
                }
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                When you reach this stop (first day only). E.g. train lands 7:30 AM.
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Leave at</FormLabel>
              <Input
                size="sm"
                type="time"
                value={leg.departureTime ?? ""}
                onChange={(e) =>
                  updateLeg(index, { departureTime: e.target.value || undefined })
                }
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                When you leave on the last day. Morning checkout = no sightseeing that day.
              </Text>
            </FormControl>

            <FormControl gridColumn={{ md: "span 2" }}>
              <FormLabel fontSize="sm">State / region</FormLabel>
              <Input
                size="sm"
                placeholder="Rajasthan"
                value={leg.state ?? ""}
                onChange={(e) => updateLeg(index, { state: e.target.value })}
              />
            </FormControl>

            <Box gridColumn={{ md: "span 2" }}>
              <PlaceSearchInput
                label="Hotel for this leg"
                placeholder="Search hotels..."
                mode="hotel"
                city={leg.baseCity}
                country={leg.country || country}
                value={leg.hotelName ?? ""}
                onSelect={(sel) => {
                  updateLeg(index, {
                    hotelName: sel.name,
                    hotelAddress: sel.address,
                    hotelCoordinates:
                      sel.lat !== undefined && sel.lng !== undefined
                        ? { lat: sel.lat, lng: sel.lng }
                        : undefined,
                  });
                }}
                onClear={() =>
                  updateLeg(index, {
                    hotelName: undefined,
                    hotelAddress: undefined,
                    hotelCoordinates: undefined,
                  })
                }
              />
            </Box>

            <FormControl gridColumn={{ md: "span 2" }}>
              <FormLabel fontSize="sm">Day-trip areas (comma towns to cover)</FormLabel>
              <HStack>
                <Input
                  size="sm"
                  placeholder="Pushkar, Kishangarh"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDayTripArea(index, (e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={(e) => {
                    const input = (e.currentTarget.previousSibling as HTMLInputElement);
                    addDayTripArea(index, input.value);
                    input.value = "";
                  }}
                >
                  Add
                </Button>
              </HStack>
              {leg.dayTripAreas.length > 0 && (
                <Wrap mt={2}>
                  {leg.dayTripAreas.map((area) => (
                    <WrapItem key={area}>
                      <Tag size="sm">
                        {area}
                        <TagCloseButton
                          onClick={() =>
                            updateLeg(index, {
                              dayTripAreas: leg.dayTripAreas.filter((a) => a !== area),
                            })
                          }
                        />
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              )}
            </FormControl>
          </SimpleGrid>

          {index < displayLegs.length - 1 && (
            <Flex align="center" gap={2} mt={4} color="gray.500">
              <FiArrowDown />
              <Text fontSize="xs">Transfer to next stop configured below</Text>
            </Flex>
          )}
        </Box>
      ))}

      <Button leftIcon={<FiPlus />} size="sm" variant="outline" alignSelf="flex-start" onClick={addLeg}>
        Add next destination
      </Button>

      {transfers.length > 0 && (
        <Box>
          <Text fontWeight="semibold" fontSize="sm" mb={2}>
            Travel days between stops
          </Text>
          <Stack spacing={3}>
            {transfers.map((transfer, i) => {
              const from = displayLegs.find((l) => l.id === transfer.fromLegId);
              const to = displayLegs.find((l) => l.id === transfer.toLegId);
              return (
                <SimpleGrid
                  key={transfer.id}
                  columns={{ base: 1, md: 3 }}
                  spacing={3}
                  p={3}
                  borderWidth="1px"
                  borderColor={borderColor}
                  borderRadius="md"
                >
                  <FormControl>
                    <FormLabel fontSize="xs">Date</FormLabel>
                    <Input
                      size="sm"
                      type="date"
                      value={transfer.date}
                      onChange={(e) =>
                        onChange(
                          displayLegs,
                          transfers.map((t, idx) =>
                            idx === i ? { ...t, date: e.target.value } : t,
                          ),
                        )
                      }
                    />
                  </FormControl>
                  <FormControl gridColumn={{ md: "span 2" }}>
                    <FormLabel fontSize="xs">
                      {from?.baseCity} → {to?.baseCity}
                    </FormLabel>
                    <Input
                      size="sm"
                      value={transfer.label}
                      onChange={(e) =>
                        onChange(
                          displayLegs,
                          transfers.map((t, idx) =>
                            idx === i ? { ...t, label: e.target.value } : t,
                          ),
                        )
                      }
                    />
                  </FormControl>
                </SimpleGrid>
              );
            })}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
