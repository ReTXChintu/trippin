import { Badge, Box, Flex, Icon, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { LuGem, LuInfo, LuPartyPopper, LuShoppingBag, LuUtensils } from "react-icons/lu";
import type { LegDestinationBrief } from "@/modules/trips/types/trip-enrichment.types";
import type { TripLeg } from "@/modules/trips/types/trip-leg.types";
import { splitDish } from "@/modules/trips/components/tabs/placeMeta";

interface DestinationGuidePanelProps {
  legs: Array<{ leg: TripLeg; brief?: LegDestinationBrief }>;
  singleBrief?: LegDestinationBrief;
}

function GuideCard({ icon, title, children }: { icon: IconType; title: string; children: ReactNode }) {
  return (
    <Box as="section" p="18px" bg="sf" borderWidth="1px" borderColor="ln" borderRadius="xl" aria-label={title}>
      <Flex align="center" gap={2} fontWeight={600} fontSize="15px" mb="10px">
        <Icon as={icon} color="ac" boxSize="18px" />
        <Text as="h3">{title}</Text>
      </Flex>
      {children}
    </Box>
  );
}

function Lines({ items }: { items: { name: string; description?: string }[] }) {
  return (
    <Stack as="ul" spacing="6px" fontSize="12px" listStyleType="none">
      {items.map((item) => (
        <Text as="li" key={item.name + (item.description ?? "")}>
          <b>{item.name}</b>
          {item.description ? <> &mdash; {item.description}</> : null}
        </Text>
      ))}
    </Stack>
  );
}

function StaticChip({ children }: { children: ReactNode }) {
  return (
    <Flex as="li" align="center" h="32px" px={3} borderRadius="full" borderWidth="1px" borderColor="ln" bg="sf" fontSize="13px" fontWeight={500} whiteSpace="nowrap">
      {children}
    </Flex>
  );
}

/** The AI local guide for one city: specialties, local food, markets, festivals and tips. */
export function GuideSections({ brief }: { brief: LegDestinationBrief }) {
  return (
    <Stack spacing={4}>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <GuideCard icon={LuGem} title="Specialties">
          {brief.specialties.length ? (
            <Flex as="ul" gap="6px" flexWrap="wrap" listStyleType="none">
              {brief.specialties.map((item) => (
                <StaticChip key={item}>{item}</StaticChip>
              ))}
            </Flex>
          ) : (
            <Text fontSize="12px" color="tx3">
              Nothing listed.
            </Text>
          )}
        </GuideCard>
        <GuideCard icon={LuUtensils} title="Local food">
          {brief.localFood.length ? (
            <Lines items={brief.localFood.map(splitDish)} />
          ) : (
            <Text fontSize="12px" color="tx3">
              Nothing listed.
            </Text>
          )}
        </GuideCard>
        <GuideCard icon={LuShoppingBag} title="Markets & what to buy">
          {brief.markets.length ? (
            <Lines items={brief.markets.map((m) => ({ name: m.name, description: m.whatToBuy.length ? `${m.whatToBuy.join(", ")}.` : undefined }))} />
          ) : (
            <Text fontSize="12px" color="tx3">
              Nothing listed.
            </Text>
          )}
        </GuideCard>
        <GuideCard icon={LuPartyPopper} title="Festivals & events">
          {brief.festivals.length ? (
            <Lines items={brief.festivals.map(splitDish)} />
          ) : (
            <Text fontSize="12px">Nothing major is listed for your dates.</Text>
          )}
        </GuideCard>
      </SimpleGrid>
      {brief.generalTips.length > 0 && (
        <GuideCard icon={LuInfo} title="Good to know">
          <Stack as="ul" spacing="6px" fontSize="12px" listStyleType="none">
            {brief.generalTips.map((tip) => (
              <Text as="li" key={tip}>
                {tip}
              </Text>
            ))}
          </Stack>
        </GuideCard>
      )}
    </Stack>
  );
}

export function DestinationGuidePanel({ legs, singleBrief }: DestinationGuidePanelProps) {
  const withBriefs = legs.filter((l) => l.brief);
  if (withBriefs.length === 0 && !singleBrief) {
    return (
      <Text fontSize="13px" color="tx3">
        Generate the local guide for specialties, food picks, markets, festivals and tips.
      </Text>
    );
  }

  if (singleBrief && legs.length <= 1) return <GuideSections brief={singleBrief} />;
  if (withBriefs.length === 1) return <GuideSections brief={withBriefs[0].brief!} />;

  return (
    <Stack spacing={6}>
      {withBriefs.map(({ leg, brief }) => (
        <Stack key={leg.id} spacing={3}>
          <Text as="h2" fontWeight={600} fontSize="17px" lineHeight="24px">
            {leg.name || leg.baseCity}
          </Text>
          <GuideSections brief={brief!} />
        </Stack>
      ))}
    </Stack>
  );
}

export function HypeBadge({ level }: { level?: string }) {
  if (!level) return null;
  const scheme = level === "overhyped" ? "red" : level === "hidden-gem" ? "teal" : "green";
  const label = level === "overhyped" ? "Overhyped" : level === "hidden-gem" ? "Hidden gem" : "Worth it";
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
