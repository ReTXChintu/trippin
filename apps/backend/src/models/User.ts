import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { UserPreferences } from "@/types";
import { AI_PROVIDERS, type AiProviderName } from "@/constants/ai";

export interface IUserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  preferences?: UserPreferences;
  openaiApiKeyEncrypted?: string;
  googleMapsApiKeyEncrypted?: string;
  openaiApiKeyLast4?: string;
  googleMapsApiKeyLast4?: string;
  geminiApiKeyEncrypted?: string;
  geminiApiKeyLast4?: string;
  /** Preferred AI provider; unset = whichever key is configured. */
  aiProvider?: AiProviderName;
  openaiModel?: string;
  geminiModel?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    avatar: { type: String },
    preferences: {
      defaultTravelStyle: String,
      defaultTransportation: String,
      interests: [String],
    },
    openaiApiKeyEncrypted: { type: String },
    googleMapsApiKeyEncrypted: { type: String },
    openaiApiKeyLast4: { type: String },
    googleMapsApiKeyLast4: { type: String },
    geminiApiKeyEncrypted: { type: String },
    geminiApiKeyLast4: { type: String },
    aiProvider: { type: String, enum: AI_PROVIDERS },
    openaiModel: { type: String, trim: true },
    geminiModel: { type: String, trim: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true },
);

export const User: Model<IUserDocument> =
  mongoose.models.User ?? mongoose.model<IUserDocument>("User", UserSchema);
