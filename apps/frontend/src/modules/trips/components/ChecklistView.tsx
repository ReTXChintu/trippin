import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  HStack,
  IconButton,
  Input,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { getApiErrorMessage } from "@/lib/api";
import {
  useAddChecklistItems,
  useChecklistSuggestionsQuery,
  useRemoveChecklistItem,
  useUpdateChecklistItem,
} from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { ChecklistCategory, ChecklistSuggestion } from "@/modules/trips/types/trip-extras.types";

const SECTIONS: { key: ChecklistCategory; title: string; placeholder: string }[] = [
  { key: "todo", title: "Before you go", placeholder: "Book the fort tour…" },
  { key: "documents", title: "Documents", placeholder: "Visa printout…" },
  { key: "packing", title: "Packing", placeholder: "Sandals…" },
];

function Section({ trip, section, suggestions }: { trip: Trip; section: (typeof SECTIONS)[number]; suggestions: ChecklistSuggestion[] }) {
  const toast = useToast();
  const add = useAddChecklistItems(trip.id);
  const update = useUpdateChecklistItem(trip.id);
  const remove = useRemoveChecklistItem(trip.id);
  const [text, setText] = useState("");
  const bg = "bg.surface";
  const border = "border.line";
  const muted = "fg.muted";

  const items = trip.checklist.filter((c) => c.category === section.key);
  const done = items.filter((c) => c.done).length;

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    setText("");
    void run(() => add.mutateAsync([{ text: value, category: section.key }]));
  };

  return (
    <Box p={5} bg={bg} borderWidth="1px" borderColor={border} borderRadius="xl">
      <HStack justify="space-between" mb={3}>
        <Heading size="sm">{section.title}</Heading>
        <Text fontSize="xs" color={muted}>
          {done}/{items.length}
        </Text>
      </HStack>

      <Stack spacing={1} mb={3}>
        {items.map((item) => (
          <Flex key={item.id} align="center" gap={2} role="group" py={0.5}>
            <Checkbox
              isChecked={item.done}
              onChange={(e) => void run(() => update.mutateAsync({ id: item.id, done: e.target.checked }))}
              colorScheme="brand"
              flex={1}
            >
              <Text fontSize="sm" textDecoration={item.done ? "line-through" : undefined} color={item.done ? muted : undefined}>
                {item.text}
              </Text>
            </Checkbox>
            <IconButton
              aria-label="Remove item"
              icon={<FiX />}
              size="xs"
              variant="ghost"
              opacity={0}
              _groupHover={{ opacity: 1 }}
              _focus={{ opacity: 1 }}
              onClick={() => void run(() => remove.mutateAsync(item.id))}
            />
          </Flex>
        ))}
        {items.length === 0 && (
          <Text fontSize="sm" color={muted}>
            Nothing here yet.
          </Text>
        )}
      </Stack>

      <HStack as="form" onSubmit={(e) => { e.preventDefault(); submit(); }} spacing={2}>
        <Input size="sm" value={text} onChange={(e) => setText(e.target.value)} placeholder={section.placeholder} />
        <IconButton type="submit" aria-label="Add item" icon={<FiPlus />} size="sm" isLoading={add.isPending} />
      </HStack>

      {suggestions.length > 0 && (
        <Box mt={4}>
          <Text fontSize="xs" color={muted} mb={2}>
            Suggested for this trip
          </Text>
          <Flex gap={2} flexWrap="wrap">
            {suggestions.map((s) => (
              <Tooltip key={s.text} label={s.reason} isDisabled={!s.reason} hasArrow>
                <Badge
                  as="button"
                  px={2}
                  py={1}
                  borderRadius="md"
                  variant="outline"
                  colorScheme="brand"
                  textTransform="none"
                  fontWeight="normal"
                  cursor="pointer"
                  onClick={() => void run(() => add.mutateAsync([{ text: s.text, category: s.category }]))}
                >
                  + {s.text}
                </Badge>
              </Tooltip>
            ))}
          </Flex>
        </Box>
      )}
    </Box>
  );
}

export function ChecklistView({ trip }: { trip: Trip }) {
  const { data } = useChecklistSuggestionsQuery(trip.id);
  const add = useAddChecklistItems(trip.id);
  const toast = useToast();
  const muted = "fg.muted";
  const suggestions = data?.suggestions ?? [];
  const total = trip.checklist.length;
  const done = trip.checklist.filter((c) => c.done).length;

  const addAll = async () => {
    try {
      await add.mutateAsync(suggestions.map((s) => ({ text: s.text, category: s.category })));
      toast({ title: `Added ${suggestions.length} items`, status: "success", duration: 2000 });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Stack spacing={6}>
      <Flex justify="space-between" align="start" gap={3} flexWrap="wrap">
        <Box>
          <Heading size="md">Checklist</Heading>
          <Text fontSize="sm" color={muted}>
            Shared with everyone on the trip. Suggestions use your weather, bookings and plans.
          </Text>
        </Box>
        {suggestions.length > 0 && (
          <Button size="sm" variant="outline" leftIcon={<FiPlus />} onClick={addAll} isLoading={add.isPending}>
            Add all {suggestions.length} suggestions
          </Button>
        )}
      </Flex>
      {total > 0 && (
        <Box maxW="480px">
          <Text fontSize="sm" mb={1}>
            {done} of {total} done
          </Text>
          <Progress value={(done / total) * 100} colorScheme="brand" size="sm" borderRadius="full" />
        </Box>
      )}
      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4} alignItems="start">
        {SECTIONS.map((section) => (
          <Section key={section.key} trip={trip} section={section} suggestions={suggestions.filter((s) => s.category === section.key)} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
