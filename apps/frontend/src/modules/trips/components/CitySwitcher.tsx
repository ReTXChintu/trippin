import { Button, HStack } from "@chakra-ui/react";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";

interface CitySwitcherProps {
  legs: TripLeg[];
  value: string;
  onChange: (legId: string) => void;
}

/** One-row city picker used by the per-city tabs (Places, Stays, Food, Guide). Hidden for single-city trips. */
export function CitySwitcher({ legs, value, onChange }: CitySwitcherProps) {
  if (legs.length < 2) return null;
  return (
    <HStack spacing={1} flexWrap="wrap">
      {legs.map((leg) => {
        const active = leg.id === value;
        return (
          <Button
            key={leg.id}
            size="sm"
            variant={active ? "solid" : "ghost"}
            colorScheme={active ? "brand" : "gray"}
            onClick={() => onChange(leg.id)}
          >
            {leg.name || leg.baseCity}
          </Button>
        );
      })}
    </HStack>
  );
}
