import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Link,
  Stack,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { FiEdit2, FiExternalLink, FiPlus, FiTrash2 } from "react-icons/fi";
import { getApiErrorMessage } from "@/lib/api";
import { useRemoveBooking } from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";
import { TRANSPORT_BOOKING_TYPES, type TripBooking } from "@/modules/trips/types/trip-extras.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import { formatShortDate } from "@/modules/trips/utils/stay.utils";
import { formatMoney } from "@/modules/trips/utils/money";
import { BOOKING_META } from "./bookingMeta";
import { BookingFormModal } from "./BookingFormModal";

function BookingCard({ booking, trip, onEdit, onRemove }: { booking: TripBooking; trip: Trip; onEdit: () => void; onRemove: () => void }) {
  const bg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const muted = useColorModeValue("gray.500", "gray.400");
  const meta = BOOKING_META[booking.type];
  const transfer = booking.transferId ? trip.transfers.find((t) => t.id === booking.transferId) : undefined;

  const when = [
    booking.startTime,
    booking.endTime ? `→ ${booking.endDate && booking.endDate !== booking.startDate ? `${formatShortDate(booking.endDate)} ` : ""}${booking.endTime}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Flex p={4} bg={bg} borderWidth="1px" borderColor={border} borderRadius="xl" gap={4} align="start">
      <Flex boxSize="44px" borderRadius="lg" bg={`${meta.color}.50`} _dark={{ bg: "whiteAlpha.100" }} align="center" justify="center" flexShrink={0}>
        <Icon as={meta.icon} boxSize={5} color={`${meta.color}.500`} />
      </Flex>
      <Box flex={1} minW={0}>
        <HStack spacing={2} flexWrap="wrap">
          <Text fontWeight="semibold">{booking.title}</Text>
          {transfer && (
            <Badge colorScheme="purple" variant="subtle" fontSize="2xs">
              Sets the travel day
            </Badge>
          )}
        </HStack>
        {(booking.fromPlace || booking.toPlace) && (
          <Text fontSize="sm">
            {booking.fromPlace} → {booking.toPlace}
          </Text>
        )}
        <HStack spacing={3} fontSize="xs" color={muted} mt={1} flexWrap="wrap">
          {when && <Text>{when}</Text>}
          {booking.provider && <Text>{booking.provider}</Text>}
          {booking.confirmationNumber && <Text fontWeight="semibold">Conf. {booking.confirmationNumber}</Text>}
          {booking.cost !== undefined && <Text>{formatMoney(booking.cost, booking.currency ?? trip.currency)}</Text>}
        </HStack>
        {booking.notes && (
          <Text fontSize="xs" mt={1}>
            📝 {booking.notes}
          </Text>
        )}
        {booking.url && (
          <Link href={booking.url} isExternal fontSize="xs" color="brand.500" mt={1} display="inline-block">
            Open booking <Icon as={FiExternalLink} mx="2px" />
          </Link>
        )}
      </Box>
      <HStack spacing={0}>
        <IconButton aria-label="Edit booking" icon={<FiEdit2 />} size="sm" variant="ghost" onClick={onEdit} />
        <IconButton aria-label="Remove booking" icon={<FiTrash2 />} size="sm" variant="ghost" colorScheme="red" onClick={onRemove} />
      </HStack>
    </Flex>
  );
}

export function BookingsView({ trip }: { trip: Trip }) {
  const toast = useToast();
  const remove = useRemoveBooking(trip.id);
  const [editing, setEditing] = useState<Partial<TripBooking> | null>(null);
  const muted = useColorModeValue("gray.500", "gray.400");
  const legs = getEffectiveLegs(trip);

  const sorted = [...trip.bookings].sort((a, b) =>
    `${a.startDate} ${a.startTime ?? ""}`.localeCompare(`${b.startDate} ${b.startTime ?? ""}`),
  );
  const byDate = new Map<string, TripBooking[]>();
  for (const b of sorted) byDate.set(b.startDate, [...(byDate.get(b.startDate) ?? []), b]);

  const unbookedTransfers = trip.transfers.filter(
    (t) => !trip.bookings.some((b) => b.transferId === t.id && TRANSPORT_BOOKING_TYPES.includes(b.type)),
  );
  const legName = (id: string) => legs.find((l) => l.id === id)?.name || legs.find((l) => l.id === id)?.baseCity || "";

  const handleRemove = async (booking: TripBooking) => {
    try {
      await remove.mutateAsync(booking.id);
      toast({ title: "Booking removed", status: "success", duration: 2000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Stack spacing={6} maxW="900px">
      <Flex justify="space-between" align="start" gap={3} flexWrap="wrap">
        <Box>
          <Heading size="md">Bookings</Heading>
          <Text fontSize="sm" color={muted}>
            Flights, trains, tours, tickets and tables — every confirmation number in one place. Hotels live under Stays.
          </Text>
        </Box>
        <Button leftIcon={<FiPlus />} colorScheme="brand" onClick={() => setEditing({})}>
          Add booking
        </Button>
      </Flex>

      {unbookedTransfers.map((t) => (
        <Alert key={t.id} status="info" borderRadius="md" fontSize="sm" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <HStack>
            <AlertIcon />
            <Text>
              {legName(t.fromLegId)} → {legName(t.toLegId)} on {formatShortDate(t.date)} isn't booked yet.
            </Text>
          </HStack>
          <Button
            size="xs"
            onClick={() =>
              setEditing({
                type: "train",
                startDate: t.date,
                transferId: t.id,
                title: `${legName(t.fromLegId)} → ${legName(t.toLegId)}`,
                fromPlace: legName(t.fromLegId),
                toPlace: legName(t.toLegId),
              })
            }
          >
            Add the booking
          </Button>
        </Alert>
      ))}

      {sorted.length === 0 ? (
        <Text fontSize="sm" color={muted}>
          Nothing booked yet.
        </Text>
      ) : (
        [...byDate.entries()].map(([date, bookings]) => (
          <Stack key={date} spacing={3}>
            <Text fontSize="sm" fontWeight="semibold" color={muted}>
              {formatShortDate(date)}
            </Text>
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} trip={trip} onEdit={() => setEditing(b)} onRemove={() => void handleRemove(b)} />
            ))}
          </Stack>
        ))
      )}

      <BookingFormModal trip={trip} initial={editing} onClose={() => setEditing(null)} />
    </Stack>
  );
}
