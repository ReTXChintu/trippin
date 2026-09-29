import {
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import type { IconType } from "react-icons";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { LuFileText, LuListTodo, LuLuggage, LuSparkles } from "react-icons/lu";
import { ChoiceChip, Pill } from "@/components/ui";
import { Bar } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/api";
import {
  useAddChecklistItems,
  useChecklistSuggestionsQuery,
  useRemoveChecklistItem,
  useUpdateChecklistItem,
} from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { ChecklistCategory, ChecklistItem, ChecklistSuggestion } from "@/modules/trips/types/trip-extras.types";

const SECTIONS: { key: ChecklistCategory; title: string; placeholder: string; icon: IconType; empty: string; firstLabel: string }[] = [
  { key: "packing", title: "Packing", placeholder: "Add an item", icon: LuLuggage, empty: "Nothing packed yet. Add things like “Power adapter” or “Sandals”.", firstLabel: "Add first item" },
  { key: "documents", title: "Documents", placeholder: "Add a document", icon: LuFileText, empty: "Nothing here yet. Add things like “Visa printout” or “Travel insurance”.", firstLabel: "Add first document" },
  { key: "todo", title: "To-do", placeholder: "Add a to-do", icon: LuListTodo, empty: "Nothing here yet. Add things like “Book the fort tour” or “Buy travel insurance”.", firstLabel: "Add first to-do" },
];

function ItemRow({ item, onRun, tripId }: { item: ChecklistItem; tripId: string; onRun: (fn: () => Promise<unknown>) => void }) {
  const update = useUpdateChecklistItem(tripId);
  const remove = useRemoveChecklistItem(tripId);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);

  const save = () => {
    const value = text.trim();
    setEditing(false);
    if (value && value !== item.text) onRun(() => update.mutateAsync({ id: item.id, text: value }));
    else setText(item.text);
  };

  return (
    <Flex align="center" gap="10px" py="10px" px={1} borderTopWidth="1px" borderColor="border.line">
      {editing ? (
        <Input
          size="sm"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setText(item.text);
              setEditing(false);
            }
          }}
          aria-label={`Rename ${item.text}`}
        />
      ) : (
        <Checkbox
          isChecked={item.done}
          onChange={(e) => onRun(() => update.mutateAsync({ id: item.id, done: e.target.checked }))}
          flex={1}
          minW={0}
          size="lg"
          sx={{ ".chakra-checkbox__control": { w: "20px", h: "20px", borderRadius: "6px" } }}
        >
          <Text fontSize="14px" textDecoration={item.done ? "line-through" : undefined} color={item.done ? "fg.muted" : undefined} noOfLines={2}>
            {item.text}
          </Text>
        </Checkbox>
      )}
      <IconButton aria-label={`Rename ${item.text}`} title="Rename" icon={<FiEdit2 size={16} />} variant="ghost" size="sm" onClick={() => setEditing(true)} isDisabled={editing} />
      <IconButton
        aria-label={`Delete ${item.text}`}
        title="Delete"
        icon={<FiTrash2 size={16} />}
        variant="ghost"
        size="sm"
        color="fg.muted"
        _hover={{ color: "danger", bg: "danger.soft" }}
        isLoading={remove.isPending}
        onClick={() => onRun(() => remove.mutateAsync(item.id))}
      />
    </Flex>
  );
}

function Section({ trip, section, suggestions }: { trip: Trip; section: (typeof SECTIONS)[number]; suggestions: ChecklistSuggestion[] }) {
  const toast = useToast();
  const add = useAddChecklistItems(trip.id);
  const [text, setText] = useState("");
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const suggestionChips = suggestions.length > 0 && (
    <Box pt={3}>
      <Text fontSize="12px" color="fg.muted" mb={2}>
        Suggested for this trip
      </Text>
      <Flex gap="6px" flexWrap="wrap">
        {suggestions.map((s) => (
          <Tooltip key={s.text} label={s.reason} isDisabled={!s.reason} hasArrow>
            <ChoiceChip soft icon={FiPlus} onClick={() => void run(() => add.mutateAsync([{ text: s.text, category: s.category }]))}>
              {s.text}
            </ChoiceChip>
          </Tooltip>
        ))}
      </Flex>
    </Box>
  );

  const addForm = (
    <HStack
      as="form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      spacing={2}
      pt="10px"
      borderTopWidth={items.length ? "1px" : 0}
      borderColor="border.line"
    >
      <InputGroup>
        <InputLeftElement pointerEvents="none" color="fg.muted">
          <FiPlus />
        </InputLeftElement>
        <Input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={section.placeholder} aria-label={`Add item to ${section.title}`} />
      </InputGroup>
      <Button type="submit" isLoading={add.isPending} h="40px" flexShrink={0}>
        Add
      </Button>
    </HStack>
  );

  if (items.length === 0 && !showInput) {
    return (
      <Flex as="section" direction="column" align="center" justify="center" textAlign="center" gap="10px" p="18px" minH="260px" bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl" aria-label={section.title}>
        <Icon as={section.icon} boxSize="24px" color="accent" />
        <Text as="h2" fontFamily="heading" fontWeight={600} fontSize="20px">
          {section.title}
        </Text>
        <Text color="fg.muted" maxW="280px">
          {section.empty}
        </Text>
        <Button
          leftIcon={<FiPlus size={16} />}
          onClick={() => {
            setShowInput(true);
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          {section.firstLabel}
        </Button>
        {suggestionChips}
      </Flex>
    );
  }

  return (
    <Box as="section" p="18px" bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl" aria-label={section.title}>
      <Flex justify="space-between" align="center" mb={items.length ? 0 : 2} pb={items.length ? "10px" : 0}>
        <Text as="h2" fontFamily="heading" fontWeight={600} fontSize="20px">
          {section.title}
        </Text>
        <Pill tone={items.length > 0 && done === items.length ? "success" : "neutral"}>
          {done} / {items.length}
        </Pill>
      </Flex>
      {items.map((item) => (
        <ItemRow key={item.id} item={item} tripId={trip.id} onRun={(fn) => void run(fn)} />
      ))}
      {addForm}
      {suggestionChips}
    </Box>
  );
}

export function ChecklistView({ trip }: { trip: Trip }) {
  const { data } = useChecklistSuggestionsQuery(trip.id);
  const add = useAddChecklistItems(trip.id);
  const toast = useToast();
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
    <Stack spacing={5}>
      {(total > 0 || suggestions.length > 0) && (
        <Flex align="center" gap={4} flexWrap="wrap">
          {total > 0 && (
            <Flex align="center" gap={3} flex="1 1 240px" maxW="480px">
              <Text fontSize="13px" fontWeight={600} flexShrink={0}>
                {done} of {total} done
              </Text>
              <Bar flex={1} value={(done / total) * 100} aria-label="Checklist progress" />
            </Flex>
          )}
          <Text fontSize="12px" color="fg.muted" flex="1 1 200px">
            Shared with everyone on the trip. Suggestions use your weather, bookings and plans.
          </Text>
          {suggestions.length > 0 && (
            <Button variant="ai" leftIcon={<LuSparkles />} onClick={() => void addAll()} isLoading={add.isPending}>
              Add all {suggestions.length} suggestions
            </Button>
          )}
        </Flex>
      )}
      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={5} alignItems="start">
        {SECTIONS.map((section) => (
          <Section key={section.key} trip={trip} section={section} suggestions={suggestions.filter((s) => s.category === section.key)} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
