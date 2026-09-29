import {
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
  Text,
  useBreakpointValue,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { FiAlertTriangle, FiEdit2, FiExternalLink, FiMoreHorizontal, FiPlus, FiTrash2 } from "react-icons/fi";
import { LuTicket } from "react-icons/lu";
import { ChoiceChip, EmptyState } from "@/components/ui";
import { IconTile, SectionTitle, TabSplit } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/api";
import { useRemoveBooking } from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLegTransfer } from "@/modules/trips/types/trip-leg.types";
import { TRANSPORT_BOOKING_TYPES, type TripBooking } from "@/modules/trips/types/trip-extras.types";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import { formatMoney } from "@/modules/trips/utils/money";
import { BOOKING_META, tripDayNumber } from "./bookingMeta";
import { BookingFormCard, BookingFormModal } from "./BookingFormModal";

type Filter = "all" | "transport" | "activities";

function fmt(date: string, pattern: string): string {
  try {
    return format(parseISO(date), pattern);
  } catch {
    return date;
  }
}

function BookingRow({ booking, trip, onEdit, onRemove }: { booking: TripBooking; trip: Trip; onEdit: () => void; onRemove: () => void }) {
  const meta = BOOKING_META[booking.type];
  const transfer = booking.transferId ? trip.transfers.find((t) => t.id === booking.transferId) : undefined;
  const linkedDay = transfer ? tripDayNumber(trip, booking.startDate) : undefined;
  const times = [
    booking.startTime,
    booking.endTime ? `→ ${booking.endDate && booking.endDate !== booking.startDate ? `${fmt(booking.endDate, "d MMM")} ` : ""}${booking.endTime}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const sub = [
    fmt(booking.startDate, "EEE d MMM"),
    times,
    (booking.fromPlace || booking.toPlace) && `${booking.fromPlace ?? ""} → ${booking.toPlace ?? ""}`,
    booking.provider,
    linkedDay ? `linked to Day ${linkedDay}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Flex align="center" gap={3} px={4} py="14px" bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl" minW={0}>
      <IconTile icon={meta.icon} size={40} tone="accent" />
      <Flex direction="column" flex={1} minW={0}>
        <Text fontWeight={600} noOfLines={1}>
          {booking.title}
        </Text>
        <Text fontSize="12px" color="fg.muted" noOfLines={2}>
          {sub}
        </Text>
        {booking.notes && (
          <Text fontSize="12px" color="fg.muted" noOfLines={1}>
            {booking.notes}
          </Text>
        )}
      </Flex>
      <Flex direction="column" textAlign="right" display={{ base: "none", sm: "flex" }} flexShrink={0}>
        <Text fontWeight={600} fontSize="12px">
          {fmt(booking.startDate, "d MMM")}
        </Text>
        {booking.confirmationNumber && (
          <Text fontSize="12px" color="fg.muted" letterSpacing="0.02em">
            Conf. {booking.confirmationNumber}
          </Text>
        )}
      </Flex>
      <Text fontWeight={600} w={{ base: "auto", sm: "80px" }} textAlign="right" flexShrink={0}>
        {booking.cost !== undefined ? formatMoney(booking.cost, booking.currency ?? trip.currency) : ""}
      </Text>
      <Menu isLazy placement="bottom-end">
        <MenuButton as={IconButton} aria-label={`Actions for ${booking.title}`} title="Booking actions" icon={<FiMoreHorizontal size={18} />} variant="ghost" flexShrink={0} />
        <MenuList zIndex={20}>
          <MenuItem icon={<FiEdit2 />} onClick={onEdit}>
            Edit
          </MenuItem>
          {booking.url && (
            <MenuItem as="a" href={booking.url} target="_blank" rel="noopener noreferrer" icon={<FiExternalLink />}>
              Open booking
            </MenuItem>
          )}
          <MenuItem icon={<FiTrash2 />} color="danger" onClick={onRemove}>
            Remove
          </MenuItem>
        </MenuList>
      </Menu>
    </Flex>
  );
}

export function BookingsView({ trip }: { trip: Trip }) {
  const toast = useToast();
  const remove = useRemoveBooking(trip.id);
  const isWide = useBreakpointValue({ base: false, xl: true }, { ssr: false }) ?? true;
  const [editing, setEditing] = useState<Partial<TripBooking> | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const legs = getEffectiveLegs(trip);

  const sorted = [...trip.bookings].sort((a, b) => `${a.startDate} ${a.startTime ?? ""}`.localeCompare(`${b.startDate} ${b.startTime ?? ""}`));
  const isTransport = (b: TripBooking) => TRANSPORT_BOOKING_TYPES.includes(b.type);
  const shown = sorted.filter((b) => (filter === "all" ? true : filter === "transport" ? isTransport(b) : !isTransport(b)));

  const unbookedTransfers = trip.transfers.filter((t) => !trip.bookings.some((b) => b.transferId === t.id && isTransport(b)));
  const legName = (id: string) => legs.find((l) => l.id === id)?.name || legs.find((l) => l.id === id)?.baseCity || "";
  const transferDraft = (t: TripLegTransfer): Partial<TripBooking> => ({
    type: "train",
    startDate: t.date,
    transferId: t.id,
    title: `${legName(t.fromLegId)} → ${legName(t.toLegId)}`,
    fromPlace: legName(t.fromLegId),
    toPlace: legName(t.toLegId),
  });

  const open = (draft: Partial<TripBooking> | null) => {
    setEditing(draft);
    setFormKey((k) => k + 1);
  };

  const handleRemove = async (booking: TripBooking) => {
    try {
      await remove.mutateAsync(booking.id);
      toast({ title: "Booking removed", status: "success", duration: 2000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const main = (
    <Stack spacing="14px">
      {unbookedTransfers.map((t) => (
        <Flex key={t.id} align="center" gap={3} px={4} py="14px" bg="warn.soft" color="warn" borderRadius="xl" flexWrap={{ base: "wrap", sm: "nowrap" }}>
          <Icon as={FiAlertTriangle} boxSize="18px" flexShrink={0} />
          <Flex direction="column" flex={1} minW="180px">
            <Text fontWeight={600}>
              {legName(t.fromLegId)} → {legName(t.toLegId)} on {fmt(t.date, "d MMM")} isn&rsquo;t booked yet
            </Text>
            <Text fontSize="12px">A booking sets the real departure and arrival for that travel day.</Text>
          </Flex>
          <Button leftIcon={<FiPlus size={16} />} onClick={() => open(transferDraft(t))} flexShrink={0}>
            Add booking
          </Button>
        </Flex>
      ))}

      <SectionTitle
        aside={
          <Flex gap="6px" flexWrap="wrap" role="group" aria-label="Filter bookings">
            <ChoiceChip selected={filter === "all"} onClick={() => setFilter("all")}>
              All
            </ChoiceChip>
            <ChoiceChip selected={filter === "transport"} onClick={() => setFilter("transport")}>
              Transport
            </ChoiceChip>
            <ChoiceChip selected={filter === "activities"} onClick={() => setFilter("activities")}>
              Activities
            </ChoiceChip>
          </Flex>
        }
      >
        Booked · {trip.bookings.length}
      </SectionTitle>

      {sorted.length === 0 ? (
        <Box bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl">
          <EmptyState
            icon={LuTicket}
            title="Nothing booked yet"
            text="Flights, trains, tours, tickets and tables — every confirmation number in one place. Hotels live under Stays."
            compact
            action={
              !isWide ? (
                <Button leftIcon={<FiPlus />} onClick={() => open({})}>
                  Add booking
                </Button>
              ) : undefined
            }
          />
        </Box>
      ) : shown.length === 0 ? (
        <Text fontSize="13px" color="fg.muted">
          No {filter === "transport" ? "transport" : "activity"} bookings yet.
        </Text>
      ) : (
        shown.map((b) => <BookingRow key={b.id} booking={b} trip={trip} onEdit={() => open(b)} onRemove={() => void handleRemove(b)} />)
      )}

      {sorted.length > 0 && (
        <Box>
          <Button variant="outline" leftIcon={<FiPlus />} onClick={() => open({})}>
            Add booking
          </Button>
        </Box>
      )}
    </Stack>
  );

  // Desktop: the form lives in the right pane — the edited booking, else a new one prefilled
  // from the first unbooked travel day.
  const inlineInitial = editing ?? (unbookedTransfers[0] ? transferDraft(unbookedTransfers[0]) : {});
  const aside = isWide ? (
    <BookingFormCard
      key={`${formKey}-${editing?.id ?? inlineInitial.transferId ?? "new"}`}
      trip={trip}
      initial={inlineInitial}
      onDone={() => open(null)}
      onCancel={editing ? () => open(null) : undefined}
    />
  ) : undefined;

  return (
    <>
      <TabSplit main={main} aside={aside} mainWidth={700} />
      {!isWide && <BookingFormModal trip={trip} initial={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
