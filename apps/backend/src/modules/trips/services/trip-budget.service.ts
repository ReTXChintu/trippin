import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { EXPENSE_CATEGORIES, Expense, type ExpenseCategory, type IExpenseDocument } from "@/models/Expense";
import { TripRepository } from "@/repositories/trip.repository";
import { ItineraryRepository } from "@/repositories/itinerary.repository";
import { getTripMembers } from "@/modules/trips/services/trip-members.service";
import { convertAmount } from "@/services/exchange-rate.service";
import { getEffectiveLegs } from "@/modules/trips/utils/trip-leg.utils";
import { getEffectiveStays, getUncoveredNights } from "@/modules/trips/utils/stay.utils";
import type { Trip } from "@/modules/trips/types/trip.types";

type Result<T> = { success: true; data: T; message?: string } | { success: false; error: string };

export interface ExpenseDTO {
  id: string;
  paidBy: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  amountInTripCurrency: number;
  date: string;
  splitWith: string[];
  createdBy: string;
  createdAt: string;
}

function toDTO(doc: IExpenseDocument): ExpenseDTO {
  return {
    id: String(doc._id),
    paidBy: String(doc.paidBy),
    description: doc.description,
    category: doc.category,
    amount: doc.amount,
    currency: doc.currency,
    amountInTripCurrency: doc.amountInTripCurrency,
    date: doc.date,
    splitWith: doc.splitWith.map(String),
    createdBy: String(doc.createdBy),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}

const expenseInputSchema = z.object({
  description: z.string().trim().min(1, "What was it for?").max(120),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().positive("Amount must be more than 0").max(100_000_000),
  currency: z.string().regex(/^[A-Za-z]{3}$/, "Currency must be a 3-letter code").transform((c) => c.toUpperCase()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paidBy: z.string().min(1),
  splitWith: z.array(z.string().min(1)).min(1, "Split with at least one person"),
});

async function memberIds(trip: Trip): Promise<Set<string>> {
  return new Set([trip.userId, ...trip.memberIds]);
}

async function buildExpense(trip: Trip, raw: unknown): Promise<Result<Omit<ExpenseDTO, "id" | "createdBy" | "createdAt"> & { rate: number }>> {
  const parsed = expenseInputSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid expense" };

  const members = await memberIds(trip);
  if (!members.has(parsed.data.paidBy)) return { success: false, error: "Whoever paid must be on the trip" };
  if (parsed.data.splitWith.some((id) => !members.has(id))) return { success: false, error: "Split only with people on the trip" };

  const converted = await convertAmount(parsed.data.amount, parsed.data.currency, trip.currency);
  if (!converted) {
    return {
      success: false,
      error: `Couldn't get today's ${parsed.data.currency}→${trip.currency} rate. Enter the amount in ${trip.currency} instead.`,
    };
  }

  return {
    success: true,
    data: { ...parsed.data, splitWith: [...new Set(parsed.data.splitWith)], amountInTripCurrency: converted.value, rate: converted.rate },
  };
}

const oid = (id: string) => new mongoose.Types.ObjectId(id);

export async function addExpense(userId: string, tripId: string, raw: unknown): Promise<Result<{ expense: ExpenseDTO }>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };
  const built = await buildExpense(trip, raw);
  if (!built.success) return built;

  await connectDB();
  const doc = await Expense.create({
    ...built.data,
    tripId: oid(tripId),
    createdBy: oid(userId),
    paidBy: oid(built.data.paidBy),
    splitWith: built.data.splitWith.map(oid),
  });
  return { success: true, data: { expense: toDTO(doc) }, message: "Expense added" };
}

export async function updateExpense(userId: string, tripId: string, expenseId: string, raw: unknown): Promise<Result<{ expense: ExpenseDTO }>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };
  if (!mongoose.isValidObjectId(expenseId)) return { success: false, error: "Expense not found" };
  const built = await buildExpense(trip, raw);
  if (!built.success) return built;

  await connectDB();
  const doc = await Expense.findOneAndUpdate(
    { _id: oid(expenseId), tripId: oid(tripId) },
    { ...built.data, paidBy: oid(built.data.paidBy), splitWith: built.data.splitWith.map(oid) },
    { returnDocument: "after" },
  );
  if (!doc) return { success: false, error: "Expense not found" };
  return { success: true, data: { expense: toDTO(doc) }, message: "Expense updated" };
}

export async function removeExpense(userId: string, tripId: string, expenseId: string): Promise<Result<{ id: string }>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };
  if (!mongoose.isValidObjectId(expenseId)) return { success: false, error: "Expense not found" };
  await connectDB();
  const res = await Expense.deleteOne({ _id: oid(expenseId), tripId: oid(tripId) });
  if (res.deletedCount === 0) return { success: false, error: "Expense not found" };
  return { success: true, data: { id: expenseId }, message: "Expense removed" };
}

export interface PlannedCosts {
  stays: number;
  bookings: number;
  activities: number;
  total: number;
  /** Items whose currency couldn't be converted and were left out. */
  unconverted: number;
  nightsWithoutPrice: number;
}

export interface BudgetSummary {
  currency: string;
  budgetAmount?: number;
  planned: PlannedCosts;
  spent: { total: number; byCategory: Record<ExpenseCategory, number> };
  members: { id: string; name: string; paid: number; share: number; balance: number }[];
  /** Minimal set of payments that settles everyone up. */
  settlements: { from: string; to: string; amount: number }[];
  expenses: ExpenseDTO[];
}

const round = (n: number) => Math.round(n * 100) / 100;

async function plannedCosts(trip: Trip): Promise<PlannedCosts> {
  let unconverted = 0;
  const inTripCurrency = async (amount: number, currency?: string) => {
    if (!currency || currency === trip.currency) return amount;
    const converted = await convertAmount(amount, currency, trip.currency);
    if (!converted) {
      unconverted++;
      return 0;
    }
    return converted.value;
  };

  let stays = 0;
  let nightsWithoutPrice = 0;
  for (const leg of getEffectiveLegs(trip)) {
    for (const stay of getEffectiveStays(leg)) {
      const nights = Math.max(Math.round((Date.parse(stay.checkOutDate) - Date.parse(stay.checkInDate)) / 86_400_000), 0);
      if (stay.pricePerNight === undefined) nightsWithoutPrice += nights;
      else stays += await inTripCurrency(stay.pricePerNight * nights, stay.currency);
    }
    nightsWithoutPrice += getUncoveredNights(leg).length;
  }

  let bookings = 0;
  for (const booking of trip.bookings) {
    if (booking.cost !== undefined) bookings += await inTripCurrency(booking.cost, booking.currency);
  }

  const itinerary = await ItineraryRepository.findByTripId(trip.id);
  const activities = (itinerary?.days ?? []).reduce(
    (sum, day) => sum + day.stops.reduce((s, stop) => s + (stop.cost ?? 0), 0),
    0,
  );

  return {
    stays: round(stays),
    bookings: round(bookings),
    activities: round(activities),
    total: round(stays + bookings + activities),
    unconverted,
    nightsWithoutPrice,
  };
}

/** Greedy settle-up: largest debtor pays largest creditor until everyone is square. */
function settle(balances: { id: string; balance: number }[]): { from: string; to: string; amount: number }[] {
  const debtors = balances.filter((b) => b.balance < -0.005).map((b) => ({ ...b })).sort((a, b) => a.balance - b.balance);
  const creditors = balances.filter((b) => b.balance > 0.005).map((b) => ({ ...b })).sort((a, b) => b.balance - a.balance);
  const payments: { from: string; to: string; amount: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i].balance, creditors[j].balance);
    payments.push({ from: debtors[i].id, to: creditors[j].id, amount: round(amount) });
    debtors[i].balance += amount;
    creditors[j].balance -= amount;
    if (debtors[i].balance > -0.005) i++;
    if (creditors[j].balance < 0.005) j++;
  }
  return payments;
}

export async function getBudgetSummary(userId: string, tripId: string): Promise<Result<BudgetSummary>> {
  const trip = await TripRepository.findByIdForUser(tripId, userId);
  if (!trip) return { success: false, error: "Trip not found" };

  await connectDB();
  const docs = await Expense.find({ tripId: oid(tripId) }).sort({ date: -1, createdAt: -1 });
  const expenses = docs.map(toDTO);

  const byCategory = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, 0])) as Record<ExpenseCategory, number>;
  for (const e of expenses) byCategory[e.category] = round(byCategory[e.category] + e.amountInTripCurrency);

  const membersResult = await getTripMembers(tripId, userId);
  const people = membersResult.success ? (membersResult.data?.members ?? []) : [];
  const ledger = new Map(people.map((p) => [p.id, { id: p.id, name: p.name, paid: 0, share: 0, balance: 0 }]));
  for (const e of expenses) {
    const payer = ledger.get(e.paidBy);
    if (payer) payer.paid += e.amountInTripCurrency;
    const each = e.amountInTripCurrency / e.splitWith.length;
    for (const id of e.splitWith) {
      const member = ledger.get(id);
      if (member) member.share += each;
    }
  }
  const members = [...ledger.values()].map((m) => ({ ...m, paid: round(m.paid), share: round(m.share), balance: round(m.paid - m.share) }));

  return {
    success: true,
    data: {
      currency: trip.currency,
      budgetAmount: trip.budgetAmount,
      planned: await plannedCosts(trip),
      spent: { total: round(expenses.reduce((s, e) => s + e.amountInTripCurrency, 0)), byCategory },
      members,
      settlements: settle(members),
      expenses,
    },
  };
}

export async function deleteExpensesForTrip(tripId: string): Promise<void> {
  if (!mongoose.isValidObjectId(tripId)) return;
  await connectDB();
  await Expense.deleteMany({ tripId: oid(tripId) });
}
