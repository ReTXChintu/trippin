import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Progress,
  SimpleGrid,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { FiArrowRight, FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { getApiErrorMessage } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { useBudgetQuery, useRemoveExpense } from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";
import { EXPENSE_CATEGORIES, type Expense } from "@/modules/trips/types/trip-extras.types";
import { formatShortDate } from "@/modules/trips/utils/stay.utils";
import { formatMoney } from "@/modules/trips/utils/money";
import { CATEGORY_LABELS } from "./budgetMeta";
import { ExpenseFormModal } from "./ExpenseFormModal";

interface BudgetViewProps {
  trip: Trip;
  currentUserId: string;
  onOpenSettings: () => void;
}

export function BudgetView({ trip, currentUserId, onOpenSettings }: BudgetViewProps) {
  const toast = useToast();
  const { data, isLoading } = useBudgetQuery(trip.id);
  const remove = useRemoveExpense(trip.id);
  const [editing, setEditing] = useState<Partial<Expense> | null>(null);

  const cardBg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const muted = useColorModeValue("gray.500", "gray.400");

  if (isLoading || !data) return <LoadingState />;

  const money = (n: number) => formatMoney(n, data.currency);
  const nameOf = (id: string) => data.members.find((m) => m.id === id)?.name ?? "Someone";
  // Planned items (stays, bookings, tickets) may also be logged as expenses once paid — count the
  // larger of the two per bucket instead of both; food/shopping/other are only ever logged.
  const spent = data.spent.byCategory;
  const forecast =
    Math.max(data.planned.stays, spent.stay) +
    Math.max(data.planned.bookings, spent.transport) +
    Math.max(data.planned.activities, spent.activities) +
    spent.food +
    spent.shopping +
    spent.other;
  const budget = data.budgetAmount;
  const usedPct = budget ? Math.min(Math.round((data.spent.total / budget) * 100), 100) : 0;
  const maxCategory = Math.max(...EXPENSE_CATEGORIES.map((c) => data.spent.byCategory[c]), 1);

  const handleRemove = async (expense: Expense) => {
    try {
      await remove.mutateAsync(expense.id);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  return (
    <Stack spacing={6} maxW="1000px">
      <Flex justify="space-between" align="start" gap={3} flexWrap="wrap">
        <Box>
          <Heading size="md">Budget</Heading>
          <Text fontSize="sm" color={muted}>
            Everything in {data.currency}. Expenses in other currencies are converted at the day's rate.
          </Text>
        </Box>
        <Button leftIcon={<FiPlus />} colorScheme="brand" onClick={() => setEditing({})}>
          Add expense
        </Button>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Stat p={4} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="xl">
          <StatLabel>Budget</StatLabel>
          <StatNumber>{budget !== undefined ? money(budget) : "—"}</StatNumber>
          <StatHelpText mb={0}>
            {budget !== undefined ? (
              `${money(Math.max(budget - data.spent.total, 0))} left`
            ) : (
              <Button size="xs" variant="link" colorScheme="brand" onClick={onOpenSettings}>
                Set a budget
              </Button>
            )}
          </StatHelpText>
        </Stat>
        <Stat p={4} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="xl">
          <StatLabel>Booked & planned</StatLabel>
          <StatNumber>{money(data.planned.total)}</StatNumber>
          <StatHelpText mb={0}>
            Stays {money(data.planned.stays)} · Bookings {money(data.planned.bookings)} · Tickets {money(data.planned.activities)}
          </StatHelpText>
        </Stat>
        <Stat p={4} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="xl">
          <StatLabel>Spent so far</StatLabel>
          <StatNumber>{money(data.spent.total)}</StatNumber>
          <StatHelpText mb={0}>{data.expenses.length} expense{data.expenses.length === 1 ? "" : "s"}</StatHelpText>
        </Stat>
      </SimpleGrid>

      {budget !== undefined && (
        <Box>
          <HStack justify="space-between" fontSize="sm" mb={1}>
            <Text>
              {usedPct}% of budget spent
            </Text>
            <Text color={forecast > budget ? "red.500" : muted}>
              Projected: {money(forecast)} {forecast > budget ? "— over budget" : ""}
            </Text>
          </HStack>
          <Progress value={usedPct} colorScheme={usedPct > 90 ? "red" : usedPct > 70 ? "orange" : "brand"} borderRadius="full" size="sm" />
        </Box>
      )}

      {(data.planned.nightsWithoutPrice > 0 || data.planned.unconverted > 0) && (
        <Text fontSize="xs" color={muted}>
          {data.planned.nightsWithoutPrice > 0 &&
            `${data.planned.nightsWithoutPrice} night${data.planned.nightsWithoutPrice === 1 ? " has" : "s have"} no stay price yet. `}
          {data.planned.unconverted > 0 && `${data.planned.unconverted} item(s) couldn't be converted and are left out.`}
        </Text>
      )}

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} alignItems="start">
        <Box p={5} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="xl">
          <Heading size="sm" mb={4}>
            Spending by category
          </Heading>
          <Stack spacing={3}>
            {EXPENSE_CATEGORIES.map((c) => (
              <Box key={c}>
                <HStack justify="space-between" fontSize="sm" mb={1}>
                  <HStack spacing={2}>
                    <Icon as={CATEGORY_LABELS[c].icon} color={`${CATEGORY_LABELS[c].color}.400`} />
                    <Text>{CATEGORY_LABELS[c].label}</Text>
                  </HStack>
                  <Text fontWeight="semibold">{money(data.spent.byCategory[c])}</Text>
                </HStack>
                <Progress value={(data.spent.byCategory[c] / maxCategory) * 100} size="xs" borderRadius="full" colorScheme={CATEGORY_LABELS[c].color} />
              </Box>
            ))}
          </Stack>
        </Box>

        {data.members.length > 1 && (
          <Box p={5} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="xl">
            <Heading size="sm" mb={4}>
              Who owes whom
            </Heading>
            <Stack spacing={2} mb={4}>
              {data.members.map((m) => (
                <HStack key={m.id} justify="space-between" fontSize="sm">
                  <Text>{m.id === currentUserId ? `${m.name} (you)` : m.name}</Text>
                  <Text color={m.balance > 0 ? "green.500" : m.balance < 0 ? "red.500" : muted} fontWeight="semibold">
                    {m.balance > 0 ? "gets back " : m.balance < 0 ? "owes " : "settled "}
                    {m.balance !== 0 ? money(Math.abs(m.balance)) : ""}
                  </Text>
                </HStack>
              ))}
            </Stack>
            {data.settlements.length > 0 ? (
              <Stack spacing={2} pt={3} borderTopWidth="1px" borderColor={border}>
                <Text fontSize="xs" color={muted}>
                  To settle up:
                </Text>
                {data.settlements.map((s, i) => (
                  <HStack key={i} fontSize="sm" spacing={2}>
                    <Text fontWeight="semibold">{nameOf(s.from)}</Text>
                    <FiArrowRight />
                    <Text fontWeight="semibold">{nameOf(s.to)}</Text>
                    <Text ml="auto">{money(s.amount)}</Text>
                  </HStack>
                ))}
              </Stack>
            ) : (
              <Text fontSize="sm" color={muted}>
                Everyone's square.
              </Text>
            )}
          </Box>
        )}
      </SimpleGrid>

      <Box p={5} bg={cardBg} borderWidth="1px" borderColor={border} borderRadius="xl">
        <Heading size="sm" mb={4}>
          Expenses
        </Heading>
        {data.expenses.length === 0 ? (
          <Text fontSize="sm" color={muted}>
            Nothing logged yet. Add expenses as you go — splitting between travellers is automatic.
          </Text>
        ) : (
          <Stack spacing={0} divider={<Box borderBottomWidth="1px" borderColor={border} />}>
            {data.expenses.map((e) => (
              <Flex key={e.id} py={3} gap={3} align="center">
                <Flex w="32px" h="32px" borderRadius="md" bg={`${CATEGORY_LABELS[e.category].color}.50`} _dark={{ bg: "whiteAlpha.100" }} align="center" justify="center" flexShrink={0}>
                  <Icon as={CATEGORY_LABELS[e.category].icon} color={`${CATEGORY_LABELS[e.category].color}.400`} />
                </Flex>
                <Box flex={1} minW={0}>
                  <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                    {e.description}
                  </Text>
                  <Text fontSize="xs" color={muted}>
                    {formatShortDate(e.date)}
                    {data.members.length > 1 && ` · paid by ${nameOf(e.paidBy)} · split ${e.splitWith.length} way${e.splitWith.length === 1 ? "" : "s"}`}
                  </Text>
                </Box>
                <Box textAlign="right">
                  <Text fontSize="sm" fontWeight="semibold">
                    {money(e.amountInTripCurrency)}
                  </Text>
                  {e.currency !== data.currency && (
                    <Text fontSize="xs" color={muted}>
                      {formatMoney(e.amount, e.currency)}
                    </Text>
                  )}
                </Box>
                <HStack spacing={0}>
                  <IconButton aria-label="Edit expense" icon={<FiEdit2 />} size="xs" variant="ghost" onClick={() => setEditing(e)} />
                  <IconButton aria-label="Delete expense" icon={<FiTrash2 />} size="xs" variant="ghost" colorScheme="red" onClick={() => void handleRemove(e)} />
                </HStack>
              </Flex>
            ))}
          </Stack>
        )}
      </Box>

      <ExpenseFormModal
        trip={trip}
        members={data.members}
        currentUserId={currentUserId}
        initial={editing}
        onClose={() => setEditing(null)}
      />
    </Stack>
  );
}
