import {
  Button,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Stack,
  Wrap,
  WrapItem,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { useSaveExpense } from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from "@/modules/trips/types/trip-extras.types";
import { COMMON_CURRENCIES } from "@/modules/trips/utils/money";
import { CATEGORY_LABELS } from "./budgetMeta";

interface ExpenseFormModalProps {
  trip: Trip;
  members: { id: string; name: string }[];
  currentUserId: string;
  /** Expense to edit, `{}` for a new one, null = closed. */
  initial: Partial<Expense> | null;
  onClose: () => void;
}

export function ExpenseFormModal({ trip, members, currentUserId, initial, onClose }: ExpenseFormModalProps) {
  const toast = useToast();
  const save = useSaveExpense(trip.id);
  const [draft, setDraft] = useState<Partial<Expense>>({});

  useEffect(() => {
    if (!initial) return;
    const today = new Date().toISOString().slice(0, 10);
    const tripStart = trip.startDate.slice(0, 10);
    const tripEnd = trip.endDate.slice(0, 10);
    setDraft({
      category: "food",
      currency: trip.currency,
      date: today >= tripStart && today <= tripEnd ? today : tripStart,
      paidBy: currentUserId,
      splitWith: members.map((m) => m.id),
      ...initial,
    });
  }, [initial, trip, members, currentUserId]);

  const patch = (fields: Partial<Expense>) => setDraft((prev) => ({ ...prev, ...fields }));
  const valid = Boolean(draft.description?.trim() && draft.amount && draft.amount > 0 && draft.paidBy && draft.splitWith?.length);

  const handleSave = async () => {
    if (!valid) return;
    try {
      await save.mutateAsync({
        id: draft.id,
        description: draft.description!.trim(),
        category: draft.category as ExpenseCategory,
        amount: draft.amount!,
        currency: draft.currency ?? trip.currency,
        date: draft.date!,
        paidBy: draft.paidBy!,
        splitWith: draft.splitWith!,
      });
      toast({ title: draft.id ? "Expense updated" : "Expense added", status: "success", duration: 2000 });
      onClose();
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error", duration: 5000 });
    }
  };

  return (
    <Modal isOpen={Boolean(initial)} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent mx={{ base: 3, md: "auto" }}>
        <ModalHeader>{draft.id ? "Edit expense" : "Add an expense"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>What for?</FormLabel>
              <Input value={draft.description ?? ""} onChange={(e) => patch({ description: e.target.value })} placeholder="Dinner at Tapri, auto to fort…" />
            </FormControl>
            <HStack align="end" spacing={3}>
              <FormControl isRequired>
                <FormLabel>Amount</FormLabel>
                <Input type="number"
                  min={0}
                  step="0.01"
                  value={draft.amount ?? ""}
                  onChange={(e) => patch({ amount: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </FormControl>
              <FormControl w="120px" flexShrink={0}>
                <FormLabel>Currency</FormLabel>
                <Select value={draft.currency ?? trip.currency} onChange={(e) => patch({ currency: e.target.value })}>
                  {[...new Set([trip.currency, ...COMMON_CURRENCIES])].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </HStack>
            <SimpleGrid columns={2} spacing={3}>
              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select value={draft.category ?? "food"} onChange={(e) => patch({ category: e.target.value as ExpenseCategory })}>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c].label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Date</FormLabel>
                <Input type="date" value={draft.date ?? ""} onChange={(e) => patch({ date: e.target.value })} />
              </FormControl>
            </SimpleGrid>
            {members.length > 1 && (
              <>
                <FormControl>
                  <FormLabel>Paid by</FormLabel>
                  <Select value={draft.paidBy ?? ""} onChange={(e) => patch({ paidBy: e.target.value })}>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id === currentUserId ? `${m.name} (you)` : m.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Split equally between</FormLabel>
                  <CheckboxGroup value={draft.splitWith ?? []} onChange={(v) => patch({ splitWith: v as string[] })}>
                    <Wrap spacing={4}>
                      {members.map((m) => (
                        <WrapItem key={m.id}>
                          <Checkbox value={m.id} size="sm">
                            {m.name}
                          </Checkbox>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </CheckboxGroup>
                </FormControl>
              </>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={2} onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} isDisabled={!valid} isLoading={save.isPending}>
            {draft.id ? "Save" : "Add expense"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
