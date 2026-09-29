import { Flex } from "@chakra-ui/react";
import { ChoiceChip, WarnDot } from "@/components/ui";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import { getUncoveredNights } from "@/modules/trips/utils/stay.utils";

interface CitySwitcherProps {
  legs: TripLeg[];
  value: string;
  onChange: (legId: string) => void;
}

/** One-row city picker used by the per-city tabs (Places, Stays, Food, Guide). Hidden for single-city trips. */
export function CitySwitcher({ legs, value, onChange }: CitySwitcherProps) {
  if (legs.length < 2) return null;
  return (
    <Flex role="group" aria-label="City" gap="6px" flexWrap="wrap">
      {legs.map((leg) => (
        <ChoiceChip key={leg.id} selected={leg.id === value} onClick={() => onChange(leg.id)}>
          {leg.name || leg.baseCity}
          {getUncoveredNights(leg).length > 0 && <WarnDot title="Some nights have no stay" />}
        </ChoiceChip>
      ))}
    </Flex>
  );
}
