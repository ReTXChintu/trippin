import {
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Stack,
  Text,
  useClipboard,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { LuCopy, LuLink, LuMail, LuPencil, LuRefreshCw, LuTrash2, LuX } from "react-icons/lu";
import {
  useAddTripMember,
  useInviteLink,
  useRemovePendingTripMember,
  useRemoveTripMember,
  useSetMemberRole,
  useTripMembersQuery,
} from "@/modules/trips/hooks/useTrips";
import { getApiErrorMessage } from "@/lib/api";
import { getTripRole } from "@/lib/trip-access";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { InviteLink } from "@/modules/trips/types/trip-collab.types";
import { Pill, Segmented } from "@/components/ui";
import { dayToken } from "@/components/ui/day";
import { SectionLabel } from "@/components/ui/plan";
import { differenceInCalendarDays, parseISO } from "date-fns";

interface TripMembersPanelProps {
  trip: Trip;
  currentUserId: string;
}

const ROLE_LABEL = { owner: "Owner", editor: "Editor", viewer: "Viewer" } as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

function expiresIn(iso: string): string {
  try {
    const days = differenceInCalendarDays(parseISO(iso), new Date());
    return days <= 0 ? "Expires today" : `Expires in ${days} day${days === 1 ? "" : "s"}`;
  } catch {
    return "";
  }
}

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
    <Stack spacing={2} p={3} borderWidth="1px" borderColor="ln" borderRadius="xl">
      <Flex justify="space-between" align="center" gap={2} flexWrap="wrap">
        <Segmented
          size="sm"
          value={role}
          onChange={setRole}
          options={[
            { value: "editor", label: "Can edit", icon: LuPencil },
            { value: "viewer", label: "View only" },
          ]}
        />
        {link && (
          <Text fontSize="12px" color="tx3">
            {expiresIn(link.expiresAt)} · used {link.uses}×
          </Text>
        )}
      </Flex>
      {link ? (
        <Flex gap={2} flexWrap={{ base: "wrap", sm: "nowrap" }}>
          <InputGroup>
            <InputLeftElement pointerEvents="none" color="tx3">
              <LuLink size={15} />
            </InputLeftElement>
            <Input value={link.url} isReadOnly aria-label="Invite link" onFocus={(e) => e.target.select()} />
          </InputGroup>
          <Button variant="outline" leftIcon={<LuCopy size={16} />} onClick={onCopy} h="40px" flexShrink={0}>
            {hasCopied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" leftIcon={<LuRefreshCw size={16} />} onClick={() => void load(true)} h="40px" flexShrink={0} isLoading={inviteLink.isPending}>
            Reset
          </Button>
        </Flex>
      ) : (
        <Button variant="outline" leftIcon={<LuLink size={16} />} onClick={() => void load()} isLoading={inviteLink.isPending} alignSelf="flex-start">
          Get a {role === "editor" ? "“can edit”" : "“view only”"} link
        </Button>
      )}
      <Text fontSize="12px" color="tx3">
        Anyone with this link can join after signing in.
      </Text>
    </Stack>
  );
}

export function TripMembersPanel({ trip, currentUserId }: TripMembersPanelProps) {
  const toast = useToast();
  const { data } = useTripMembersQuery(trip.id);
  const members = data?.members ?? [];
  const pending = data?.pending ?? [];
  const [email, setEmail] = useState("");
  const addMember = useAddTripMember(trip.id);
  const removeMember = useRemoveTripMember(trip.id);
  const removePending = useRemovePendingTripMember(trip.id);
  const setRole = useSetMemberRole(trip.id);
  const [busyId, setBusyId] = useState<string | null>(null);
  const myRole = getTripRole(trip, currentUserId);
  const isOwner = myRole === "owner";

  const run = async <T,>(id: string, fn: () => Promise<T>, success: string | ((result: T) => string)) => {
    setBusyId(id);
    try {
      const result = await fn();
      toast({ title: typeof success === "function" ? success(result) : success, status: "success", duration: 3000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    } finally {
      setBusyId(null);
    }
  };

  const handleAdd = async () => {
    if (!email.trim()) return;
    const to = email.trim();
    await run("add", () => addMember.mutateAsync(to), (r) =>
      r.invited ? `Invite sent to ${to} — they join when they first sign in` : "Member added",
    );
    setEmail("");
  };

  return (
    <Stack spacing={4}>
      <Stack as="section" spacing="10px" aria-label="Members and roles">
        <SectionLabel>Members & roles</SectionLabel>
        {members.map((member, i) => (
          <Flex key={member.id} align="center" gap="10px">
            <Flex
              w="30px"
              h="30px"
              borderRadius="full"
              bg={dayToken(i + 1)}
              color="pin.fg"
              fontSize="12px"
              fontWeight={700}
              align="center"
              justify="center"
              flexShrink={0}
              aria-hidden
            >
              {initials(member.name)}
            </Flex>
            <Box flex={1} minW={0}>
              <Text fontWeight={600} noOfLines={1}>
                {member.name}
                {member.id === currentUserId ? " (you)" : ""}
              </Text>
              <Text fontSize="12px" color="tx3" noOfLines={1}>
                {member.email}
              </Text>
            </Box>
            {isOwner && member.role !== "owner" ? (
              <>
                <Select
                  size="sm"
                  h="32px"
                  w="112px"
                  borderRadius="md"
                  fontWeight={600}
                  fontSize="13px"
                  value={member.role}
                  isDisabled={busyId === member.id}
                  aria-label={`Role for ${member.name}`}
                  onChange={(e) =>
                    void run(member.id, () => setRole.mutateAsync({ userId: member.id, role: e.target.value as "editor" | "viewer" }), "Role updated")
                  }
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </Select>
                <IconButton
                  aria-label={`Remove ${member.name}`}
                  title={`Remove ${member.name}`}
                  icon={<LuTrash2 size={18} />}
                  variant="ghost"
                  colorScheme="gray"
                  isLoading={busyId === member.id && removeMember.isPending}
                  onClick={() => void run(member.id, () => removeMember.mutateAsync(member.id), "Member removed")}
                />
              </>
            ) : (
              <Pill tone={member.role === "owner" ? "accent" : "neutral"}>{ROLE_LABEL[member.role]}</Pill>
            )}
          </Flex>
        ))}
        {pending.map((invite) => (
          <Flex key={invite.email} align="center" gap="10px">
            <Flex
              w="30px"
              h="30px"
              borderRadius="full"
              borderWidth="1px"
              borderStyle="dashed"
              borderColor="tx3"
              color="tx3"
              align="center"
              justify="center"
              flexShrink={0}
              aria-hidden
            >
              <LuMail size={14} />
            </Flex>
            <Box flex={1} minW={0}>
              <Text fontWeight={600} noOfLines={1}>
                {invite.email}
              </Text>
              <Text fontSize="12px" color="tx3" noOfLines={1}>
                Invited — joins when they first sign in
              </Text>
            </Box>
            <Pill tone="neutral">Invited</Pill>
            {myRole !== "viewer" && (
              <IconButton
                aria-label={`Withdraw the invite to ${invite.email}`}
                title="Withdraw invite"
                icon={<LuX size={18} />}
                variant="ghost"
                isLoading={busyId === invite.email && removePending.isPending}
                onClick={() => void run(invite.email, () => removePending.mutateAsync(invite.email), "Invite withdrawn")}
              />
            )}
          </Flex>
        ))}
        <Text fontSize="12px" color="tx3">
          Editors change the plan. Viewers see everything and can vote and comment. Only the owner changes roles or removes members.
        </Text>
      </Stack>

      {myRole !== "viewer" && (
        <>
          <Divider borderColor="ln" />
          <Stack as="section" spacing="10px" aria-label="Invite links">
            <SectionLabel>Invite links</SectionLabel>
            <InviteLinkBox trip={trip} />
            <Flex gap={2} align="flex-end">
              <FormControl>
                <FormLabel>Invite by email — they join as an editor when they sign in</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none" color="tx3">
                    <LuMail size={16} />
                  </InputLeftElement>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleAdd();
                      }
                    }}
                  />
                </InputGroup>
              </FormControl>
              <Button h="40px" onClick={() => void handleAdd()} isLoading={busyId === "add"} flexShrink={0} isDisabled={!email.trim()}>
                Invite
              </Button>
            </Flex>
          </Stack>
        </>
      )}
      {myRole === "viewer" && (
        <HStack fontSize="12px" color="tx3">
          <Text>You're a viewer on this trip.</Text>
        </HStack>
      )}
    </Stack>
  );
}
