import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerOverlay,
  Flex,
  HStack,
  IconButton,
  Stack,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { LuSend, LuTrash2 } from "react-icons/lu";
import { PanelHeader } from "@/components/ui/plan";
import { dayToken } from "@/components/ui/day";
import { getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useAddComment, useCommentsQuery, useDeleteComment } from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { CommentTarget, TripComment } from "@/modules/trips/types/trip-collab.types";

export interface CommentThreadTarget {
  type: CommentTarget;
  id: string;
  label: string;
}

function ago(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

function hashIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return (Math.abs(h) % 8) + 1;
}

function CommentItem({ comment, canDelete, onDelete }: { comment: TripComment; canDelete: boolean; onDelete: () => void }) {
  const muted = "fg.muted";
  return (
    <Flex gap={3} role="group">
      <Flex
        w="30px"
        h="30px"
        mt="2px"
        borderRadius="full"
        bg={dayToken(hashIndex(comment.userId))}
        color="pin.fg"
        fontSize="12px"
        fontWeight={700}
        align="center"
        justify="center"
        flexShrink={0}
        aria-hidden
      >
        {initials(comment.userName)}
      </Flex>
      <Box flex={1} minW={0}>
        <HStack spacing={2}>
          <Text fontSize="sm" fontWeight="semibold">
            {comment.userName}
          </Text>
          <Text fontSize="xs" color={muted}>
            {ago(comment.createdAt)}
          </Text>
        </HStack>
        <Text fontSize="sm" whiteSpace="pre-wrap">
          {comment.text}
        </Text>
      </Box>
      {canDelete && (
        <IconButton
          aria-label="Delete comment"
          icon={<LuTrash2 />}
          size="xs"
          variant="ghost"
          opacity={0}
          _groupHover={{ opacity: 1 }}
          _focusVisible={{ opacity: 1 }}
          onClick={onDelete}
        />
      )}
    </Flex>
  );
}

/** A comment thread on one stop / place, or — for the trip target — the trip-wide discussion plus
 * the latest comments from everywhere else. */
export function CommentsDrawer({ trip, target, onClose }: { trip: Trip; target: CommentThreadTarget | null; onClose: () => void }) {
  const toast = useToast();
  const userId = useAuthStore((s) => s.user?.id ?? "");
  const { data } = useCommentsQuery(trip.id, { live: Boolean(target) });
  const add = useAddComment(trip.id);
  const remove = useDeleteComment(trip.id);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const muted = "fg.muted";
  const border = "border.line";

  const all = data?.comments ?? [];
  const thread = target ? all.filter((c) => c.targetType === target.type && c.targetId === target.id) : [];
  const elsewhere = target?.type === "trip" ? all.filter((c) => c.targetType !== "trip").slice(-8).reverse() : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length, target]);

  const send = async () => {
    if (!target || !text.trim()) return;
    try {
      await add.mutateAsync({ targetType: target.type, targetId: target.id, targetLabel: target.type === "trip" ? undefined : target.label, text: text.trim() });
      setText("");
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Drawer isOpen={Boolean(target)} onClose={onClose} placement="right" size="sm">
      <DrawerOverlay />
      <DrawerContent maxW={{ base: "100vw", md: "440px" }} bg="bg.surface">
        <PanelHeader
          title={target?.type === "trip" ? "Discussion" : target?.label}
          subtitle={target?.type === "trip" ? "Everyone on the trip sees this" : "Comments on this stop"}
          onClose={onClose}
        />
        <DrawerBody px={6} py={5}>
          <Stack spacing={4}>
            {thread.length === 0 && (
              <Text fontSize="sm" color={muted}>
                No comments yet — start the conversation.
              </Text>
            )}
            {thread.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                canDelete={c.userId === userId || trip.userId === userId}
                onDelete={() => remove.mutate(c.id)}
              />
            ))}
            <div ref={endRef} />
            {elsewhere.length > 0 && (
              <Box pt={4} borderTopWidth="1px" borderColor={border}>
                <Text fontSize="12px" fontWeight={600} textTransform="uppercase" letterSpacing="0.06em" color={muted} mb={3}>
                  Recent comments on places & stops
                </Text>
                <Stack spacing={3}>
                  {elsewhere.map((c) => (
                    <Box key={c.id} fontSize="sm">
                      <Text fontSize="xs" color={muted}>
                        {c.userName} on <b>{c.targetLabel ?? "a stop"}</b> · {ago(c.createdAt)}
                      </Text>
                      <Text noOfLines={3}>{c.text}</Text>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </DrawerBody>
        <DrawerFooter borderTopWidth="1px" borderColor={border} px={6} py={4} flexDirection="column" alignItems="stretch" gap={2}>
          <Textarea
            rows={2}
            aria-label="Write a comment"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
            }}
          />
          <HStack justify="space-between">
            <Text fontSize="12px" color={muted}>
              Ctrl + Enter to post
            </Text>
            <Button leftIcon={<LuSend size={15} />} onClick={send} isLoading={add.isPending} isDisabled={!text.trim()}>
              Post
            </Button>
          </HStack>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
