import { connectDB } from "@/lib/mongodb";
import { User, type IUserDocument } from "@/models/User";
import type { UserPreferences } from "@/types";

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  preferences?: UserPreferences;
}

export interface UpdateApiKeysInput {
  openaiApiKeyEncrypted?: string;
  googleMapsApiKeyEncrypted?: string;
  geminiApiKeyEncrypted?: string;
  openaiApiKeyLast4?: string;
  googleMapsApiKeyLast4?: string;
  geminiApiKeyLast4?: string;
}

export interface UpdateAiSettingsInput {
  aiProvider?: IUserDocument["aiProvider"];
  openaiModel?: string;
  geminiModel?: string;
}

export class UserRepository {
  static async findByEmail(email: string): Promise<IUserDocument | null> {
    await connectDB();
    return User.findOne({ email: email.toLowerCase() });
  }

  static async findById(id: string): Promise<IUserDocument | null> {
    await connectDB();
    return User.findById(id);
  }

  static async create(data: CreateUserInput): Promise<IUserDocument> {
    await connectDB();
    return User.create(data);
  }

  static async updateProfile(
    id: string,
    data: Partial<Pick<IUserDocument, "name" | "avatar" | "preferences">>,
  ): Promise<IUserDocument | null> {
    await connectDB();
    return User.findByIdAndUpdate(id, data, { new: true });
  }

  static async updateApiKeys(
    id: string,
    data: UpdateApiKeysInput,
  ): Promise<IUserDocument | null> {
    await connectDB();
    const update = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    return User.findByIdAndUpdate(id, update, { new: true });
  }

  static async updateAiSettings(id: string, data: UpdateAiSettingsInput): Promise<IUserDocument | null> {
    await connectDB();
    const update = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    return User.findByIdAndUpdate(id, update, { new: true });
  }

  static async clearGeminiKey(id: string): Promise<IUserDocument | null> {
    await connectDB();
    return User.findByIdAndUpdate(
      id,
      { $unset: { geminiApiKeyEncrypted: "", geminiApiKeyLast4: "" } },
      { new: true },
    );
  }

  static async clearOpenAiKey(id: string): Promise<IUserDocument | null> {
    await connectDB();
    return User.findByIdAndUpdate(
      id,
      // $unset, not `field: undefined` — Mongoose drops undefined values, making that a no-op.
      { $unset: { openaiApiKeyEncrypted: "", openaiApiKeyLast4: "" } },
      { new: true },
    );
  }

  static async clearGoogleMapsKey(id: string): Promise<IUserDocument | null> {
    await connectDB();
    return User.findByIdAndUpdate(
      id,
      { $unset: { googleMapsApiKeyEncrypted: "", googleMapsApiKeyLast4: "" } },
      { new: true },
    );
  }

  static async setPasswordResetToken(
    email: string,
    tokenHash: string,
    expires: Date,
  ): Promise<IUserDocument | null> {
    await connectDB();
    return User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { resetPasswordToken: tokenHash, resetPasswordExpires: expires },
      { new: true },
    );
  }

  static async findByResetToken(tokenHash: string): Promise<IUserDocument | null> {
    await connectDB();
    return User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });
  }

  static async updatePassword(
    id: string,
    passwordHash: string,
  ): Promise<IUserDocument | null> {
    await connectDB();
    return User.findByIdAndUpdate(
      id,
      // The reset token must stop working once used.
      { $set: { passwordHash }, $unset: { resetPasswordToken: "", resetPasswordExpires: "" } },
      { new: true },
    );
  }
}
