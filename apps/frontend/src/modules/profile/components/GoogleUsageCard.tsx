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
    <SurfaceCard as="section" id={id} scrollMarginTop="80px" aria-labelledby="google-usage-title" p={5} display="flex" flexDirection="column" gap={4}>
      <Flex justify="space-between" align="flex-start" gap={3} flexWrap="wrap">
        <HStack spacing={3} align="flex-start">
          <Flex w="40px" h="40px" borderRadius="md" bg="acSoft" color="ac" align="center" justify="center" flexShrink={0}>
            <Icon as={FiBarChart2} boxSize="20px" />
          </Flex>
          <Box>
            <Text as="h3" id="google-usage-title" fontWeight={600} fontSize="17px" lineHeight="24px">
              Google Maps usage this month
            </Text>
            <Text fontSize="13px" lineHeight="18px" color="tx3">
              Google gives free calls every month for each kind of request; past that, your key&rsquo;s billing account pays.
            </Text>
          </Box>
        </HStack>
        {data?.source === "own" && <Pill tone="success">Your key</Pill>}
      </Flex>

      {isLoading || !data ? (
        <Skeleton h="80px" borderRadius="lg" />
      ) : data.source === "none" ? (
        <Banner tone="accent" action={<Button as={RouterLink} to="/help/google-maps-key" size="sm">Setup guide</Button>}>
          Add your Google Maps key above to search places, see photos and get real routes. The guide walks through it in about 10 minutes.
        </Banner>
      ) : (
        <>
          <Flex gap={3} direction={{ base: "column", sm: "row" }}>
            <Box flex={1} bg="sf2" borderWidth="1px" borderColor="ln" borderRadius="xl" p="14px">
              <Text fontSize="12px" lineHeight="16px" fontWeight={600} letterSpacing="0.02em" color="tx2">
                Estimated cost · {data.month}
              </Text>
              <Text fontSize="22px" lineHeight="28px" fontWeight={600} mt={1} className="num" color={data.estimatedUsd > 0 ? "warn" : "tx"}>
                {usd(data.estimatedUsd)}
              </Text>
              <Text fontSize="12px" lineHeight="16px" color="tx3">
                {data.estimatedUsd > 0 ? "Past the free amounts — your billing account is charged." : "Within Google’s free monthly amounts."}
              </Text>
            </Box>
            <Box flex={1} bg="sf2" borderWidth="1px" borderColor="ln" borderRadius="xl" p="14px">
              <Text fontSize="12px" lineHeight="16px" fontWeight={600} letterSpacing="0.02em" color="tx2">
                Calls
              </Text>
              <Text fontSize="22px" lineHeight="28px" fontWeight={600} mt={1} className="num">
                {num(data.lines.reduce((s, l) => s + l.month, 0))}
              </Text>
              <Text fontSize="12px" lineHeight="16px" color="tx3" className="num">{num(data.lines.reduce((s, l) => s + l.today, 0))} today · free amounts reset on the 1st (Pacific time)</Text>
            </Box>
          </Flex>

          {data.lines.length === 0 ? (
            <Text fontSize="13px" color="tx3">
              No Google calls yet this month.
            </Text>
          ) : (
            <Stack spacing="12px">
              {data.lines.map((l) => {
                const pct = (l.month / l.freePerMonth) * 100;
                const fill = pct >= 100 ? "critFill" : pct >= 80 ? "warnFill" : "ac";
                return (
                  <Box key={l.sku}>
                    <Flex justify="space-between" gap={2} fontSize="13px" lineHeight="18px" flexWrap="wrap">
                      <HStack spacing="6px" minW={0}>
                        <Text fontWeight={600} noOfLines={1}>
                          {l.label}
                        </Text>
                        <Pill h="20px" px="6px" fontSize="11px">
                          {l.tier}
                        </Pill>
                      </HStack>
                      <Text color={pct >= 100 ? "crit" : "tx3"} fontWeight={pct >= 100 ? 600 : 400} className="num">
                        {num(l.month)} of {num(l.freePerMonth)} free{l.today ? ` · ${num(l.today)} today` : ""}
                        {l.estimatedUsd > 0 ? ` · ${usd(l.estimatedUsd)}` : ""}
                      </Text>
                    </Flex>
                    <Progress
                      mt="6px"
                      value={Math.min(100, pct)}
                      h="6px"
                      bg="sunk"
                      sx={{ "& > div": { bg: fill } }}
                      borderRadius="full"
                      aria-label={`${l.label}: ${num(l.month)} of ${num(l.freePerMonth)} free calls used`}
                    />
                  </Box>
                );
              })}
            </Stack>
          )}

          <Text fontSize="12px" lineHeight="17px" color="tx3">
            Counts only what Trippin called with this key — if you use the key elsewhere, Google&rsquo;s numbers will be higher.
            Prices: Google&rsquo;s list prices per 1,000 calls, before taxes or credits. Your real bill is in Google Cloud.
          </Text>
          <Flex gap="8px" flexWrap="wrap">
            {[
              { href: GOOGLE_CONSOLE.billing, label: "Billing" },
              { href: GOOGLE_CONSOLE.metrics, label: "Usage reports" },
              { href: GOOGLE_CONSOLE.quotas, label: "Set daily quotas" },
              { href: GOOGLE_CONSOLE.budgets, label: "Budget alerts" },
            ].map((l) => (
              <Button key={l.href} as={Link} href={l.href} isExternal size="sm" variant="outline" color="tx" rightIcon={<FiExternalLink />}>
                {l.label}
              </Button>
            ))}
          </Flex>
        </>
      )}
    </SurfaceCard>
  );
}
