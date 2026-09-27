import {
  Avatar,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  IconButton,
  Stack,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
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

function CommentItem({ comment, canDelete, onDelete }: { comment: TripComment; canDelete: boolean; onDelete: () => void }) {
  const muted = useColorModeValue("gray.500", "gray.400");
  return (
    <Flex gap={3} role="group">
      <Avatar size="xs" name={comment.userName} mt={1} />
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
        <IconButton aria-label="Delete comment" icon={<FiTrash2 />} size="xs" variant="ghost" opacity={0} _groupHover={{ opacity: 1 }} onClick={onDelete} />
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
  const muted = useColorModeValue("gray.500", "gray.400");
  const border = useColorModeValue("gray.200", "gray.700");

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
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          {target?.type === "trip" ? "Trip discussion" : target?.label}
          <Text fontSize="xs" fontWeight="normal" color={muted}>
            {target?.type === "trip" ? "Everyone on the trip sees this" : "Comments on this stop"}
          </Text>
        </DrawerHeader>
        <DrawerBody py={4}>
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
                <Text fontSize="xs" color={muted} mb={3}>
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
        <DrawerFooter borderTopWidth="1px" flexDirection="column" alignItems="stretch" gap={2}>
          <Textarea
            size="sm"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
            }}
          />
          <Button colorScheme="brand" size="sm" alignSelf="flex-end" onClick={send} isLoading={add.isPending} isDisabled={!text.trim()}>
            Post
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
