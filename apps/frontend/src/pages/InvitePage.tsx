import { Box, Button, Flex, Heading, HStack, Stack, Text, useToast } from "@chakra-ui/react";
import { FiArrowRight, FiCalendar, FiEdit2, FiEye, FiLink } from "react-icons/fi";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { getApiErrorMessage } from "@/lib/api";
import { EmptyState, Pill, SurfaceCard } from "@/components/ui";
import { formatDateRange, initials } from "@/components/ui/app-format";
import { LoadingState } from "@/components/ui/LoadingState";
import { IllustratedMap } from "@/modules/landing/components/IllustratedMap";
import { useAcceptInvite, useInvitePreviewQuery } from "@/modules/trips/hooks/useTrips";

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
  if (found && found.length >= 2) return formatDateRange(found[0], found[1], true) || dates;
  if (found && found.length === 1) return formatDateRange(found[0], found[0], true) || dates;
  return dates;
}

export function InvitePage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading, error } = useInvitePreviewQuery(token);
  const accept = useAcceptInvite();

  if (isLoading) return <LoadingState />;

  const join = async () => {
    try {
      const result = await accept.mutateAsync(token);
      toast({ title: "You're in!", status: "success", duration: 2500 });
      navigate(`/trips/${result.tripId}`, { replace: true });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Flex justify="center" py={{ base: 0, md: "32px" }}>
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
                  { x: 250, y: 150, label: "2" },
                ]
          }
        />
        {error || !data ? (
          <EmptyState
            icon={FiLink}
            title="This invite link doesn’t work"
            text={getApiErrorMessage(error) || "It may have expired or been reset. Ask for a new link."}
            action={
              <Button as={RouterLink} to="/dashboard" variant="outline">
                Go to dashboard
              </Button>
            }
          />
        ) : (
          <Stack spacing="16px" p={{ base: "20px", md: "28px" }}>
            <HStack spacing="10px">
              <Flex w="30px" h="30px" borderRadius="full" bg="day.2" color="pin.fg" fontSize="12px" fontWeight={700} align="center" justify="center" aria-hidden>
                {initials(data.invitedBy)}
              </Flex>
              <Text color="fg.muted">{data.invitedBy} invited you</Text>
            </HStack>
            <Heading as="h1" fontSize={{ base: "28px", md: "34px" }} lineHeight={1.15}>
              {data.tripTitle}
            </Heading>
            <HStack spacing="8px" flexWrap="wrap" rowGap="8px">
              {data.dates && <Pill icon={FiCalendar}>{niceDates(data.dates)}</Pill>}
              <Pill icon={data.role === "viewer" ? FiEye : FiEdit2}>{data.role === "viewer" ? "Viewer" : "Editor"}</Pill>
            </HStack>
            <Box bg="bg.canvas" borderWidth="1px" borderColor="border.line" borderRadius="xl" px="14px" py="12px">
              <Text fontWeight={600}>{ROLE_TEXT[data.role].title}</Text>
              <Text fontSize="12px" color="fg.muted" mt="4px">
                {ROLE_TEXT[data.role].text}
              </Text>
            </Box>
            {data.alreadyMember ? (
              <>
                <Button as={RouterLink} to={`/trips/${data.tripId}`} size="xl" w="full" leftIcon={<FiArrowRight />}>
                  Open the trip
                </Button>
                <Text fontSize="12px" color="fg.muted" textAlign="center">
                  You&rsquo;re already on this trip.
                </Text>
              </>
            ) : (
              <>
                <Button size="xl" w="full" leftIcon={<FiArrowRight />} onClick={join} isLoading={accept.isPending}>
                  Join trip
                </Button>
                <Text fontSize="12px" color="fg.muted" textAlign="center">
                  You&rsquo;ll go straight to the trip.
                </Text>
              </>
            )}
          </Stack>
        )}
      </SurfaceCard>
    </Flex>
  );
}
