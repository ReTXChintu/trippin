"use client";

import {
  Badge,
  Box,
  Heading,
  List,
  ListItem,
  Stack,
  Tag,
  Text,
  useColorModeValue,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import type { LegDestinationBrief } from "@/modules/trips/types/trip-enrichment.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";

interface DestinationGuidePanelProps {
  legs: Array<{ leg: TripLeg; brief?: LegDestinationBrief }>;
  singleBrief?: LegDestinationBrief;
}

function BriefSection({ title, brief }: { title: string; brief: LegDestinationBrief }) {
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bg = useColorModeValue("white", "gray.800");

  return (
    <Box p={4} borderWidth="1px" borderColor={borderColor} borderRadius="lg" bg={bg}>
      <Heading size="sm" mb={3}>
        {title}
      </Heading>

      {brief.specialties.length > 0 && (
        <Box mb={3}>
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={1} textTransform="uppercase">
            Specialties
          </Text>
          <Wrap spacing={2}>
            {brief.specialties.map((item) => (
              <WrapItem key={item}>
                <Tag size="sm" colorScheme="purple">
                  {item}
                </Tag>
              </WrapItem>
            ))}
          </Wrap>
        </Box>
      )}

      {brief.localFood.length > 0 && (
        <Box mb={3}>
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={1} textTransform="uppercase">
            Food to try
          </Text>
          <Wrap spacing={2}>
            {brief.localFood.map((item) => (
              <WrapItem key={item}>
                <Tag size="sm" colorScheme="orange">
                  {item}
                </Tag>
              </WrapItem>
            ))}
          </Wrap>
        </Box>
      )}

      {brief.markets.length > 0 && (
        <Box mb={3}>
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={2} textTransform="uppercase">
            Markets & shopping
          </Text>
          <Stack spacing={2}>
            {brief.markets.map((market) => (
              <Box key={market.name}>
                <Text fontSize="sm" fontWeight="medium">
                  {market.name}
                </Text>
                {market.whatToBuy.length > 0 && (
                  <Text fontSize="xs" color="gray.500">
                    Buy: {market.whatToBuy.join(", ")}
                  </Text>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {brief.generalTips.length > 0 && (
        <Box>
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={1} textTransform="uppercase">
            Tips
          </Text>
          <List spacing={1} fontSize="sm" styleType="disc" pl={4}>
            {brief.generalTips.map((tip) => (
              <ListItem key={tip}>{tip}</ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
}

export function DestinationGuidePanel({ legs, singleBrief }: DestinationGuidePanelProps) {
  const hasLegBriefs = legs.some((l) => l.brief);
  if (!hasLegBriefs && !singleBrief) {
    return (
      <Text fontSize="sm" color="gray.500">
        Generate the itinerary, then click &quot;AI Travel Guide&quot; for local specialties, food picks, and visit notes.
      </Text>
    );
  }

  if (singleBrief && legs.length <= 1) {
    return <BriefSection title="Local guide" brief={singleBrief} />;
  }

  return (
    <Stack spacing={4}>
      {legs.map(({ leg, brief }) =>
        brief ? (
          <BriefSection key={leg.id} title={leg.name || leg.baseCity} brief={brief} />
        ) : null,
      )}
    </Stack>
  );
}

export function HypeBadge({ level }: { level?: string }) {
  if (!level) return null;
  const scheme =
    level === "overhyped" ? "red" : level === "hidden-gem" ? "teal" : "green";
  const label =
    level === "overhyped" ? "Overhyped" : level === "hidden-gem" ? "Hidden gem" : "Worth it";
  return (
    <Badge colorScheme={scheme} fontSize="2xs">
      {label}
    </Badge>
  );
}

export function StopTypeBadge({ stopType }: { stopType?: string }) {
  if (!stopType || stopType === "sight") return null;
  const labels: Record<string, { label: string; color: string }> = {
    food: { label: "Food", color: "orange" },
    market: { label: "Market", color: "pink" },
    transfer: { label: "Travel", color: "blue" },
  };
  const config = labels[stopType];
  if (!config) return null;
  return (
    <Badge colorScheme={config.color} fontSize="2xs">
      {config.label}
    </Badge>
  );
}
