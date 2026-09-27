import {
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiCalendar, FiPlus, FiSliders } from "react-icons/fi";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { AddLegModal } from "@/modules/trips/components/AddLegModal";
import { LegOverviewPanel } from "@/modules/trips/components/LegOverviewPanel";
import { TripActionsMenu } from "@/modules/trips/components/TripActionsMenu";
import { TripHeaderPanel } from "@/modules/trips/components/TripHeaderPanel";
import type { Trip } from "@/modules/trips/types/trip.types";
import { getEffectiveLegs, getEffectiveTransfers } from "@/modules/trips/utils/trip-leg.utils";
import { getUncoveredNights } from "@/modules/trips/utils/stay.utils";
import { formatDayDate, transportIcon } from "@/modules/itinerary/utils/plan.utils";

const statusColors: Record<Trip["status"], string> = {
  draft: "gray",
  active: "green",
  completed: "blue",
  archived: "orange",
};

interface TripHeaderProps {
  trip: Trip;
  currentUserId: string;
  isOwner: boolean;
  onCityAdded: (legId: string) => void;
  /** Trip settings drawer — owned by the page so other tabs can open it. */
  settings: { isOpen: boolean; onOpen: () => void; onClose: () => void };
}

export function TripHeader({ trip, currentUserId, isOwner, onCityAdded, settings }: TripHeaderProps) {
  const addCity = useDisclosure();
  const [editingLegId, setEditingLegId] = useState<string | null>(null);
  const muted = useColorModeValue("gray.500", "gray.400");

  const legs = getEffectiveLegs(trip);
  const transfers = getEffectiveTransfers(trip);
  const editingLeg = trip.legs.find((l) => l.id === editingLegId);
  const totalDays = (() => {
    try {
      return differenceInCalendarDays(parseISO(trip.endDate), parseISO(trip.startDate)) + 1;
    } catch {
      return undefined;
    }
  })();
  const ModeIcon = transportIcon(trip.transportationMode);

  return (
    <Box>
      <Button as={Link} to="/trips" variant="link" size="sm" leftIcon={<FiArrowLeft />} color={muted} mb={3}>
        All trips
      </Button>

      <Flex justify="space-between" align="start" gap={4} flexWrap="wrap">
        <Box minW={0}>
          <HStack spacing={3} flexWrap="wrap">
            <Heading size="lg">{trip.title}</Heading>
            <Badge colorScheme={statusColors[trip.status]} textTransform="capitalize">
              {trip.status}
            </Badge>
          </HStack>
          <HStack spacing={3} mt={1} fontSize="sm" color={muted} flexWrap="wrap">
            <HStack spacing={1}>
              <Icon as={FiCalendar} />
              <Text>
                {formatDayDate(trip.startDate.slice(0, 10), "EEE d MMM")} – {formatDayDate(trip.endDate.slice(0, 10), "EEE d MMM yyyy")}
                {totalDays ? ` · ${totalDays} day${totalDays === 1 ? "" : "s"}` : ""}
              </Text>
            </HStack>
            <HStack spacing={1}>
              <Icon as={ModeIcon} />
              <Text>
                {trip.transportationMode} · {trip.travelStyle.toLowerCase()} pace · {trip.dailyStartTime}–{trip.dailyEndTime}
              </Text>
            </HStack>
          </HStack>
        </Box>

        <HStack spacing={2}>
          <Button size="sm" variant="outline" leftIcon={<FiSliders />} onClick={settings.onOpen}>
            Trip settings
          </Button>
          <TripActionsMenu trip={trip} isOwner={isOwner} />
        </HStack>
      </Flex>

      <Wrap mt={4} spacing={2} align="center">
        {legs.map((leg, i) => {
          const nights = Math.max(differenceInCalendarDays(parseISO(leg.endDate), parseISO(leg.startDate)), 0);
          const missingStays = getUncoveredNights(leg).length;
          const transfer = transfers.find((t) => t.fromLegId === leg.id);
          return (
            <WrapItem key={leg.id} alignItems="center" gap={2}>
              <Tooltip label="Edit dates, arrival/departure and day trips" hasArrow>
                <Button
                  size="sm"
                  variant="outline"
                  borderRadius="full"
                  onClick={() => trip.legs.length > 0 && setEditingLegId(leg.id)}
                  rightIcon={missingStays > 0 ? <Box w="7px" h="7px" borderRadius="full" bg="orange.400" /> : undefined}
                >
                  {leg.name || leg.baseCity}
                  <Text as="span" fontWeight="normal" color={muted} ml={1.5}>
                    {formatDayDate(leg.startDate, "d MMM")} · {nights} night{nights === 1 ? "" : "s"}
                  </Text>
                </Button>
              </Tooltip>
              {i < legs.length - 1 && (
                <HStack spacing={1} color={muted} fontSize="xs">
                  <Icon as={FiArrowRight} />
                  {transfer && <Text>{transfer.label}</Text>}
                </HStack>
              )}
            </WrapItem>
          );
        })}
        {trip.legs.length > 0 && (
          <WrapItem>
            <Button size="sm" variant="ghost" leftIcon={<FiPlus />} onClick={addCity.onOpen} borderRadius="full">
              Add city
            </Button>
          </WrapItem>
        )}
      </Wrap>

      <Drawer isOpen={settings.isOpen} onClose={settings.onClose} size="lg" placement="right">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">Trip settings</DrawerHeader>
          <DrawerBody py={5}>
            <TripHeaderPanel trip={trip} currentUserId={currentUserId} isOwner={isOwner} embedded />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Modal isOpen={Boolean(editingLeg)} onClose={() => setEditingLegId(null)} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingLeg?.name || editingLeg?.baseCity}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>{editingLeg && <LegOverviewPanel trip={trip} leg={editingLeg} />}</ModalBody>
        </ModalContent>
      </Modal>

      <AddLegModal
        isOpen={addCity.isOpen}
        onClose={addCity.onClose}
        trip={trip}
        onAdded={(legId) => {
          addCity.onClose();
          onCityAdded(legId);
        }}
      />
    </Box>
  );
}
