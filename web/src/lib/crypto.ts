import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Encrypts free-text Psy TCC fields at rest (AES-256-GCM) so a raw Turso
// dump/leak doesn't expose journal content in plaintext. Key never touches
// the DB — it lives only in PSY_ENCRYPTION_KEY (env), generated once with
// `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.PSY_ENCRYPTION_KEY;
  if (!hex) throw new Error("PSY_ENCRYPTION_KEY is not set");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) throw new Error("PSY_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  return key;
}

export function encryptText(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

// Rows written before this migration (or rows where a field happens not to
// parse as iv:tag:ciphertext) are returned as-is rather than throwing, so a
// partially-migrated DB never crashes the page.
export function decryptText(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined) return null;
  const parts = stored.split(":");
  if (parts.length !== 3) return stored;
  const [ivB64, tagB64, dataB64] = parts;
  try {
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]);
    return plain.toString("utf8");
  } catch {
    return stored;
  }
}
