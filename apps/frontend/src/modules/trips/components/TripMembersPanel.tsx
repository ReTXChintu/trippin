import {
  Avatar,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Stack,
  Tag,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { FiUserMinus, FiUserPlus } from "react-icons/fi";
import { useAddTripMember, useRemoveTripMember, useTripMembersQuery } from "@/modules/trips/hooks/useTrips";
import { getApiErrorMessage } from "@/lib/api";
import type { Trip } from "@/modules/trips/types/trip.types";

interface TripMembersPanelProps {
  trip: Trip;
  currentUserId: string;
}

export function TripMembersPanel({ trip, currentUserId }: TripMembersPanelProps) {
  const toast = useToast();
  const { data } = useTripMembersQuery(trip.id);
  const members = data?.members ?? [];
  const [email, setEmail] = useState("");
  const addMember = useAddTripMember(trip.id);
  const removeMember = useRemoveTripMember(trip.id);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const handleAdd = async () => {
    if (!email.trim()) return;
    try {
      await addMember.mutateAsync(email.trim());
      setEmail("");
      toast({ title: "Member added", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  const handleRemove = async (memberUserId: string) => {
    setRemovingId(memberUserId);
    try {
      await removeMember.mutateAsync(memberUserId);
      toast({ title: "Member removed", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Box p={5} bg={bg} borderWidth="1px" borderColor={borderColor} borderRadius="xl">
      <Text fontWeight="semibold" fontSize="sm" mb={3}>
        Trip members
      </Text>
      <Text fontSize="xs" color="gray.500" mb={4}>
        All members can edit trip details and the itinerary. Only the owner can delete the trip.
      </Text>

      <Stack spacing={3} mb={4}>
        {members.map((member) => (
          <Flex key={member.id} align="center" justify="space-between" gap={3}>
            <HStack spacing={3} minW={0}>
              <Avatar size="sm" name={member.name} />
              <Box minW={0}>
                <HStack spacing={2}>
                  <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                    {member.name}
                    {member.id === currentUserId ? " (you)" : ""}
                  </Text>
                  <Tag size="sm" colorScheme={member.role === "owner" ? "purple" : "gray"}>
                    {member.role}
                  </Tag>
                </HStack>
                <Text fontSize="xs" color="gray.500" noOfLines={1}>
                  {member.email}
                </Text>
              </Box>
            </HStack>
            {member.role === "member" && (
              <IconButton
                aria-label={`Remove ${member.name}`}
                icon={<FiUserMinus />}
                size="sm"
                variant="ghost"
                colorScheme="red"
                isLoading={removingId === member.id}
                onClick={() => handleRemove(member.id)}
              />
            )}
          </Flex>
        ))}
      </Stack>

      <FormControl>
        <FormLabel fontSize="sm">Add member by email</FormLabel>
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
          <Button
            size="sm"
            leftIcon={<FiUserPlus />}
            colorScheme="brand"
            onClick={() => void handleAdd()}
            isLoading={addMember.isPending}
            flexShrink={0}
          >
            Add
          </Button>
        </HStack>
        <Text fontSize="xs" color="gray.500" mt={1}>
          They must already have an account. An email with a trip link will be sent.
        </Text>
      </FormControl>
    </Box>
  );
}
