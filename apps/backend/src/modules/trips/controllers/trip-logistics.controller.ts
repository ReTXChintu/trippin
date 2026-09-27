import type { Request, Response } from "express";
import { sendResult } from "@/lib/response";
import { addBooking, removeBooking, updateBooking } from "@/modules/trips/services/trip-bookings.service";
import {
  addChecklistItems,
  getChecklistSuggestions,
  removeChecklistItem,
  updateChecklistItem,
} from "@/modules/trips/services/trip-checklist.service";
import { addExpense, getBudgetSummary, removeExpense, updateExpense } from "@/modules/trips/services/trip-budget.service";
import { getTripWeather } from "@/modules/trips/services/trip-weather.service";

const uid = (req: Request) => req.user!.sub;

export const createBooking = async (req: Request, res: Response) =>
  sendResult(res, await addBooking(uid(req), req.params.id, req.body ?? {}));
export const editBooking = async (req: Request, res: Response) =>
  sendResult(res, await updateBooking(uid(req), req.params.id, req.params.bookingId, req.body ?? {}));
export const deleteBooking = async (req: Request, res: Response) =>
  sendResult(res, await removeBooking(uid(req), req.params.id, req.params.bookingId));

export const createChecklistItems = async (req: Request, res: Response) =>
  sendResult(res, await addChecklistItems(uid(req), req.params.id, req.body ?? {}));
export const editChecklistItem = async (req: Request, res: Response) =>
  sendResult(res, await updateChecklistItem(uid(req), req.params.id, req.params.itemId, req.body ?? {}));
export const deleteChecklistItem = async (req: Request, res: Response) =>
  sendResult(res, await removeChecklistItem(uid(req), req.params.id, req.params.itemId));
export const checklistSuggestions = async (req: Request, res: Response) =>
  sendResult(res, await getChecklistSuggestions(uid(req), req.params.id));

export const budget = async (req: Request, res: Response) => sendResult(res, await getBudgetSummary(uid(req), req.params.id));
export const createExpense = async (req: Request, res: Response) =>
  sendResult(res, await addExpense(uid(req), req.params.id, req.body ?? {}));
export const editExpense = async (req: Request, res: Response) =>
  sendResult(res, await updateExpense(uid(req), req.params.id, req.params.expenseId, req.body ?? {}));
export const deleteExpense = async (req: Request, res: Response) =>
  sendResult(res, await removeExpense(uid(req), req.params.id, req.params.expenseId));

export const weather = async (req: Request, res: Response) => sendResult(res, await getTripWeather(uid(req), req.params.id));
