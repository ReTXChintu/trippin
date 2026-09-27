import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
  Stack,
  Text,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  FiAlertTriangle,
  FiCheck,
  FiClock,
  FiSkipForward,
  FiEdit2,
  FiInfo,
  FiLock,
  FiMoreHorizontal,
  FiMove,
  FiTrash2,
  FiUnlock,
} from "react-icons/fi";
import { MdHotel, MdRestaurant, MdTrain } from "react-icons/md";
import type { ItineraryDay, ItineraryStop, MealType } from "@/modules/itinerary/types";
import { formatDuration, gapBefore, transportIcon } from "@/modules/itinerary/utils/plan.utils";
import { usePlan } from "./PlanContext";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  tiffin: "Snacks",
  dinner: "Dinner",
};

function stopAccent(stop: ItineraryStop): { color: string; icon?: typeof MdHotel } {
  switch (stop.stopType) {
    case "meal":
      return { color: "orange.400", icon: MdRestaurant };
    case "transfer":
      return { color: "purple.400", icon: MdTrain };
    case "return":
      return { color: "blue.400", icon: MdHotel };
    default:
      return { color: "brand.500" };
  }
}

/** Travel line between two timeline rows: "🚕 12 min · 4.7 km", plus any free time before the stop. */
export function TravelConnector({ prev, stop }: { prev?: ItineraryStop; stop: ItineraryStop }) {
  const { trip } = usePlan();
  const muted = useColorModeValue("gray.500", "gray.400");
  const line = useColorModeValue("gray.300", "gray.600");
  const gap = gapBefore(prev, stop);

  if (stop.stopType === "transfer" || (stop.travelDurationMinutes <= 0 && gap < 15)) {
    return <Box ml="78px" h={3} borderLeftWidth="2px" borderColor={line} borderStyle="dotted" />;
  }

  const estimated = stop.travelSource === "estimate";
  const ModeIcon = transportIcon(trip.transportationMode);

  return (
    <Stack spacing={0} ml="78px" pl={4} py={1.5} borderLeftWidth="2px" borderColor={line} borderStyle="dotted">
      {stop.travelDurationMinutes > 0 && (
        <Tooltip
          label={
            estimated
              ? "Estimated from distance — real route times need a Google Maps key (Profile)."
              : `Route by ${trip.transportationMode.toLowerCase()}`
          }
          placement="right"
          hasArrow
        >
          <HStack spacing={1.5} fontSize="xs" color={muted} w="fit-content">
            <Icon as={ModeIcon} boxSize={3.5} />
            <Text>
              {estimated ? "~" : ""}
              {formatDuration(stop.travelDurationMinutes)}
              {stop.travelDistanceKm ? ` · ${stop.travelDistanceKm} km` : ""}
            </Text>
          </HStack>
        </Tooltip>
      )}
      {gap >= 15 && (
        <HStack spacing={1.5} fontSize="xs" color={muted}>
          <Icon as={FiClock} boxSize={3} />
          <Text fontStyle="italic">Free time · {formatDuration(gap)}</Text>
        </HStack>
      )}
    </Stack>
  );
}

interface StopRowProps {
  stop: ItineraryStop;
  day: ItineraryDay;
  /** Number shown in the dot for visits (matches the map pin). */
  visitNumber?: number;
  draggable: boolean;
}

export function StopRow({ stop, day, visitNumber, draggable }: StopRowProps) {
  const plan = usePlan();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
    disabled: !draggable,
  });

  const cardBg = useColorModeValue("white", "gray.800");
  const subtleBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const border = useColorModeValue("gray.200", "gray.700");
  const highlightBorder = useColorModeValue("brand.400", "brand.300");
  const muted = useColorModeValue("gray.500", "gray.400");
  const warnColor = useColorModeValue("orange.600", "orange.300");

  const accent = stopAccent(stop);
  const isMeal = stop.stopType === "meal";
  const isStructural = stop.stopType === "transfer" || stop.stopType === "return";
  const mealUnassigned = isMeal && !stop.placeId;
  const isHighlighted = plan.highlightedStopId === stop.id;
  const canOpenDetails = Boolean(stop.placeId) && !isStructural;
  const moveTargets = plan.moveTargets(day);
  const hoursClosed = stop.openingHoursToday === "Closed";

  return (
    <Flex
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      opacity={isDragging ? 0.5 : 1}
      align="stretch"
      gap={3}
      onMouseEnter={() => stop.coordinates && plan.setHighlightedStopId(stop.id)}
      onMouseLeave={() => plan.setHighlightedStopId(null)}
      position="relative"
      zIndex={isDragging ? 2 : undefined}
    >
      <Box w="52px" flexShrink={0} textAlign="right" pt={2.5}>
        <Text fontSize="sm" fontWeight="semibold" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {stop.arrivalTime}
        </Text>
        {stop.departureTime !== stop.arrivalTime && (
          <Text fontSize="xs" color={muted} sx={{ fontVariantNumeric: "tabular-nums" }}>
            {stop.departureTime}
          </Text>
        )}
      </Box>

      <Flex w="24px" flexShrink={0} justify="center" pt={2.5}>
        <Flex
          w="24px"
          h="24px"
          borderRadius="full"
          bg={accent.color}
          color="white"
          align="center"
          justify="center"
          fontSize="xs"
          fontWeight="bold"
          boxShadow={isHighlighted ? "0 0 0 3px var(--chakra-colors-brand-200)" : undefined}
        >
          {accent.icon ? <Icon as={accent.icon} boxSize={3.5} /> : visitNumber}
        </Flex>
      </Flex>

      <Box
        flex={1}
        minW={0}
        p={3}
        opacity={stop.status ? 0.6 : 1}
        bg={isStructural ? subtleBg : cardBg}
        borderWidth="1px"
        borderColor={isHighlighted ? highlightBorder : border}
        borderStyle={mealUnassigned ? "dashed" : "solid"}
        borderRadius="lg"
        transition="border-color .15s"
      >
        <Flex justify="space-between" align="start" gap={2}>
          <Box minW={0} flex={1}>
            <HStack spacing={2} flexWrap="wrap" rowGap={1}>
              {isMeal && (
                <Badge colorScheme="orange" variant="subtle" fontSize="2xs">
                  {MEAL_LABELS[stop.mealType ?? "lunch"]}
                </Badge>
              )}
              {mealUnassigned ? (
                <Text fontSize="sm" color={muted}>
                  {formatDuration(stop.visitDurationMinutes)} — no place picked yet
                </Text>
              ) : (
                <Text
                  fontWeight="semibold"
                  fontSize="sm"
                  cursor={canOpenDetails ? "pointer" : undefined}
                  _hover={canOpenDetails ? { textDecoration: "underline" } : undefined}
                  onClick={canOpenDetails ? () => plan.openDetails(stop, day) : undefined}
                  noOfLines={1}
                  textDecoration={stop.status === "skipped" ? "line-through" : undefined}
                >
                  {stop.placeName}
                </Text>
              )}
              {stop.status && (
                <Badge colorScheme={stop.status === "done" ? "green" : "gray"} fontSize="2xs">
                  {stop.status === "done" ? "Done" : "Skipped"}
                </Badge>
              )}
              {stop.locked && (
                <Tooltip label="Locked — regenerating keeps it on this day" hasArrow>
                  <span>
                    <Icon as={FiLock} boxSize={3} color={muted} />
                  </span>
                </Tooltip>
              )}
              {stop.fixedStartTime && (
                <Badge colorScheme="purple" variant="subtle" fontSize="2xs">
                  Booked {stop.fixedStartTime}
                </Badge>
              )}
              {stop.userAdded && !stop.fixedStartTime && (
                <Badge variant="outline" fontSize="2xs" color={muted}>
                  Added by you
                </Badge>
              )}
            </HStack>

            {!isStructural && !mealUnassigned && (
              <HStack spacing={1.5} mt={0.5} fontSize="xs" color={muted} flexWrap="wrap">
                {stop.category && stop.category !== "Transfer" && <Text>{stop.category}</Text>}
                {stop.category && <Text>·</Text>}
                <Text>{formatDuration(stop.visitDurationMinutes)}</Text>
                {stop.openingHoursToday && (
                  <>
                    <Text>·</Text>
                    <Text color={hoursClosed ? "red.500" : undefined}>
                      {hoursClosed ? "Closed today" : `Open ${stop.openingHoursToday}`}
                    </Text>
                  </>
                )}
              </HStack>
            )}
            {stop.stopType === "transfer" && stop.notes && (
              <Text fontSize="xs" color={muted} mt={0.5}>
                {stop.notes} · {formatDuration(stop.visitDurationMinutes)}
              </Text>
            )}

            {stop.warnings?.map((warning) => (
              <HStack key={warning} spacing={1.5} mt={1} fontSize="xs" color={warnColor} align="start">
                <Icon as={FiAlertTriangle} boxSize={3} mt="2px" />
                <Text>{warning}</Text>
              </HStack>
            ))}

            {stop.aiNotes && (
              <Text fontSize="xs" color={muted} mt={1.5} fontStyle="italic">
                {stop.aiNotes}
              </Text>
            )}
            {stop.notes && stop.stopType !== "transfer" && (
              <Text fontSize="xs" mt={1.5} whiteSpace="pre-wrap">
                📝 {stop.notes}
              </Text>
            )}

            {isMeal && !plan.readOnly && (
              <Button
                size="xs"
                mt={2}
                variant={mealUnassigned ? "outline" : "ghost"}
                colorScheme={mealUnassigned ? "orange" : "gray"}
                leftIcon={<Icon as={MdRestaurant} />}
                onClick={() => plan.openMealPicker(stop, day)}
              >
                {mealUnassigned ? "Find a place nearby" : "Change place"}
              </Button>
            )}
          </Box>

          {!plan.readOnly && !isStructural && (
            <HStack spacing={0} flexShrink={0}>
              {!isMeal && (
                <Tooltip label={stop.locked ? "Unlock" : "Lock to this day"} hasArrow>
                  <IconButton
                    aria-label={stop.locked ? "Unlock stop" : "Lock stop"}
                    icon={stop.locked ? <FiLock /> : <FiUnlock />}
                    size="xs"
                    variant="ghost"
                    color={stop.locked ? "brand.500" : muted}
                    onClick={() => plan.toggleLock(stop, day)}
                  />
                </Tooltip>
              )}
              <Menu isLazy placement="bottom-end">
                <MenuButton
                  as={IconButton}
                  aria-label="Stop actions"
                  icon={<FiMoreHorizontal />}
                  size="xs"
                  variant="ghost"
                  isLoading={plan.busyStopId === stop.id}
                />
                <MenuList fontSize="sm" maxH="360px" overflowY="auto">
                  {canOpenDetails && (
                    <MenuItem icon={<FiInfo />} onClick={() => plan.openDetails(stop, day)}>
                      Details, photos & reviews
                    </MenuItem>
                  )}
                  <MenuItem icon={<FiEdit2 />} onClick={() => plan.openEdit(stop, day)}>
                    Time, duration, cost & notes
                  </MenuItem>
                  {stop.status !== "done" && (
                    <MenuItem icon={<FiCheck />} onClick={() => plan.setStatus(stop, day, "done")}>
                      Mark done
                    </MenuItem>
                  )}
                  {stop.status !== "skipped" && (
                    <MenuItem icon={<FiSkipForward />} onClick={() => plan.setStatus(stop, day, "skipped")}>
                      Skip — re-time the rest
                    </MenuItem>
                  )}
                  {stop.status && <MenuItem onClick={() => plan.setStatus(stop, day, null)}>Back to planned</MenuItem>}
                  {moveTargets.length > 0 && (
                    <>
                      <MenuDivider />
                      <MenuGroup title="Move to">
                        {moveTargets.map((target) => (
                          <MenuItem
                            key={target.dayNumber}
                            pl={6}
                            onClick={() => plan.moveStop(stop, day, target.dayNumber)}
                          >
                            {target.label}
                          </MenuItem>
                        ))}
                      </MenuGroup>
                    </>
                  )}
                  <MenuDivider />
                  <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => plan.removeStop(stop, day)}>
                    Remove from this day
                  </MenuItem>
                </MenuList>
              </Menu>
              {draggable && (
                <Box
                  {...attributes}
                  {...listeners}
                  cursor="grab"
                  color={muted}
                  _hover={{ color: "gray.700" }}
                  px={1}
                  py={1}
                  aria-label="Drag to reorder"
                >
                  <Icon as={FiMove} boxSize={3.5} />
                </Box>
              )}
            </HStack>
          )}
        </Flex>
      </Box>
    </Flex>
  );
}
