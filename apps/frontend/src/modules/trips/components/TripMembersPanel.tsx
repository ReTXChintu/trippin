import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Select,
  Stack,
  Tag,
  Text,
  useClipboard,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FiCopy, FiRefreshCw, FiUserMinus, FiUserPlus } from "react-icons/fi";
import {
  useAddTripMember,
  useInviteLink,
  useRemoveTripMember,
  useSetMemberRole,
  useTripMembersQuery,
} from "@/modules/trips/hooks/useTrips";
import { getApiErrorMessage } from "@/lib/api";
import { getTripRole } from "@/lib/trip-access";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { InviteLink } from "@/modules/trips/types/trip-collab.types";

interface TripMembersPanelProps {
  trip: Trip;
  currentUserId: string;
}

const ROLE_LABEL = { owner: "Owner", editor: "Can edit", viewer: "View only" } as const;

function InviteLinkBox({ trip }: { trip: Trip }) {
  const toast = useToast();
  const inviteLink = useInviteLink(trip.id);
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [link, setLink] = useState<InviteLink | null>(null);
  const { hasCopied, onCopy, setValue } = useClipboard("");

  useEffect(() => setValue(link?.url ?? ""), [link, setValue]);

  const load = async (reset = false) => {
    try {
      setLink(await inviteLink.mutateAsync({ role, reset }));
      if (reset) toast({ title: "New link created — the old one no longer works", status: "success", duration: 3000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  useEffect(() => {
    setLink(null);
  }, [role]);

  return (
    <Box>
      <FormLabel fontSize="sm">Invite with a link</FormLabel>
      <HStack mb={2} spacing={2}>
        <ButtonGroup size="xs" isAttached variant="outline">
          <Button colorScheme={role === "editor" ? "brand" : "gray"} variant={role === "editor" ? "solid" : "outline"} onClick={() => setRole("editor")}>
            Can edit
          </Button>
          <Button colorScheme={role === "viewer" ? "brand" : "gray"} variant={role === "viewer" ? "solid" : "outline"} onClick={() => setRole("viewer")}>
            View only
          </Button>
        </ButtonGroup>
        {!link && (
          <Button size="xs" onClick={() => void load()} isLoading={inviteLink.isPending}>
            Get link
          </Button>
        )}
      </HStack>
      {link && (
        <>
          <InputGroup size="sm">
            <Input value={link.url} isReadOnly pr="72px" fontSize="xs" />
            <InputRightElement width="72px">
              <Button size="xs" leftIcon={<FiCopy />} onClick={onCopy}>
                {hasCopied ? "Copied" : "Copy"}
              </Button>
            </InputRightElement>
          </InputGroup>
          <HStack justify="space-between" mt={1}>
            <Text fontSize="xs" color="gray.500">
              Anyone with this link can join after signing in · expires {new Date(link.expiresAt).toLocaleDateString()} · used {link.uses}×
            </Text>
            <Button size="xs" variant="link" leftIcon={<FiRefreshCw />} onClick={() => void load(true)}>
              Reset
            </Button>
          </HStack>
        </>
      )}
    </Box>
  );
}

export function TripMembersPanel({ trip, currentUserId }: TripMembersPanelProps) {
  const toast = useToast();
  const { data } = useTripMembersQuery(trip.id);
  const members = data?.members ?? [];
  const [email, setEmail] = useState("");
  const addMember = useAddTripMember(trip.id);
  const removeMember = useRemoveTripMember(trip.id);
  const setRole = useSetMemberRole(trip.id);
  const [busyId, setBusyId] = useState<string | null>(null);
  const myRole = getTripRole(trip, currentUserId);
  const isOwner = myRole === "owner";

  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const run = async (id: string, fn: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    try {
      await fn();
      toast({ title: success, status: "success", duration: 2000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    } finally {
      setBusyId(null);
    }
  };

  const handleAdd = async () => {
    if (!email.trim()) return;
    await run("add", () => addMember.mutateAsync(email.trim()), "Member added");
    setEmail("");
  };

  return (
    <Box p={5} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
      <Text fontWeight="semibold" fontSize="sm" mb={1}>
        Who's going
      </Text>
      <Text fontSize="xs" color="gray.500" mb={4}>
        Editors can change the plan. View-only members can see everything, vote on places and comment.
      </Text>

      <Stack spacing={3} mb={5}>
        {members.map((member) => (
          <Flex key={member.id} align="center" justify="space-between" gap={3}>
            <HStack spacing={3} minW={0}>
              <Avatar size="sm" name={member.name} />
              <Box minW={0}>
                <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                  {member.name}
                  {member.id === currentUserId ? " (you)" : ""}
                </Text>
                <Text fontSize="xs" color="gray.500" noOfLines={1}>
                  {member.email}
                </Text>
              </Box>
            </HStack>
            <HStack spacing={1} flexShrink={0}>
              {isOwner && member.role !== "owner" ? (
                <Select
                  size="xs"
                  w="100px"
                  value={member.role}
                  isDisabled={busyId === member.id}
                  onChange={(e) =>
                    void run(member.id, () => setRole.mutateAsync({ userId: member.id, role: e.target.value as "editor" | "viewer" }), "Role updated")
                  }
                >
                  <option value="editor">Can edit</option>
                  <option value="viewer">View only</option>
                </Select>
              ) : (
                <Tag size="sm" colorScheme={member.role === "owner" ? "purple" : member.role === "viewer" ? "gray" : "brand"}>
                  {ROLE_LABEL[member.role]}
                </Tag>
              )}
              {isOwner && member.role !== "owner" && (
                <IconButton
                  aria-label={`Remove ${member.name}`}
                  icon={<FiUserMinus />}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  isLoading={busyId === member.id && removeMember.isPending}
                  onClick={() => void run(member.id, () => removeMember.mutateAsync(member.id), "Member removed")}
                />
              )}
            </HStack>
          </Flex>
        ))}
      </Stack>

      {myRole !== "viewer" && (
        <Stack spacing={5}>
          <InviteLinkBox trip={trip} />
          <FormControl>
            <FormLabel fontSize="sm">Or add someone who already has an account</FormLabel>
            <HStack>
              <Input
                size="sm"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleAdd();
                  }
                }}
              />
              <Button size="sm" leftIcon={<FiUserPlus />} colorScheme="brand" onClick={() => void handleAdd()} isLoading={busyId === "add"} flexShrink={0}>
                Add
              </Button>
            </HStack>
          </FormControl>
        </Stack>
      )}
    </Box>
  );
}
