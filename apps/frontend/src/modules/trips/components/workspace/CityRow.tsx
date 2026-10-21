import { Flex, Icon, IconButton, Text, Tooltip } from "@chakra-ui/react";
import { Fragment } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { LuMapPin, LuPencil, LuPlus } from "react-icons/lu";
import { ChoiceChip, WarnDot } from "@/components/ui";
import { modeIcon } from "@/components/ui/plan.utils";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import { getEffectiveTransfers } from "@/modules/trips/utils/trip-leg.utils";
import { getUncoveredNights } from "@/modules/trips/utils/stay.utils";
import { formatDayDate } from "@/modules/itinerary/utils/plan.utils";

function nightsOf(leg: TripLeg): number {
  try {
    return Math.max(differenceInCalendarDays(parseISO(leg.endDate), parseISO(leg.startDate)), 0);
  } catch {
    return 0;
  }
}

function legRange(leg: TripLeg): string {
  const start = formatDayDate(leg.startDate, "d");
  const end = formatDayDate(leg.endDate, "d MMM");
  const sameMonth = formatDayDate(leg.startDate, "MMM") === formatDayDate(leg.endDate, "MMM");
  return sameMonth ? `${start}–${end}` : `${formatDayDate(leg.startDate, "d MMM")} – ${end}`;
}

interface CityRowProps {
  trip: Trip;
  legs: TripLeg[];
  cityId: string | null;
  onCity: (legId: string | null) => void;
  onEditCity?: (legId: string) => void;
  onAddCity?: () => void;
  onTransfer: () => void;
  /** Phone: compact chips (name + warning dot only). */
  compact?: boolean;
}

/** "CITY  All cities · Jaipur 5–8 Oct · 3 nights · Drive to Udaipur · Udaipur … + Add city". */
export function CityRow({ trip, legs, cityId, onCity, onEditCity, onAddCity, onTransfer, compact }: CityRowProps) {
  const transfers = getEffectiveTransfers(trip);
  const booked = new Set((trip.bookings ?? []).map((b) => b.transferId).filter(Boolean));
  const TransferIcon = modeIcon(trip.transportationMode);

  return (
    <Flex
      role="group"
      aria-label="City filter"
      align="center"
      gap={compact ? "6px" : 2}
      flexWrap={compact ? "nowrap" : "wrap"}
      overflowX={compact ? "auto" : undefined}
      sx={compact ? { scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } } : undefined}
    >
      {!compact && (
        <Text as="span" fontSize="12px" lineHeight="16px" fontWeight={600} letterSpacing="0.02em" color="tx2" mr={1}>
          City
        </Text>
      )}
      <ChoiceChip size="lg" selected={!cityId} onClick={() => onCity(null)} flexShrink={0}>
        All cities
      </ChoiceChip>
      {legs.map((leg, i) => {
        const uncovered = getUncoveredNights(leg).length;
        const nights = nightsOf(leg);
        const selected = cityId === leg.id;
        const transfer = i < legs.length - 1 ? transfers.find((t) => t.fromLegId === leg.id) : undefined;
        const unbooked = transfer && !booked.has(transfer.id);
        return (
          <Fragment key={leg.id}>
            <Flex align="center" gap={1} flexShrink={0}>
              <ChoiceChip size="lg" selected={selected} onClick={() => onCity(selected ? null : leg.id)} icon={compact ? undefined : LuMapPin}>
                {leg.name || leg.baseCity}
                {!compact && (
                  <Text as="span" fontWeight={400} color={selected ? "acTx" : "tx3"} opacity={selected ? 0.85 : 1}>
                    {legRange(leg)} · {nights} night{nights === 1 ? "" : "s"}
                  </Text>
                )}
                {uncovered > 0 && <WarnDot title="No stay for some nights" aria-label={`${uncovered} nights without a stay`} />}
              </ChoiceChip>
              {selected && onEditCity && (
                <Tooltip label="Edit dates, arrival/departure and day trips" hasArrow>
                  <IconButton aria-label={`Edit ${leg.name || leg.baseCity}`} icon={<LuPencil size={15} />} variant="ghost" colorScheme="gray" size="sm" onClick={() => onEditCity(leg.id)} />
                </Tooltip>
              )}
            </Flex>
            {transfer && !compact && (
              <Flex
                as="button"
                type="button"
                onClick={onTransfer}
                title={unbooked ? "Travel day not booked yet" : "Booked"}
                align="center"
                gap="6px"
                h="28px"
                px={3}
                borderRadius="full"
                borderWidth="1px"
                borderStyle="dashed"
                borderColor="ln"
                fontSize="12px"
                fontWeight={500}
                color={unbooked ? "warn" : "tx3"}
                bg="sf"
                whiteSpace="nowrap"
                flexShrink={0}
                _hover={{ textDecoration: "underline" }}
              >
                <Icon as={TransferIcon} boxSize="13px" />
                {transfer.label} · {formatDayDate(transfer.date, "d MMM")}
                {unbooked && <WarnDot />}
              </Flex>
            )}
          </Fragment>
        );
      })}
      {onAddCity && !compact && (
        <ChoiceChip size="lg" onClick={onAddCity} icon={LuPlus} borderStyle="dashed" color="tx3" flexShrink={0}>
          Add city
        </ChoiceChip>
      )}
    </Flex>
  );
}
