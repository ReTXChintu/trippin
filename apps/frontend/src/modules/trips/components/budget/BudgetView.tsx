import {
  Box,
  Button,
  Divider,
  Flex,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
  Text,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { FiArrowRight, FiEdit2, FiMoreHorizontal, FiPlus, FiTrash2 } from "react-icons/fi";
import { LuExternalLink, LuTriangleAlert, LuWallet } from "react-icons/lu";
import { EmptyState, Overline, Pill, SurfaceCard } from "@/components/ui";
import { dayToken } from "@/components/ui/day";
import { Bar, IconTile, Initials, SectionTitle, TabSplit } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { useBudgetQuery, useRemoveExpense } from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";
import { EXPENSE_CATEGORIES, type Expense } from "@/modules/trips/types/trip-extras.types";
import { addDays, formatShortDate } from "@/modules/trips/utils/stay.utils";
import { formatMoney } from "@/modules/trips/utils/money";
import { CATEGORY_LABELS } from "./budgetMeta";
import { ExpenseFormModal } from "./ExpenseFormModal";
import { useTripLinksQuery } from "@/modules/suite/hooks/useTripLinks";
import type { SpendlogSummary } from "@/modules/suite/types/suite.types";
import { formatMinor } from "@/modules/suite/utils/promo-dismissal";

interface BudgetViewProps {
  trip: Trip;
  currentUserId: string;
  onOpenSettings: () => void;
  /** Opens the Connected apps tab. */
  onOpenApps?: () => void;
}

function Card({ children, ...rest }: { children: ReactNode } & ComponentProps<typeof SurfaceCard>) {
  return (
    <SurfaceCard p="18px" {...rest}>
      <Stack spacing="10px">{children}</Stack>
    </SurfaceCard>
  );
}

/**
 * What SpendLog says was actually spent, next to Trippin's planned budget. Trippin's own expenses
 * stay the plan; SpendLog owns the trip's real money once it's linked.
 */
function ActualSpendCard({ trip, budget, currency, onOpenApps }: { trip: Trip; budget?: number; currency: string; onOpenApps?: () => void }) {
  const linked = Boolean(trip.links?.spendlog?.enabled);
  const { data, isLoading } = useTripLinksQuery(trip.id, { enabled: linked });
  if (!linked) return null;
  const app = data?.apps.spendlog;
  const summary = app?.summary as SpendlogSummary | null | undefined;
  const url = app?.url ?? summary?.url ?? null;
  const actual = summary ? summary.totalSpentMinor / 100 : null;
  const comparable = actual !== null && budget !== undefined && summary?.currency === currency;

  return (
    <Card>
      <Flex justify="space-between" align="flex-start" gap={3} flexWrap="wrap">
        <Box>
          <Overline>Actual spend (SpendLog)</Overline>
          {isLoading ? (
            <Text color="fg.muted" fontSize="13px">
              Loading…
            </Text>
          ) : summary ? (
            <Text fontFamily="heading" fontWeight={600} fontSize="28px" lineHeight={1.15}>
              {formatMinor(summary.totalSpentMinor, summary.currency)}{" "}
              {comparable && (
                <Text as="span" fontFamily="body" fontSize="12px" fontWeight={400} color="fg.muted">
                  of {formatMoney(budget!, currency)} planned
                </Text>
              )}
            </Text>
          ) : (
            <Flex align="center" gap={2} fontSize="13px" color="fg.muted" mt={1}>
              {app?.summaryError || app?.status === "error" ? <LuTriangleAlert /> : null}
              <Text>
                {app?.status === "error"
                  ? "Not linked yet — see Connected apps."
                  : app?.summaryError
                    ? `${app.summaryError}.`
                    : app?.status === "pending"
                      ? "Setting up the SpendLog trip…"
                      : "Nothing logged in SpendLog yet."}
              </Text>
            </Flex>
          )}
        </Box>
        {url ? (
          <Button as="a" href={url} target="_blank" rel="noopener noreferrer" size="sm" variant="outline" rightIcon={<LuExternalLink size={14} />}>
            Open in SpendLog
          </Button>
        ) : (
          onOpenApps && (
            <Button size="sm" variant="ghost" onClick={onOpenApps}>
              Connected apps
            </Button>
          )
        )}
      </Flex>
      {comparable && (
        <>
          <Bar value={Math.min((actual! / budget!) * 100, 100)} color={actual! > budget! ? "danger" : actual! / budget! > 0.9 ? "warn" : "success"} aria-label="Planned budget used (SpendLog)" />
          <Text fontSize="12px" color="fg.muted">
            {actual! > budget! ? `${formatMoney(actual! - budget!, currency)} over the plan` : `${formatMoney(budget! - actual!, currency)} left of the plan`}
          </Text>
        </>
      )}
      {summary && (
        <Flex gap={4} fontSize="12px" color="fg.muted" flexWrap="wrap">
          <Text>
            Your share <b>{formatMinor(summary.myShareMinor, summary.currency)}</b>
          </Text>
          {summary.iOweMinor > 0 && (
            <Text>
              You owe <b>{formatMinor(summary.iOweMinor, summary.currency)}</b>
            </Text>
          )}
          {summary.owedToMeMinor > 0 && (
            <Text>
              Owed to you <b>{formatMinor(summary.owedToMeMinor, summary.currency)}</b>
            </Text>
          )}
          <Text>
            {summary.transactionCount} transaction{summary.transactionCount === 1 ? "" : "s"}
          </Text>
        </Flex>
      )}
    </Card>
  );
}

export function BudgetView({ trip, currentUserId, onOpenSettings, onOpenApps }: BudgetViewProps) {
  const toast = useToast();
  const { data, isLoading } = useBudgetQuery(trip.id);
  const remove = useRemoveExpense(trip.id);
  const [editing, setEditing] = useState<Partial<Expense> | null>(null);

  if (isLoading || !data) return <LoadingState />;

  const money = (n: number) => formatMoney(n, data.currency);
  const nameOf = (id: string) => data.members.find((m) => m.id === id)?.name ?? "Someone";
  const memberIndex = (id: string) => Math.max(data.members.findIndex((m) => m.id === id), 0);
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
  const usedPct = budget ? Math.min((data.spent.total / budget) * 100, 100) : 0;
  const maxCategory = Math.max(...EXPENSE_CATEGORIES.map((c) => spent[c]), 1);
  const hasForeign = data.expenses.some((e) => e.currency !== data.currency);

  // Per-day spend across the trip's dates.
  const tripStart = trip.startDate.slice(0, 10);
  const tripEnd = trip.endDate.slice(0, 10);
  const days: string[] = [];
  for (let d = tripStart; d <= tripEnd && days.length < 60; d = addDays(d, 1)) days.push(d);
  const byDay = new Map<string, number>();
  for (const e of data.expenses) byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.amountInTripCurrency);
  const maxDay = Math.max(...days.map((d) => byDay.get(d) ?? 0), 1);
  const outside = data.expenses.filter((e) => e.date < tripStart || e.date > tripEnd).reduce((s, e) => s + e.amountInTripCurrency, 0);

  const handleRemove = async (expense: Expense) => {
    try {
      await remove.mutateAsync(expense.id);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const main = (
    <Stack spacing="14px">
      <Card>
        <Flex justify="space-between" align="flex-start" gap={3} flexWrap="wrap">
          <Box>
            <Overline>Spent</Overline>
            <Text fontFamily="heading" fontWeight={600} fontSize="34px" lineHeight={1.15}>
              {money(data.spent.total)}{" "}
              {budget !== undefined && (
                <Text as="span" fontFamily="body" fontSize="12px" fontWeight={400} color="fg.muted">
                  of {money(budget)}
                </Text>
              )}
            </Text>
          </Box>
          <Box textAlign="right">
            <Text fontSize="12px" color="fg.muted">
              Currency
            </Text>
            <Text fontWeight={600}>{data.currency}</Text>
          </Box>
        </Flex>
        {budget !== undefined ? (
          <>
            <Bar value={usedPct} color={data.spent.total > budget ? "danger" : usedPct > 90 ? "warn" : "accent"} aria-label="Budget used" />
            <Text fontSize="12px" color="fg.muted">
              {data.spent.total > budget ? `${money(data.spent.total - budget)} over budget` : `${money(budget - data.spent.total)} left`}
              {hasForeign ? " · foreign amounts auto-converted" : ""}
            </Text>
          </>
        ) : (
          <Flex align="center" gap={2} fontSize="12px" color="fg.muted" flexWrap="wrap">
            <Text>No budget set.</Text>
            <Button size="xs" variant="link" onClick={onOpenSettings}>
              Set a budget
            </Button>
          </Flex>
        )}
        <Divider />
        <Flex justify="space-between" gap={3} fontSize="12px" flexWrap="wrap">
          <Tooltip label={`Stays ${money(data.planned.stays)} · Bookings ${money(data.planned.bookings)} · Tickets ${money(data.planned.activities)}`} hasArrow>
            <Text tabIndex={0}>
              <Text as="span" color="fg.muted">
                Booked &amp; planned
              </Text>{" "}
              <b>{money(data.planned.total)}</b>
            </Text>
          </Tooltip>
          <Text color={budget !== undefined && forecast > budget ? "danger" : undefined}>
            <Text as="span" color={budget !== undefined && forecast > budget ? "danger" : "fg.muted"}>
              Projected
            </Text>{" "}
            <b>{money(forecast)}</b>
            {budget !== undefined && forecast > budget ? " — over budget" : ""}
          </Text>
        </Flex>
        {(data.planned.nightsWithoutPrice > 0 || data.planned.unconverted > 0) && (
          <Text fontSize="12px" color="fg.muted">
            {data.planned.nightsWithoutPrice > 0 &&
              `${data.planned.nightsWithoutPrice} night${data.planned.nightsWithoutPrice === 1 ? " has" : "s have"} no stay price yet. `}
            {data.planned.unconverted > 0 && `${data.planned.unconverted} item(s) couldn't be converted and are left out.`}
          </Text>
        )}
      </Card>

      <ActualSpendCard trip={trip} budget={budget} currency={data.currency} onOpenApps={onOpenApps} />

      <Card>
        <Overline>By category</Overline>
        {EXPENSE_CATEGORIES.map((c) => (
          <Flex key={c} align="center" gap="10px">
            <Icon as={CATEGORY_LABELS[c].icon} boxSize="16px" color="fg.muted" w="20px" flexShrink={0} />
            <Text w="90px" flexShrink={0} title={CATEGORY_LABELS[c].label}>
              {CATEGORY_LABELS[c].short}
            </Text>
            <Bar flex={1} value={(spent[c] / maxCategory) * 100} aria-label={`${CATEGORY_LABELS[c].label} share`} />
            <Text fontWeight={600} w="90px" textAlign="right" flexShrink={0}>
              {money(spent[c])}
            </Text>
          </Flex>
        ))}
      </Card>

      {days.length > 0 && (
        <Card>
          <Overline>By day</Overline>
          <Flex align="flex-end" gap={days.length > 14 ? "3px" : 2} h="110px" role="list" aria-label="Spending per day">
            {days.map((d, i) => {
              const amount = byDay.get(d) ?? 0;
              return (
                <Tooltip key={d} label={`Day ${i + 1} · ${formatShortDate(d)} · ${money(amount)}`} hasArrow>
                  <Flex role="listitem" aria-label={`Day ${i + 1}: ${money(amount)}`} tabIndex={0} direction="column" align="center" justify="flex-end" gap="6px" flex="1 1 0" minW={0} h="100%">
                    <Box w="100%" h={`${Math.round((amount / maxDay) * 84)}px`} minH={amount > 0 ? "3px" : 0} bg={dayToken(i + 1)} borderRadius="6px 6px 2px 2px" />
                    <Text fontSize="12px" color="fg.muted" letterSpacing="0.02em" noOfLines={1}>
                      {days.length > 14 && (i + 1) % 2 === 0 ? "" : `D${i + 1}`}
                    </Text>
                  </Flex>
                </Tooltip>
              );
            })}
          </Flex>
          {outside > 0 && (
            <Text fontSize="12px" color="fg.muted">
              {money(outside)} logged outside the trip dates.
            </Text>
          )}
        </Card>
      )}
    </Stack>
  );

  const aside = (
    <Stack spacing={4}>
      <SectionTitle
        aside={
          <Button leftIcon={<FiPlus size={16} />} onClick={() => setEditing({})}>
            Add expense
          </Button>
        }
      >
        Expenses
      </SectionTitle>

      {data.expenses.length === 0 ? (
        <SurfaceCard>
          <EmptyState icon={LuWallet} title="Nothing logged yet" text="Add expenses as you go — splitting between travellers is automatic." compact />
        </SurfaceCard>
      ) : (
        <Box>
          {data.expenses.map((e, i) => (
            <Flex key={e.id} align="center" gap={3} py="10px" borderTopWidth={i > 0 ? "1px" : 0} borderColor="border.line">
              <IconTile icon={CATEGORY_LABELS[e.category].icon} />
              <Flex direction="column" flex={1} minW={0}>
                <Text fontWeight={600} noOfLines={1}>
                  {e.description}
                </Text>
                <Text fontSize="12px" color="fg.muted" noOfLines={1}>
                  {formatShortDate(e.date)}
                  {data.members.length > 1 &&
                    ` · paid by ${nameOf(e.paidBy)} · ${e.splitWith.length === 1 ? `Just ${nameOf(e.splitWith[0])}` : `Split ${e.splitWith.length}`}`}
                </Text>
              </Flex>
              <Flex direction="column" textAlign="right" flexShrink={0}>
                <Text fontWeight={600}>{money(e.amountInTripCurrency)}</Text>
                {e.currency !== data.currency && (
                  <Text fontSize="12px" color="fg.muted" letterSpacing="0.02em">
                    ≈ {formatMoney(e.amount, e.currency)}
                  </Text>
                )}
              </Flex>
              <Menu isLazy placement="bottom-end">
                <MenuButton as={IconButton} aria-label={`Actions for ${e.description}`} icon={<FiMoreHorizontal size={18} />} variant="ghost" size="sm" flexShrink={0} />
                <MenuList zIndex={20}>
                  <MenuItem icon={<FiEdit2 />} onClick={() => setEditing(e)}>
                    Edit
                  </MenuItem>
                  <MenuItem icon={<FiTrash2 />} color="danger" onClick={() => void handleRemove(e)}>
                    Delete
                  </MenuItem>
                </MenuList>
              </Menu>
            </Flex>
          ))}
        </Box>
      )}

      {data.members.length > 1 && (
        <SurfaceCard p={4}>
          <Stack spacing="10px">
            <Overline>Balances</Overline>
            {data.members.map((m, i) => (
              <Flex key={m.id} align="center" gap="10px">
                <Initials name={m.name} index={i} />
                <Text fontWeight={600} flex={1} minW={0} noOfLines={1}>
                  {m.id === currentUserId ? `${m.name} (you)` : m.name}
                </Text>
                {m.balance > 0 ? (
                  <Pill tone="success">is owed {money(m.balance)}</Pill>
                ) : m.balance < 0 ? (
                  <Pill tone="warn">owes {money(Math.abs(m.balance))}</Pill>
                ) : (
                  <Pill>settled</Pill>
                )}
              </Flex>
            ))}
            <Divider />
            <Overline>Settle up</Overline>
            {data.settlements.length > 0 ? (
              data.settlements.map((s, i) => (
                <Flex key={i} align="center" gap="10px">
                  <Initials name={nameOf(s.from)} index={memberIndex(s.from)} size={24} />
                  <Icon as={FiArrowRight} color="fg.muted" />
                  <Text flex={1}>
                    <b>{nameOf(s.from)}</b> pays <b>{nameOf(s.to)}</b> {money(s.amount)}
                  </Text>
                </Flex>
              ))
            ) : (
              <Text fontSize="13px" color="fg.muted">
                Everyone&rsquo;s square.
              </Text>
            )}
          </Stack>
        </SurfaceCard>
      )}
    </Stack>
  );

  return (
    <>
      <TabSplit main={main} aside={aside} mainWidth={620} stickyAside={false} />
      <ExpenseFormModal trip={trip} members={data.members} currentUserId={currentUserId} initial={editing} onClose={() => setEditing(null)} />
    </>
  );
}
