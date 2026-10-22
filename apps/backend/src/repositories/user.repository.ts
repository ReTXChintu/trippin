import { connectDB } from "@/lib/mongodb";
import { User, type IUserDocument } from "@/models/User";
import type { UserPreferences } from "@/types";

export interface CreateUserInput {
  name: string;
  email: string;
  oidcSub?: string;
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

  static async findByOidcSub(sub: string): Promise<IUserDocument | null> {
    await connectDB();
    return User.findOne({ oidcSub: sub });
  }

  /** Ties an existing account to its identity-server subject; fills the avatar if it has none. */
  static async linkOidcSub(id: string, sub: string, picture?: string): Promise<IUserDocument | null> {
    await connectDB();
    const user = await User.findById(id);
    if (!user) return null;
    user.oidcSub = sub;
    if (!user.avatar && picture) user.avatar = picture;
    return user.save();
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
    return User.findByIdAndUpdate(id, data, { returnDocument: "after" });
  }

  static async updateApiKeys(
    id: string,
    data: UpdateApiKeysInput,
  ): Promise<IUserDocument | null> {
    await connectDB();
    const update = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    return User.findByIdAndUpdate(id, update, { returnDocument: "after" });
  }

  static async updateAiSettings(id: string, data: UpdateAiSettingsInput): Promise<IUserDocument | null> {
    await connectDB();
    const update = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    return User.findByIdAndUpdate(id, update, { returnDocument: "after" });
  }

  static async clearGeminiKey(id: string): Promise<IUserDocument | null> {
    await connectDB();
    return User.findByIdAndUpdate(
      id,
      { $unset: { geminiApiKeyEncrypted: "", geminiApiKeyLast4: "" } },
      { returnDocument: "after" },
    );
  }

  static async clearOpenAiKey(id: string): Promise<IUserDocument | null> {
    await connectDB();
    return User.findByIdAndUpdate(
      id,
      // $unset, not `field: undefined` — Mongoose drops undefined values, making that a no-op.
      { $unset: { openaiApiKeyEncrypted: "", openaiApiKeyLast4: "" } },
      { returnDocument: "after" },
    );
  }

  static async clearGoogleMapsKey(id: string): Promise<IUserDocument | null> {
    await connectDB();
    return User.findByIdAndUpdate(
      id,
      { $unset: { googleMapsApiKeyEncrypted: "", googleMapsApiKeyLast4: "" } },
      { returnDocument: "after" },
    );
  }
}
