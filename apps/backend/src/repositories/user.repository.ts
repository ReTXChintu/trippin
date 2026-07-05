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
  openaiApiKeyLast4?: string;
  googleMapsApiKeyLast4?: string;
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
    const update: Record<string, string | undefined> = {};
    if (data.openaiApiKeyEncrypted !== undefined) {
      update.openaiApiKeyEncrypted = data.openaiApiKeyEncrypted;
    }
    if (data.googleMapsApiKeyEncrypted !== undefined) {
      update.googleMapsApiKeyEncrypted = data.googleMapsApiKeyEncrypted;
    }
    if (data.openaiApiKeyLast4 !== undefined) {
      update.openaiApiKeyLast4 = data.openaiApiKeyLast4;
    }
    if (data.googleMapsApiKeyLast4 !== undefined) {
      update.googleMapsApiKeyLast4 = data.googleMapsApiKeyLast4;
    }
    return User.findByIdAndUpdate(id, update, { new: true });
  }

  static async clearOpenAiKey(id: string): Promise<IUserDocument | null> {
    await connectDB();
    return User.findByIdAndUpdate(
      id,
      {
        openaiApiKeyEncrypted: undefined,
        openaiApiKeyLast4: undefined,
      },
      { new: true },
    );
  }

  static async clearGoogleMapsKey(id: string): Promise<IUserDocument | null> {
    await connectDB();
    return User.findByIdAndUpdate(
      id,
      {
        googleMapsApiKeyEncrypted: undefined,
        googleMapsApiKeyLast4: undefined,
      },
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
      {
        passwordHash,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined,
      },
      { new: true },
    );
  }
}
