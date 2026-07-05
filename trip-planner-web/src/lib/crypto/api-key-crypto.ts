import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH);
}

function getEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ENCRYPTION_SECRET is not configured. Set a 32+ character secret in .env",
    );
  }
  return secret;
}

/** Encrypt plaintext API key for storage. Returns base64 blob: salt + iv + tag + ciphertext */
export function encryptApiKey(plaintext: string): string {
  const secret = getEncryptionSecret();
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(secret, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, encrypted]).toString("base64");
}

export function decryptApiKey(ciphertext: string): string {
  const secret = getEncryptionSecret();
  const data = Buffer.from(ciphertext, "base64");
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + 16);
  const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + 16);
  const key = deriveKey(secret, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function maskApiKeyLast4(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 4) return "****";
  return trimmed.slice(-4);
}
