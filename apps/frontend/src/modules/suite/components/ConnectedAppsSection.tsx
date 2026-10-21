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
import { IconTile, SectionTitle } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/api";
import { useSetTripLinks, useTripLinksQuery } from "@/modules/suite/hooks/useTripLinks";
import type { ConnectedAppView, InframeSummary, SpendlogSummary, SuiteApp, SuitePromo } from "@/modules/suite/types/suite.types";
import { dismissPromo, formatMinor, isPromoDismissed } from "@/modules/suite/utils/promo-dismissal";

const APP_ICON = { spendlog: LuWallet, inframe: LuCamera } as const;
const TOGGLE_LABEL = { spendlog: "Track spending in SpendLog", inframe: "Share photos in InFrame" } as const;
const REMOTE_NOUN = { spendlog: "SpendLog trip", inframe: "InFrame event" } as const;
const KEPT = { spendlog: "every transaction stays in SpendLog", inframe: "every photo stays in InFrame" } as const;

function OpenButton({ app, url }: { app: ConnectedAppView; url: string | null }) {
  if (!url) return null;
  return (
    <Button as="a" href={url} target="_blank" rel="noopener noreferrer" size="sm" variant="outline" rightIcon={<LuExternalLink size={14} />}>
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
    <Stack spacing={3}>
      <Box>
        <Overline>Spent so far</Overline>
        <Text fontFamily="heading" fontWeight={600} fontSize="28px" lineHeight={1.15}>
          {money(summary.totalSpentMinor)}
        </Text>
        <Text fontSize="12px" color="fg.muted">
          {summary.transactionCount} transaction{summary.transactionCount === 1 ? "" : "s"}
        </Text>
      </Box>
      <SimpleGrid columns={2} spacing={3}>
        <Box>
          <Text fontSize="12px" color="fg.muted">
            Your share
          </Text>
          <Text fontWeight={600}>{money(summary.myShareMinor)}</Text>
        </Box>
        <Box>
          <Text fontSize="12px" color="fg.muted">
            {balance.label}
          </Text>
          <Pill tone={balance.tone}>{balance.value}</Pill>
        </Box>
      </SimpleGrid>
      {summary.settlement.length > 0 && (
        <Box>
          <Text fontSize="12px" color="fg.muted" mb={1}>
            To settle up
          </Text>
          <Stack spacing={1} fontSize="13px">
            {summary.settlement.slice(0, 3).map((s, i) => (
              <Text key={i}>
                {s.fromName} → {s.toName} <b>{money(s.amountMinor)}</b>
              </Text>
            ))}
            {summary.settlement.length > 3 && (
              <Text color="fg.muted" fontSize="12px">
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
    <Stack spacing={3}>
      <Flex gap={3} align="center">
        {summary.coverThumbUrl ? (
          <Image src={summary.coverThumbUrl} alt="" w="72px" h="72px" objectFit="cover" borderRadius="lg" flexShrink={0} />
        ) : (
          <IconTile icon={LuImage} size={72} />
        )}
        <SimpleGrid columns={3} spacing={3} flex={1}>
          {counts.map(([n, noun]) => (
            <Box key={noun}>
              <Text fontFamily="heading" fontWeight={600} fontSize="22px" lineHeight={1.2}>
                {n}
              </Text>
              <Text fontSize="12px" color="fg.muted">
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
    <SurfaceCard p="18px" bg="accent.soft" borderColor="transparent" position="relative" role="region" aria-label={promo.title}>
      <CloseButton size="sm" position="absolute" top={2} right={2} onClick={onDismiss} aria-label="Hide for 30 days" />
      <Stack spacing={3} pr={6}>
        <HStack spacing={3} align="flex-start">
          <IconTile icon={APP_ICON[app]} tone="accent" size={40} bg="bg.surface" />
          <Box>
            <Text fontWeight={700} lineHeight={1.3}>
              {promo.title}
            </Text>
            <Text fontSize="13px" color="fg.muted" mt={1}>
              {promo.body}
            </Text>
          </Box>
        </HStack>
        <HStack spacing={2} flexWrap="wrap">
          <Button as="a" href={promo.apkUrl ?? promo.webUrl} target="_blank" rel="noopener noreferrer" size="sm" leftIcon={<LuDownload size={14} />}>
            {promo.cta}
          </Button>
          <Button as="a" href={promo.webUrl} target="_blank" rel="noopener noreferrer" size="sm" variant="ghost">
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
  const toggleSwitch = canManage && (
    <Flex align="flex-start" gap={3}>
      <Switch
        id={`link-${app.app}`}
        mt="2px"
        isChecked={app.enabled}
        isDisabled={setLinks.isPending}
        onChange={(e) => (e.target.checked ? void toggle(true) : confirmOff.onOpen())}
      />
      <Box as="label" htmlFor={`link-${app.app}`} cursor="pointer">
        <Text fontWeight={600} fontSize="14px">
          {TOGGLE_LABEL[app.app]}
        </Text>
        <Text fontSize="12px" color="fg.muted">
          {app.tagline}
        </Text>
      </Box>
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
              <Box pt={2} borderTopWidth="1px" borderColor="border.line">
                {toggleSwitch}
              </Box>
            )
          }
        />
      );
    }
    if (!canManage) {
      return (
        <SurfaceCard p="18px">
          <HStack spacing={3}>
            <IconTile icon={APP_ICON[app.app]} />
            <Box>
              <Text fontWeight={600}>{app.name}</Text>
              <Text fontSize="13px" color="fg.muted">
                Not linked to this trip. The trip owner can connect it.
              </Text>
            </Box>
          </HStack>
        </SurfaceCard>
      );
    }
    return (
      <SurfaceCard p="18px">
        <Stack spacing={3}>
          <HStack spacing={3}>
            <IconTile icon={APP_ICON[app.app]} />
            <Text fontWeight={600}>{app.name}</Text>
            {app.status === "unlinked" && <Pill>Unlinked</Pill>}
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
            <Button size="sm" variant="outline" leftIcon={<LuRefreshCw size={14} />} onClick={() => void toggle(true)} isLoading={setLinks.isPending}>
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
      <HStack spacing={2} color="fg.muted" fontSize="13px">
        <Spinner size="sm" />
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
      <Text fontSize="13px" color="fg.muted">
        Linked. {app.app === "spendlog" ? "Spending logged in SpendLog shows up here." : "Photos added in InFrame show up here."}
      </Text>
    );
  }

  return (
    <SurfaceCard p="18px">
      <Stack spacing={4}>
        <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
          <HStack spacing={3}>
            <IconTile icon={APP_ICON[app.app]} tone="accent" />
            <Text fontWeight={600}>{app.name}</Text>
            {app.status === "linked" && <Pill tone="success">Linked</Pill>}
          </HStack>
          <OpenButton app={app} url={app.status === "error" ? null : url} />
        </Flex>
        {body}
        {skipped > 0 && app.status !== "error" && (
          <HStack spacing={2} fontSize="12px" color="fg.muted">
            <Icon as={LuUsers} boxSize="14px" />
            <Text>
              {skipped} member{skipped === 1 ? "" : "s"} will join the {REMOTE_NOUN[app.app]} once they sign in to {app.name}.
            </Text>
          </HStack>
        )}
        {showPromo && app.promo && (
          <HStack spacing={2} fontSize="12px" color="fg.muted" flexWrap="wrap">
            <Text>You don't have {app.name} yet.</Text>
            <Link href={app.promo.apkUrl ?? app.promo.webUrl} isExternal color="accent.text" fontWeight={600}>
              {app.promo.cta}
            </Link>
          </HStack>
        )}
        {canManage && <Box pt={3} borderTopWidth="1px" borderColor="border.line">{toggleSwitch}</Box>}
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
      <Text fontSize="13px" color="fg.muted" mt={-2}>
        Track what you actually spend in SpendLog and share the trip's photos in InFrame — both optional, both switchable later.
      </Text>
      {isLoading ? (
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
          <Skeleton h="180px" borderRadius="xl" />
          <Skeleton h="180px" borderRadius="xl" />
        </SimpleGrid>
      ) : isError || !data ? (
        <Banner
          tone="neutral"
          icon={LuTriangleAlert}
          action={
            <Button size="sm" variant="ghost" onClick={() => void refetch()} isLoading={isFetching}>
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
