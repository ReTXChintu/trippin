import crypto from "crypto";

export function generatePublicSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = crypto.randomBytes(4).toString("hex");
  return `${base}-${suffix}`;
}

export function parseCommaSeparated(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseStringArrayFromForm(formData: FormData, key: string): string[] {
  const values = formData.getAll(key);
  if (values.length > 0) {
    return values.map(String).filter(Boolean);
  }
  return parseCommaSeparated(formData.get(key) as string | null);
}
