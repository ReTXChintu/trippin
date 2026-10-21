import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Link,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  FiArrowRight,
  FiCalendar,
  FiClock,
  FiEdit2,
  FiEye,
  FiLink,
  FiMapPin,
  FiUsers,
} from "react-icons/fi";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { getApiErrorMessage } from "@/lib/api";
import { EmptyState, Pill } from "@/components/ui";
import { formatDateRange, initials } from "@/components/ui/app-format";
import { LoadingState } from "@/components/ui/LoadingState";
import { AuthCard, AuthSplit } from "@/components/layout/AuthPageWrapper";
import { IllustratedMap } from "@/modules/landing/components/IllustratedMap";
import {
  useAcceptInvite,
  useInvitePreviewQuery,
} from "@/modules/trips/hooks/useTrips";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuthStore } from "@/store/authStore";

const ROLE_TEXT = {
  editor: {
    title: "You’ll join as an editor",
    text: "You can change the plan, add places and stays, vote and comment. Only the owner manages members.",
  },
  viewer: {
    title: "You’ll join as a viewer",
    text: "You can see the whole plan, vote with hearts and comment on any stop. Editors and the owner make the changes.",
  },
} as const;

/** The preview sends "2026-10-05 → 2026-10-09"; show it as "5–9 Oct 2026". */
function niceDates(dates: string): string {
  const found = dates.match(/\d{4}-\d{2}-\d{2}/g);
  if (found && found.length >= 2)
    return formatDateRange(found[0], found[1], true) || dates;
  if (found && found.length === 1)
    return formatDateRange(found[0], found[0], true) || dates;
  return dates;
}

export function InvitePage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading, error } = useInvitePreviewQuery(token);
  const accept = useAcceptInvite();
  const user = useAuthStore((st) => st.user);
  const authLoading = useAuthStore((st) => st.isLoading);
  const here = `/invite/${token}`;

  if (isLoading || authLoading) return <LoadingState />;

  const expiresIn = data?.expiresAt
    ? differenceInCalendarDays(parseISO(data.expiresAt), new Date())
    : null;

  const join = async () => {
    if (!user) {
      navigate(`/login?callbackUrl=${encodeURIComponent(here)}`);
      return;
    }
    try {
      const result = await accept.mutateAsync(token);
      toast({ title: "You're in!", status: "success", duration: 2500 });
      navigate(`/trips/${result.tripId}`, { replace: true });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const topRight = user ? (
    <Link as={RouterLink} to="/dashboard" fontSize="14px" fontWeight={600}>
      Go to dashboard
    </Link>
  ) : (
    <Link as={RouterLink} to={`/login?callbackUrl=${encodeURIComponent(here)}`} fontSize="14px" fontWeight={600}>
      Sign in
    </Link>
  );

  const map = (
    <Box
      position="relative"
      h={{ base: "150px", md: "220px" }}
      maxW="560px"
      borderRadius="xl"
      overflow="hidden"
      borderWidth="1px"
      borderColor="ln"
    >
      <IllustratedMap
        height={220}
        position="absolute"
        inset={0}
        seed={11}
        color="var(--chakra-colors-ac)"
        pins={
          error || !data
            ? []
            : [
                { x: 120, y: 90, label: "1" },
                ...((data.route?.length ?? 0) > 1
                  ? [{ x: 250, y: 150, label: "2" }]
                  : []),
                ...((data.route?.length ?? 0) > 2
                  ? [{ x: 390, y: 110, label: "3" }]
                  : []),
              ]
        }
      />
    </Box>
  );

  const logo = (
    <Box as={RouterLink} to="/" alignSelf="flex-start" aria-label="Trippin' home">
      <BrandLogo />
    </Box>
  );

  if (error || !data) {
    return (
      <AuthSplit brand={<>{logo}{map}</>} topRight={topRight}>
        <AuthCard>
          <EmptyState
            compact
            icon={FiLink}
            title="This invite link doesn’t work"
            text={
              getApiErrorMessage(error) ||
              "It may have expired or been reset. Ask for a new link."
            }
            action={
              <Button
                as={RouterLink}
                to={user ? "/dashboard" : "/"}
                variant="outline"
              >
                {user ? "Go to dashboard" : "Go to Trippin'"}
              </Button>
            }
          />
        </AuthCard>
      </AuthSplit>
    );
  }

  const brand = (
    <>
      {logo}
      <Stack spacing={4} maxW="560px">
        <HStack spacing={3}>
          <Flex
            w="36px"
            h="36px"
            borderRadius="full"
            bg="day.2"
            color="pin.fg"
            fontSize="13px"
            fontWeight={600}
            align="center"
            justify="center"
            flexShrink={0}
            aria-hidden
          >
            {initials(data.invitedBy)}
          </Flex>
          <Text color="tx2" fontSize="15px" lineHeight="22px">
            {data.invitedBy} invited you
          </Text>
        </HStack>
        <Heading
          as="h1"
          fontSize={{ base: "28px", md: "34px" }}
          lineHeight={{ base: "34px", md: "40px" }}
          letterSpacing="-0.02em"
        >
          {data.tripTitle}
        </Heading>
        <HStack spacing={2} flexWrap="wrap" rowGap={2}>
          {data.route && data.route.length > 0 && (
            <Pill icon={FiMapPin}>{data.route.join(" → ")}</Pill>
          )}
          {data.dates && (
            <Pill icon={FiCalendar}>{niceDates(data.dates)}</Pill>
          )}
          {data.travellers && data.travellers > 1 && (
            <Pill icon={FiUsers}>{data.travellers} travellers</Pill>
          )}
          <Pill tone="accent" icon={data.role === "viewer" ? FiEye : FiEdit2}>
            {data.role === "viewer" ? "Viewer" : "Editor"}
          </Pill>
        </HStack>
      </Stack>
      {map}
    </>
  );

  return (
    <AuthSplit brand={brand} topRight={topRight}>
      <AuthCard>
        <Box>
          <Text as="h2" fontWeight={600} fontSize="22px" lineHeight="28px">
            Join the trip
          </Text>
          <Text color="tx2" fontSize="15px" lineHeight="22px" mt={2}>
            {ROLE_TEXT[data.role].title}.
          </Text>
        </Box>
        <Box bg="sf2" borderWidth="1px" borderColor="ln" borderRadius="lg" px="14px" py={3}>
          <Text fontSize="14px" lineHeight="20px" color="tx2">
            {ROLE_TEXT[data.role].text}
          </Text>
        </Box>
        {expiresIn !== null && (
          <HStack spacing={2} color="tx3" fontSize="13px" lineHeight="18px">
            <Icon as={FiClock} boxSize="16px" />
            <Text className="num">
              {expiresIn <= 0
                ? "Link expires today"
                : expiresIn === 1
                  ? "Link expires tomorrow"
                  : `Link expires in ${expiresIn} days`}
            </Text>
          </HStack>
        )}
        {data.alreadyMember ? (
          <>
            <Button
              as={RouterLink}
              to={`/trips/${data.tripId}`}
              size="xl"
              w="full"
              rightIcon={<FiArrowRight size={18} />}
            >
              Open the trip
            </Button>
            <Text fontSize="12px" lineHeight="17px" color="tx3">
              You&rsquo;re already on this trip.
            </Text>
          </>
        ) : (
          <>
            <Button
              size="xl"
              w="full"
              rightIcon={<FiArrowRight size={18} />}
              onClick={join}
              isLoading={accept.isPending}
            >
              Join trip
            </Button>
            <Text fontSize="12px" lineHeight="17px" color="tx3">
              {user
                ? "You’ll go straight to the trip."
                : "You’ll be asked to log in or sign up, then brought straight back here."}
            </Text>
          </>
        )}
      </AuthCard>
    </AuthSplit>
  );
}
