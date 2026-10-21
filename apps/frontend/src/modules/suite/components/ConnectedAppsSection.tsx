import {
  Box,
  Button,
  CloseButton,
  Flex,
  HStack,
  Icon,
  Image,
  Link,
  SimpleGrid,
  Skeleton,
  Spinner,
  Stack,
  Switch,
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { LuCamera, LuDownload, LuExternalLink, LuImage, LuRefreshCw, LuTriangleAlert, LuUsers, LuWallet } from "react-icons/lu";
import { Banner, Overline, Pill, SurfaceCard } from "@/components/ui";
import { SectionTitle } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/api";
import { useSetTripLinks, useTripLinksQuery } from "@/modules/suite/hooks/useTripLinks";
import type { ConnectedAppView, InframeSummary, SpendlogSummary, SuiteApp, SuitePromo } from "@/modules/suite/types/suite.types";
import { dismissPromo, formatMinor, isPromoDismissed } from "@/modules/suite/utils/promo-dismissal";

const APP_ICON = { spendlog: LuWallet, inframe: LuCamera } as const;
/** Each sibling app's icon tile wears that app's own accent (design system 10), so SpendLog reads
 * cobalt and InFrame violet here exactly as they do in their own apps. */
const APP_TINT = {
  spendlog: { bg: "app.spendlogSoft", color: "app.spendlog" },
  inframe: { bg: "app.inframeSoft", color: "app.inframe" },
} as const;

function AppTile({ app, muted }: { app: SuiteApp; muted?: boolean }) {
  const tint = muted ? { bg: "sunk", color: "tx2" } : APP_TINT[app];
  return (
    <Flex w="40px" h="40px" borderRadius="md" bg={tint.bg} color={tint.color} align="center" justify="center" flexShrink={0}>
      <Icon as={APP_ICON[app]} boxSize="20px" />
    </Flex>
  );
}

/** Inline stat (design system 4.2): 12/600 label over a 17/600 tabular value. */
function InlineStat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text fontSize="12px" lineHeight="16px" fontWeight={600} letterSpacing="0.02em" color="tx2">
        {label}
      </Text>
      <Box mt="2px" fontSize="17px" lineHeight="24px" fontWeight={600} className="num">
        {children}
      </Box>
    </Box>
  );
}
const TOGGLE_LABEL = { spendlog: "Track spending in SpendLog", inframe: "Share photos in InFrame" } as const;
const REMOTE_NOUN = { spendlog: "SpendLog trip", inframe: "InFrame event" } as const;
const KEPT = { spendlog: "every transaction stays in SpendLog", inframe: "every photo stays in InFrame" } as const;

function OpenButton({ app, url }: { app: ConnectedAppView; url: string | null }) {
  if (!url) return null;
  return (
    <Button as="a" href={url} target="_blank" rel="noopener noreferrer" size="sm" variant="outline" rightIcon={<LuExternalLink size={16} />}>
      Open in {app.name}
    </Button>
  );
}

function SpendlogSummaryView({ summary }: { summary: SpendlogSummary }) {
  const money = (minor: number) => formatMinor(minor, summary.currency);
  const balance =
    summary.iOweMinor > 0
      ? { label: "You owe", value: money(summary.iOweMinor), tone: "warn" as const }
      : summary.owedToMeMinor > 0
        ? { label: "Owed to you", value: money(summary.owedToMeMinor), tone: "success" as const }
        : { label: "Balance", value: "Settled up", tone: "neutral" as const };
  return (
    <Stack spacing={4}>
      <Box>
        <Overline>Spent so far</Overline>
        <Text fontWeight={600} fontSize="28px" lineHeight="34px" letterSpacing="-0.02em" mt={1} className="num">
          {money(summary.totalSpentMinor)}
        </Text>
        <Text fontSize="12px" lineHeight="16px" color="tx3" className="num">
          {summary.transactionCount} transaction{summary.transactionCount === 1 ? "" : "s"} in SpendLog
        </Text>
      </Box>
      <Flex gap={6} flexWrap="wrap" align="flex-start">
        <InlineStat label="Your share">{money(summary.myShareMinor)}</InlineStat>
        <Box>
          <Text fontSize="12px" lineHeight="16px" fontWeight={600} letterSpacing="0.02em" color="tx2" mb={1}>
            {balance.label}
          </Text>
          <Pill tone={balance.tone}>{balance.value}</Pill>
        </Box>
      </Flex>
      {summary.settlement.length > 0 && (
        <Box bg="sf2" borderWidth="1px" borderColor="ln" borderRadius="lg" px="14px" py={3}>
          <Text fontSize="12px" lineHeight="16px" fontWeight={600} letterSpacing="0.02em" color="tx2" mb={2}>
            To settle up
          </Text>
          <Stack spacing={1.5} fontSize="14px" lineHeight="20px">
            {summary.settlement.slice(0, 3).map((s, i) => (
              <Flex key={i} justify="space-between" gap={3}>
                <Text color="tx2" minW={0} noOfLines={1}>
                  {s.fromName} → {s.toName}
                </Text>
                <Text fontWeight={600} className="num" flexShrink={0}>
                  {money(s.amountMinor)}
                </Text>
              </Flex>
            ))}
            {summary.settlement.length > 3 && (
              <Text color="tx3" fontSize="12px" lineHeight="16px">
                and {summary.settlement.length - 3} more
              </Text>
            )}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}

function InframeSummaryView({ summary, url }: { summary: InframeSummary; url: string | null }) {
  const counts = [
    [summary.photoCount, "photo"],
    [summary.videoCount, "video"],
    [summary.albumCount, "album"],
  ] as const;
  return (
    <Stack spacing={4}>
      <Flex gap={4} align="center">
        {summary.coverThumbUrl ? (
          <Image src={summary.coverThumbUrl} alt="" w="72px" h="72px" objectFit="cover" borderRadius="lg" borderWidth="1px" borderColor="ln" flexShrink={0} />
        ) : (
          <Flex w="72px" h="72px" borderRadius="lg" bg="sunk" color="tx3" align="center" justify="center" flexShrink={0}>
            <Icon as={LuImage} boxSize="24px" />
          </Flex>
        )}
        <SimpleGrid columns={3} spacing={3} flex={1}>
          {counts.map(([n, noun]) => (
            <Box key={noun}>
              <Text fontWeight={600} fontSize="22px" lineHeight="28px" className="num">
                {n}
              </Text>
              <Text fontSize="12px" lineHeight="16px" color="tx3">
                {noun}
                {n === 1 ? "" : "s"}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Flex>
      {summary.needsStorage && (
        <Banner
          tone="warn"
          icon={LuTriangleAlert}
          action={
            url && (
              <Button as="a" href={url} target="_blank" rel="noopener noreferrer" size="sm" variant="outline">
                Open InFrame
              </Button>
            )
          }
        >
          Connect a folder in InFrame to start adding photos.
        </Banner>
      )}
    </Stack>
  );
}

export function PromoCard({ app, promo, onDismiss, extra }: { app: SuiteApp; promo: SuitePromo; onDismiss: () => void; extra?: React.ReactNode }) {
  return (
    <SurfaceCard p={5} bg="acSoft" borderColor="acLine" position="relative" role="region" aria-label={promo.title}>
      <CloseButton position="absolute" top={3} right={3} onClick={onDismiss} aria-label="Hide for 30 days" />
      <Stack spacing={4} pr={8}>
        <HStack spacing={3} align="flex-start">
          <AppTile app={app} />
          <Box>
            <Text fontWeight={600} fontSize="15px" lineHeight="20px">
              {promo.title}
            </Text>
            <Text fontSize="14px" lineHeight="20px" color="tx2" mt={1}>
              {promo.body}
            </Text>
          </Box>
        </HStack>
        <HStack spacing={2} flexWrap="wrap">
          <Button as="a" href={promo.apkUrl ?? promo.webUrl} target="_blank" rel="noopener noreferrer" leftIcon={<LuDownload size={18} />}>
            {promo.cta}
          </Button>
          <Button as="a" href={promo.webUrl} target="_blank" rel="noopener noreferrer" variant="ghost">
            Learn more
          </Button>
        </HStack>
        {extra}
      </Stack>
    </SurfaceCard>
  );
}

function AppCard({ app, canManage, tripId }: { app: ConnectedAppView; canManage: boolean; tripId: string }) {
  const toast = useToast();
  const setLinks = useSetTripLinks(tripId);
  const confirmOff = useDisclosure();
  const [promoHidden, setPromoHidden] = useState(() => isPromoDismissed(app.app));
  const hidePromo = () => {
    dismissPromo(app.app);
    setPromoHidden(true);
  };

  const toggle = async (on: boolean) => {
    try {
      await setLinks.mutateAsync({ [app.app]: on });
      confirmOff.onClose();
      toast({
        title: on ? `Linking to ${app.name}…` : `Unlinked from ${app.name}`,
        description: on ? undefined : `Nothing was deleted — ${KEPT[app.app]}.`,
        status: on ? "info" : "success",
      });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const showPromo = !!app.promo && !promoHidden && (app.hasAccount === false || (!app.enabled && app.hasAccount === null && !canManage));
  // Settings row (design system 7.6): label + sub-line, the switch trailing.
  const toggleSwitch = canManage && (
    <Flex align="center" justify="space-between" gap={4} minH="48px">
      <Box as="label" htmlFor={`link-${app.app}`} cursor="pointer" minW={0}>
        <Text fontWeight={500} fontSize="14px" lineHeight="20px">
          {TOGGLE_LABEL[app.app]}
        </Text>
        <Text fontSize="12px" lineHeight="16px" color="tx3">
          {app.tagline}
        </Text>
      </Box>
      <Switch
        id={`link-${app.app}`}
        flexShrink={0}
        isChecked={app.enabled}
        isDisabled={setLinks.isPending}
        onChange={(e) => (e.target.checked ? void toggle(true) : confirmOff.onOpen())}
      />
    </Flex>
  );

  const unlinkDialog = (
    <ConfirmDialog
      isOpen={confirmOff.isOpen}
      onClose={confirmOff.onClose}
      onConfirm={() => void toggle(false)}
      title={`Stop syncing with ${app.name}?`}
      description={`Trippin stops updating the ${REMOTE_NOUN[app.app]}. Nothing is deleted — ${KEPT[app.app]}, and you can link it again any time.`}
      confirmLabel="Unlink"
      isLoading={setLinks.isPending}
    />
  );

  // Not on for this trip: the promo for people who don't use the app, otherwise the switch.
  if (!app.enabled) {
    if (showPromo && app.promo) {
      return (
        <PromoCard
          app={app.app}
          promo={app.promo}
          onDismiss={hidePromo}
          extra={
            canManage && (
              <Box pt={2} borderTopWidth="1px" borderColor="acLine">
                {toggleSwitch}
              </Box>
            )
          }
        />
      );
    }
    if (!canManage) {
      return (
        <SurfaceCard p={5}>
          <HStack spacing={3}>
            <AppTile app={app.app} muted />
            <Box>
              <Text fontWeight={600} fontSize="15px" lineHeight="20px">
                {app.name}
              </Text>
              <Text fontSize="13px" lineHeight="18px" color="tx3">
                Not linked to this trip. The trip owner can connect it.
              </Text>
            </Box>
          </HStack>
        </SurfaceCard>
      );
    }
    return (
      <SurfaceCard p={5}>
        <Stack spacing={3}>
          <HStack spacing={3}>
            <AppTile app={app.app} muted />
            <Text fontWeight={600} fontSize="15px" lineHeight="20px">
              {app.name}
            </Text>
            {app.status === "unlinked" ? <Pill>Unlinked</Pill> : <Pill tone="warn">Not linked</Pill>}
          </HStack>
          {toggleSwitch}
        </Stack>
      </SurfaceCard>
    );
  }

  const url = app.url ?? app.summary?.url ?? null;
  const skipped = app.skippedMembers.length;
  let body: React.ReactNode;
  if (app.status === "error") {
    body = (
      <Banner
        tone="danger"
        icon={LuTriangleAlert}
        action={
          canManage && (
            <Button size="sm" variant="outline" leftIcon={<LuRefreshCw size={16} />} onClick={() => void toggle(true)} isLoading={setLinks.isPending}>
              Try again
            </Button>
          )
        }
      >
        {app.lastError ?? `Couldn't link to ${app.name}.`}
      </Banner>
    );
  } else if (app.status === "pending" && !app.summary) {
    body = (
      <HStack spacing={2} color="tx3" fontSize="13px">
        <Spinner size="sm" color="ac" emptyColor="sunk" thickness="3px" />
        <Text>Setting up the {REMOTE_NOUN[app.app]}…</Text>
      </HStack>
    );
  } else if (app.summaryError) {
    body = (
      <Banner tone="warn" icon={LuTriangleAlert}>
        {app.summaryError}. The rest of the trip works as usual — try again in a minute.
      </Banner>
    );
  } else if (app.summary) {
    body = app.app === "spendlog" ? <SpendlogSummaryView summary={app.summary as SpendlogSummary} /> : <InframeSummaryView summary={app.summary as InframeSummary} url={url} />;
  } else {
    body = (
      <Text fontSize="14px" lineHeight="20px" color="tx2">
        Linked. {app.app === "spendlog" ? "Spending logged in SpendLog shows up here." : "Photos added in InFrame show up here."}
      </Text>
    );
  }

  return (
    <SurfaceCard p={5}>
      <Stack spacing={4}>
        <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
          <HStack spacing={3}>
            <AppTile app={app.app} />
            <Text fontWeight={600} fontSize="17px" lineHeight="24px">
              {app.name}
            </Text>
            {app.status === "linked" && <Pill tone="success">Linked</Pill>}
            {app.status === "pending" && <Pill tone="accent">Setting up</Pill>}
            {app.status === "error" && <Pill tone="danger">Stopped</Pill>}
          </HStack>
          <OpenButton app={app} url={app.status === "error" ? null : url} />
        </Flex>
        {body}
        {skipped > 0 && app.status !== "error" && (
          <HStack spacing={2} fontSize="12px" lineHeight="16px" color="tx3">
            <Icon as={LuUsers} boxSize="16px" />
            <Text>
              {skipped} member{skipped === 1 ? "" : "s"} will join the {REMOTE_NOUN[app.app]} once they sign in to {app.name}.
            </Text>
          </HStack>
        )}
        {showPromo && app.promo && (
          <HStack spacing={2} fontSize="12px" color="tx3" flexWrap="wrap">
            <Text>You don't have {app.name} yet.</Text>
            <Link href={app.promo.apkUrl ?? app.promo.webUrl} isExternal color="ac" fontWeight={600}>
              {app.promo.cta}
            </Link>
          </HStack>
        )}
        {canManage && <Box pt={3} borderTopWidth="1px" borderColor="ln">{toggleSwitch}</Box>}
      </Stack>
      {unlinkDialog}
    </SurfaceCard>
  );
}

/** The trip page's "Connected apps": SpendLog's spending and InFrame's photos for this trip. */
export function ConnectedAppsSection({ tripId }: { tripId: string }) {
  const { data, isLoading, isError, refetch, isFetching } = useTripLinksQuery(tripId);

  return (
    <Stack spacing={4}>
      <SectionTitle>Connected apps</SectionTitle>
      <Text fontSize="14px" lineHeight="20px" color="tx2" mt={-2}>
        Track what you actually spend in SpendLog and share the trip's photos in InFrame — both optional, both switchable later.
      </Text>
      {isLoading ? (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
          <Skeleton h="200px" borderRadius="xl" />
          <Skeleton h="200px" borderRadius="xl" />
        </SimpleGrid>
      ) : isError || !data ? (
        <Banner
          tone="neutral"
          icon={LuTriangleAlert}
          action={
            <Button size="sm" variant="outline" onClick={() => void refetch()} isLoading={isFetching}>
              Retry
            </Button>
          }
        >
          Couldn't load connected apps right now.
        </Banner>
      ) : (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} alignItems="start">
          <AppCard app={data.apps.spendlog} canManage={data.canManage} tripId={tripId} />
          <AppCard app={data.apps.inframe} canManage={data.canManage} tripId={tripId} />
        </SimpleGrid>
      )}
    </Stack>
  );
}
