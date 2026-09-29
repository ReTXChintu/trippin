import { Alert, AlertIcon, Box, Button, Heading, Stack, Text, useToast } from "@chakra-ui/react";
import { useNavigate, useParams } from "react-router-dom";
import { getApiErrorMessage } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAcceptInvite, useInvitePreviewQuery } from "@/modules/trips/hooks/useTrips";

export function InvitePage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading, error } = useInvitePreviewQuery(token);
  const accept = useAcceptInvite();
  const bg = "bg.surface";
  const border = "border.line";

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
    <Box maxW="480px" mx="auto" mt={{ base: 4, md: 12 }} p={8} bg={bg} borderWidth="1px" borderColor={border} borderRadius="2xl" textAlign="center">
      {error || !data ? (
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          {getApiErrorMessage(error) || "This invite link isn't valid."}
        </Alert>
      ) : (
        <Stack spacing={4}>
          <Text fontSize="sm" color="fg.muted">
            {data.invitedBy} invited you to
          </Text>
          <Heading size="lg">{data.tripTitle}</Heading>
          <Text fontSize="sm" color="fg.muted">
            {data.dates} · {data.role === "viewer" ? "you'll be able to view, vote and comment" : "you'll be able to plan together"}
          </Text>
          {data.alreadyMember ? (
            <Button colorScheme="brand" onClick={() => navigate(`/trips/${data.tripId}`)}>
              You're already on this trip — open it
            </Button>
          ) : (
            <Button colorScheme="brand" size="lg" onClick={join} isLoading={accept.isPending}>
              Join trip
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
}
