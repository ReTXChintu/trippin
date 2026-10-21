import { Box, Button, Flex, Grid, Heading, HStack, Link, OrderedList, ListItem, Stack, Table, Tbody, Td, Text, Th, Thead, Tr, UnorderedList } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { FiArrowLeft, FiExternalLink } from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import { Banner, Pill, SurfaceCard } from "@/components/ui";
import { GOOGLE_CONSOLE } from "@/modules/profile/constants/google-console";
import { useGoogleUsageQuery } from "@/modules/profile/hooks/useProfile";

const APIS = [
  { name: "Places API (New)", why: "place search, details, photos, restaurants near a stop", href: "https://console.cloud.google.com/apis/library/places.googleapis.com" },
  { name: "Geocoding API", why: "finding an address you type for a hotel or stay", href: "https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com" },
  { name: "Directions API", why: "real road routes and travel times between stops", href: "https://console.cloud.google.com/apis/library/directions-backend.googleapis.com" },
];

function Step({ n, title, children, action }: { n: number; title: string; children: ReactNode; action?: { href: string; label: string } }) {
  return (
    <SurfaceCard as="li" listStyleType="none" p={5} display="flex" gap={3}>
      <Flex w="28px" h="28px" borderRadius="full" bg="ac" color="acTx" align="center" justify="center" fontWeight={600} fontSize="13px" flexShrink={0} className="num">
        {n}
      </Flex>
      <Box flex={1} minW={0}>
        <Text as="h2" fontWeight={600} fontSize="15px" lineHeight="20px" mt="4px">
          {title}
        </Text>
        <Box fontSize="14px" lineHeight="20px" color="tx2" mt={2} sx={{ "& p + p": { mt: "6px" }, "& b": { color: "tx", fontWeight: 600 }, "& code": { fontFamily: "mono", bg: "sunk", px: 1, borderRadius: "sm" } }}>
          {children}
        </Box>
        {action && (
          <Button as={Link} href={action.href} isExternal size="sm" variant="outline" color="tx" mt={3} rightIcon={<FiExternalLink />}>
            {action.label}
          </Button>
        )}
      </Box>
    </SurfaceCard>
  );
}

/** Step-by-step: get a Google Maps key, lock it down, and keep the bill at zero. */
export function GoogleMapsKeyGuidePage() {
  const { data } = useGoogleUsageQuery();

  return (
    <Box>
      <Button as={RouterLink} to="/profile#api-keys" variant="ghost" size="sm" leftIcon={<FiArrowLeft />} ml="-8px">
        Back to Profile
      </Button>
      <Heading as="h1" fontSize="22px" lineHeight="28px" mt={2}>
        Get your Google Maps key
      </Heading>
      <Text color="tx2" mt={2} fontSize="15px" lineHeight="22px" maxW="760px">
        Trippin uses your own Google Maps key for place search, photos, nearby restaurants and real routes. It takes about 10 minutes.
        Google gives free calls every month, which usually covers a few trips; past that, your own billing account pays.
      </Text>

      <Grid templateColumns={{ base: "minmax(0,1fr)", xl: "minmax(0,2fr) minmax(360px,1fr)" }} gap={5} mt={5} alignItems="start">
      <Stack as="ol" spacing={3} p={0} m={0}>
        <Step n={1} title="Create a Google Cloud project" action={{ href: "https://console.cloud.google.com/projectcreate", label: "Create a project" }}>
          <p>Sign in with your Google account, name the project (for example &ldquo;Trippin&rdquo;) and click Create. Make sure it&rsquo;s selected in the project picker at the top of the console.</p>
        </Step>
        <Step n={2} title="Turn on billing" action={{ href: GOOGLE_CONSOLE.billing, label: "Open billing" }}>
          <p>Google requires a billing account (a card) even for the free monthly calls. Link the project to a billing account. New Google Cloud accounts usually get trial credit as well.</p>
          <p>
            <Text as="span" color="tx3">You&rsquo;re only charged for calls past the free amounts — see step 6 to cap that.</Text>
          </p>
        </Step>
        <Step n={3} title="Enable the three APIs Trippin uses">
          <p>Open each one and click <b>Enable</b>:</p>
          <Stack spacing="8px" mt="8px">
            {APIS.map((a) => (
              <Flex key={a.name} align={{ base: "flex-start", sm: "center" }} justify="space-between" gap={3} bg="sf2" borderWidth="1px" borderColor="ln" borderRadius="lg" px="14px" py={2} direction={{ base: "column", sm: "row" }}>
                <Box>
                  <Text fontWeight={600} color="tx">
                    {a.name}
                  </Text>
                  <Text fontSize="12px" lineHeight="16px" color="tx3">
                    For {a.why}
                  </Text>
                </Box>
                <Button as={Link} href={a.href} isExternal size="sm" variant="outline" color="tx" rightIcon={<FiExternalLink />} flexShrink={0}>
                  Enable
                </Button>
              </Flex>
            ))}
          </Stack>
          <p style={{ marginTop: 8 }}>
            <Text as="span" color="tx3">You don&rsquo;t need the Maps JavaScript API — Trippin&rsquo;s maps are free OpenStreetMap maps.</Text>
          </p>
        </Step>
        <Step n={4} title="Create the API key" action={{ href: "https://console.cloud.google.com/apis/credentials", label: "Open Credentials" }}>
          <p>
            Click <b>Create credentials → API key</b>. Google shows the key (it starts with <code>AIza</code>). Copy it.
          </p>
        </Step>
        <Step n={5} title="Restrict the key" action={{ href: "https://console.cloud.google.com/apis/credentials", label: "Edit the key" }}>
          <p>Open the key you just made, so a leaked key can&rsquo;t be used for anything else:</p>
          <UnorderedList mt="6px" spacing="4px">
            <ListItem>
              <b>API restrictions:</b> choose &ldquo;Restrict key&rdquo; and tick only Places API (New), Geocoding API and Directions API.
            </ListItem>
            <ListItem>
              <b>Application restrictions:</b> pick &ldquo;IP addresses&rdquo; and add your Trippin server&rsquo;s IP, or leave &ldquo;None&rdquo;. Don&rsquo;t pick &ldquo;Websites&rdquo; — Trippin calls Google
              from its server, not your browser, so a website restriction blocks every call.
            </ListItem>
          </UnorderedList>
        </Step>
        <Step n={6} title="Cap your spending">
          <OrderedList spacing="6px">
            <ListItem>
              <b>Daily quotas</b> — in Places API (New) → Quotas, lower the per-day request limits. Google stops the calls once a limit is hit, so you can&rsquo;t be surprised.{" "}
              <Link href={GOOGLE_CONSOLE.quotas} isExternal color="ac" fontWeight={600}>
                Open quotas
              </Link>
            </ListItem>
            <ListItem>
              <b>Budget alert</b> — Billing → Budgets &amp; alerts → create a budget (say $5) with emails at 50%, 90% and 100%. Alerts warn you; they don&rsquo;t stop charges, so use quotas too.{" "}
              <Link href={GOOGLE_CONSOLE.budgets} isExternal color="ac" fontWeight={600}>
                Open budgets
              </Link>
            </ListItem>
          </OrderedList>
        </Step>
        <Step n={7} title="Paste the key into Trippin">
          <p>
            Go to <b>Profile → API keys → Google Maps</b>, paste the key and click Save. It&rsquo;s stored encrypted, and trips you own use it — people you share a trip with use your key for that trip.
          </p>
          <Button as={RouterLink} to="/profile#api-keys" size="sm" mt={3}>
            Go to Profile
          </Button>
        </Step>
      </Stack>

      <Box position={{ xl: "sticky" }} top={{ xl: "96px" }}>
      <Heading as="h2" fontSize="17px" lineHeight="24px">
        What it costs
      </Heading>
      <Text color="tx2" fontSize="14px" lineHeight="20px" mt={2}>
        Each kind of call has its own free monthly amount. Trippin asks for ratings, opening hours and short summaries, so searches and place details are billed on Google&rsquo;s
        Enterprise tiers, which have 1,000 free calls a month each. Trippin saves place details for weeks, so planning a trip usually stays inside these. Your running total is on the
        Profile page.
      </Text>
      {data ? (
        <SurfaceCard mt="12px" overflowX="auto">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Call</Th>
                <Th isNumeric>Free / month</Th>
                <Th isNumeric>Then, per 1,000</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.pricing
                .filter((p) => ["autocomplete", "textSearchEnterprise", "nearbyEnterprise", "detailsAtmosphere", "photos", "geocoding", "directions"].includes(p.sku))
                .map((p) => (
                  <Tr key={p.sku}>
                    <Td>
                      <HStack spacing="6px">
                        <Text>{p.label}</Text>
                        <Pill h="20px" px="6px" fontSize="11px">
                          {p.tier}
                        </Pill>
                      </HStack>
                    </Td>
                    <Td isNumeric>{p.freePerMonth.toLocaleString("en-US")}</Td>
                    <Td isNumeric>${p.usdPer1000.toFixed(2)}</Td>
                  </Tr>
                ))}
            </Tbody>
          </Table>
        </SurfaceCard>
      ) : null}
      <Banner tone="neutral" mt={3}>
        Google&rsquo;s list prices in USD (pricing from March 2025), before taxes and credits. Check{" "}
        <Link href="https://developers.google.com/maps/billing-and-pricing/pricing" isExternal>
          Google&rsquo;s pricing page
        </Link>{" "}
        for the latest.
      </Banner>
      </Box>
      </Grid>
    </Box>
  );
}
