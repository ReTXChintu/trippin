import { Box, Button, Flex, HStack, Icon, Link, Progress, Skeleton, Stack, Text } from "@chakra-ui/react";
import { FiBarChart2, FiExternalLink } from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import { Banner, Pill, SurfaceCard } from "@/components/ui";
import { GOOGLE_CONSOLE } from "@/modules/profile/constants/google-console";
import { useGoogleUsageQuery } from "@/modules/profile/hooks/useProfile";

const usd = (n: number) => (n === 0 ? "$0" : n < 0.01 ? "< $0.01" : `$${n.toFixed(2)}`);
const num = (n: number) => n.toLocaleString("en-US");

/** This month's Google Maps calls on the user's key against Google's free amounts, with a cost estimate. */
export function GoogleUsageCard({ id }: { id?: string }) {
  const { data, isLoading } = useGoogleUsageQuery();

  return (
    <SurfaceCard as="section" id={id} scrollMarginTop="80px" aria-labelledby="google-usage-title" p="18px" display="flex" flexDirection="column" gap="14px">
      <Flex justify="space-between" align={{ base: "flex-start", sm: "center" }} gap="10px" direction={{ base: "column", sm: "row" }}>
        <HStack spacing="10px">
          <Flex w="36px" h="36px" borderRadius="10px" bg="accent.soft" color="accent.text" align="center" justify="center" flexShrink={0}>
            <Icon as={FiBarChart2} boxSize="18px" />
          </Flex>
          <Box>
            <Text as="h3" id="google-usage-title" fontWeight={600}>
              Google Maps usage this month
            </Text>
            <Text fontSize="12px" color="fg.muted">
              Google gives free calls every month for each kind of request; past that, your key&rsquo;s billing account pays.
            </Text>
          </Box>
        </HStack>
        {data?.source === "own" && <Pill tone="success">Your key</Pill>}
        {data?.source === "server" && <Pill tone="accent">Shared server key</Pill>}
      </Flex>

      {isLoading || !data ? (
        <Skeleton h="80px" borderRadius="lg" />
      ) : data.source === "none" ? (
        <Banner tone="accent" action={<Button as={RouterLink} to="/help/google-maps-key" size="sm">Setup guide</Button>}>
          Add your Google Maps key above to search places, see photos and get real routes. The guide walks through it in about 10 minutes.
        </Banner>
      ) : (
        <>
          <Flex gap="12px" direction={{ base: "column", sm: "row" }}>
            <Box flex={1} bg="bg.subtle" borderRadius="lg" px="14px" py="10px">
              <Text fontSize="11px" fontWeight={600} color="fg.muted" textTransform="uppercase" letterSpacing="0.06em">
                Estimated cost · {data.month}
              </Text>
              <Text fontFamily="heading" fontSize="26px" fontWeight={600} color={data.estimatedUsd > 0 ? "warn" : "fg.default"}>
                {usd(data.estimatedUsd)}
              </Text>
              <Text fontSize="12px" color="fg.muted">
                {data.estimatedUsd > 0 ? "Past the free amounts — your billing account is charged." : "Within Google’s free monthly amounts."}
              </Text>
            </Box>
            <Box flex={1} bg="bg.subtle" borderRadius="lg" px="14px" py="10px">
              <Text fontSize="11px" fontWeight={600} color="fg.muted" textTransform="uppercase" letterSpacing="0.06em">
                Calls
              </Text>
              <Text fontFamily="heading" fontSize="26px" fontWeight={600}>
                {num(data.lines.reduce((s, l) => s + l.month, 0))}
              </Text>
              <Text fontSize="12px" color="fg.muted">{num(data.lines.reduce((s, l) => s + l.today, 0))} today · free amounts reset on the 1st (Pacific time)</Text>
            </Box>
          </Flex>

          {data.lines.length === 0 ? (
            <Text fontSize="13px" color="fg.muted">
              No Google calls yet this month.
            </Text>
          ) : (
            <Stack spacing="12px">
              {data.lines.map((l) => {
                const pct = (l.month / l.freePerMonth) * 100;
                const fill = pct >= 100 ? "danger" : pct >= 80 ? "warn" : "accent";
                return (
                  <Box key={l.sku}>
                    <Flex justify="space-between" gap="8px" fontSize="13px" flexWrap="wrap">
                      <HStack spacing="6px" minW={0}>
                        <Text fontWeight={600} noOfLines={1}>
                          {l.label}
                        </Text>
                        <Pill h="20px" fontSize="11px">
                          {l.tier}
                        </Pill>
                      </HStack>
                      <Text color={pct >= 100 ? "danger" : "fg.muted"}>
                        {num(l.month)} of {num(l.freePerMonth)} free{l.today ? ` · ${num(l.today)} today` : ""}
                        {l.estimatedUsd > 0 ? ` · ${usd(l.estimatedUsd)}` : ""}
                      </Text>
                    </Flex>
                    <Progress
                      mt="6px"
                      value={Math.min(100, pct)}
                      h="6px"
                      bg="bg.subtle"
                      sx={{ "& > div": { bg: fill } }}
                      borderRadius="full"
                      aria-label={`${l.label}: ${num(l.month)} of ${num(l.freePerMonth)} free calls used`}
                    />
                  </Box>
                );
              })}
            </Stack>
          )}

          <Text fontSize="12px" color="fg.muted">
            {data.source === "server"
              ? "This is everyone’s usage on the shared key the server provides. "
              : "Counts only what Trippin called with this key — if you use the key elsewhere, Google’s numbers will be higher. "}
            Prices: Google&rsquo;s list prices per 1,000 calls, before taxes or credits. Your real bill is in Google Cloud.
          </Text>
          <Flex gap="8px" flexWrap="wrap">
            {[
              { href: GOOGLE_CONSOLE.billing, label: "Billing" },
              { href: GOOGLE_CONSOLE.metrics, label: "Usage reports" },
              { href: GOOGLE_CONSOLE.quotas, label: "Set daily quotas" },
              { href: GOOGLE_CONSOLE.budgets, label: "Budget alerts" },
            ].map((l) => (
              <Button key={l.href} as={Link} href={l.href} isExternal size="sm" variant="outline" rightIcon={<FiExternalLink />}>
                {l.label}
              </Button>
            ))}
          </Flex>
        </>
      )}
    </SurfaceCard>
  );
}
