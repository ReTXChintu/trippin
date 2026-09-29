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
import { EmptyState, Pill, SurfaceCard } from "@/components/ui";
import { formatDateRange, initials } from "@/components/ui/app-format";
import { LoadingState } from "@/components/ui/LoadingState";
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

  return (
    <Flex direction="column" minH="100vh" bg="bg.canvas">
      <Flex
        as="header"
        h="76px"
        px={{ base: "16px", md: "64px" }}
        align="center"
        justify="space-between"
        flexShrink={0}
      >
        <RouterLink to="/">
          <BrandLogo size={34} />
        </RouterLink>
        {user ? (
          <Link
            as={RouterLink}
            to="/dashboard"
            fontSize="13px"
            fontWeight={600}
            color="accent.text"
          >
            Go to dashboard
          </Link>
        ) : (
          <Text fontSize="13px" color="fg.muted">
            Already have an account?{" "}
            <Link
              as={RouterLink}
              to={`/login?callbackUrl=${encodeURIComponent(here)}`}
              fontWeight={600}
              color="accent.text"
            >
              Log in
            </Link>
          </Text>
        )}
      </Flex>
      <Flex
        flex={1}
        justify="center"
        align={{ base: "flex-start", md: "center" }}
        px={{ base: "16px", md: 0 }}
        pb={{ base: "24px", md: "60px" }}
      >
        <SurfaceCard raised w="full" maxW="600px" overflow="hidden">
          <IllustratedMap
            height={200}
            h={{ base: "150px", md: "200px" }}
            seed={11}
            color="var(--chakra-colors-accent)"
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
          {error || !data ? (
            <EmptyState
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
                  {user ? "Go to dashboard" : "Go to Trippin"}
                </Button>
              }
            />
          ) : (
            <Stack spacing="16px" p={{ base: "20px", md: "28px" }}>
              <HStack spacing="10px">
                <Flex
                  w="30px"
                  h="30px"
                  borderRadius="full"
                  bg="day.2"
                  color="pin.fg"
                  fontSize="12px"
                  fontWeight={700}
                  align="center"
                  justify="center"
                  aria-hidden
                >
                  {initials(data.invitedBy)}
                </Flex>
                <Text color="fg.muted">{data.invitedBy} invited you</Text>
              </HStack>
              <Heading
                as="h1"
                fontSize={{ base: "28px", md: "34px" }}
                lineHeight={1.15}
              >
                {data.tripTitle}
              </Heading>
              <HStack spacing="8px" flexWrap="wrap" rowGap="8px">
                {data.route && data.route.length > 0 && (
                  <Pill icon={FiMapPin}>{data.route.join(" → ")}</Pill>
                )}
                {data.dates && (
                  <Pill icon={FiCalendar}>{niceDates(data.dates)}</Pill>
                )}
                {data.travellers && data.travellers > 1 && (
                  <Pill icon={FiUsers}>{data.travellers} travellers</Pill>
                )}
                <Pill icon={data.role === "viewer" ? FiEye : FiEdit2}>
                  {data.role === "viewer" ? "Viewer" : "Editor"}
                </Pill>
              </HStack>
              <Box
                bg="bg.canvas"
                borderWidth="1px"
                borderColor="border.line"
                borderRadius="xl"
                px="14px"
                py="12px"
              >
                <Text fontWeight={600}>{ROLE_TEXT[data.role].title}</Text>
                <Text fontSize="12px" color="fg.muted" mt="4px">
                  {ROLE_TEXT[data.role].text}
                </Text>
              </Box>
              {expiresIn !== null && (
                <HStack spacing="8px" color="fg.muted" fontSize="12px">
                  <Icon as={FiClock} boxSize="16px" />
                  <Text>
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
                    leftIcon={<FiArrowRight />}
                  >
                    Open the trip
                  </Button>
                  <Text fontSize="12px" color="fg.muted" textAlign="center">
                    You&rsquo;re already on this trip.
                  </Text>
                </>
              ) : (
                <>
                  <Button
                    size="xl"
                    w="full"
                    leftIcon={<FiArrowRight />}
                    onClick={join}
                    isLoading={accept.isPending}
                  >
                    Join trip
                  </Button>
                  <Text fontSize="12px" color="fg.muted" textAlign="center">
                    {user
                      ? "You’ll go straight to the trip."
                      : "You’ll be asked to log in or sign up, then brought straight back here."}
                  </Text>
                </>
              )}
            </Stack>
          )}
        </SurfaceCard>
      </Flex>
    </Flex>
  );
}
