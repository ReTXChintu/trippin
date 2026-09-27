import mongoose, { Schema, type Document, type Model } from "mongoose";

export const EXPENSE_CATEGORIES = ["stay", "transport", "food", "activities", "shopping", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface IExpenseDocument extends Document {
  tripId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  /** Who paid (a trip member's user id). */
  paidBy: mongoose.Types.ObjectId;
  description: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  /** `amount` converted to the trip currency at the rate on the day it was entered. */
  amountInTripCurrency: number;
  rate: number;
  /** YYYY-MM-DD */
  date: string;
  /** Members sharing this cost equally (always includes at least one). */
  splitWith: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpenseDocument>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true },
    amountInTripCurrency: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true },
    date: { type: String, required: true },
    splitWith: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: true },
);

export const Expense: Model<IExpenseDocument> =
  mongoose.models.Expense ?? mongoose.model<IExpenseDocument>("Expense", ExpenseSchema);
